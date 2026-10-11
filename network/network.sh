#!/usr/bin/env bash
#
# network.sh - single entry point for the CertLedger Hyperledger Fabric network
#
#   ./network/network.sh up                 start CAs, issue identities, start nodes, create channel
#   ./network/network.sh deploy [opts]      build + deploy chaincode (see scripts/deployCC.sh)
#   ./network/network.sh down               stop containers, KEEP ledger data
#   ./network/network.sh clean              stop + DELETE everything (ledger, crypto, wallets)
#   ./network/network.sh status             containers + channel height
#   ./network/network.sh inspect            channel, chaincode definition, policies, memory use
#   ./network/network.sh logs [target]      follow logs: peer | orderer | chaincode | ca | couch | all
#   ./network/network.sh loglevel <node> <spec>   change Fabric log level at runtime
#        e.g. loglevel peer0.university 'endorser,gossip=debug:info'
#             loglevel orderer debug
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/scripts/env.sh"

COMPOSE_DIR="${NETWORK_DIR}/compose"
compose() {
  docker compose --project-directory "$COMPOSE_DIR" \
    -f "${COMPOSE_DIR}/compose-ca.yaml" \
    -f "${COMPOSE_DIR}/compose-couch.yaml" \
    -f "${COMPOSE_DIR}/compose-net.yaml" "$@"
}

requireBinaries() {
  [[ -x "${NETWORK_DIR}/bin/peer" && -f "${NETWORK_DIR}/config/core.yaml" ]] || \
    fatalln "Fabric binaries not found. Run ./network/scripts/install-prereqs.sh first."
}

chaincodeContainers() { docker ps -a --filter "name=dev-peer0" --format '{{.Names}}'; }

# ---------------------------------------------------------------------------
networkUp() {
  requireBinaries
  if [[ ! -d "${ORGS_DIR}/peerOrganizations" ]]; then
    infoln "== Starting Certificate Authorities"
    mkdir -p "${ORGS_DIR}/fabric-ca/university" "${ORGS_DIR}/fabric-ca/platform" "${ORGS_DIR}/fabric-ca/ordererOrg"
    compose up -d ca_university ca_platform ca_orderer
    infoln "== Issuing identities from the CAs"
    "${NETWORK_DIR}/scripts/registerEnroll.sh"
  else
    infoln "== Identities already exist (organizations/) - reusing them"
  fi

  infoln "== Starting orderer, peers and CouchDB"
  compose up -d
  sleep 3

  QUIET_USEORG=1 useOrg university
  if peer channel list 2>/dev/null | grep -qx "$CHANNEL_NAME"; then
    infoln "== Channel '${CHANNEL_NAME}' already exists - skipping creation"
  else
    infoln "== Creating channel '${CHANNEL_NAME}'"
    "${NETWORK_DIR}/scripts/createChannel.sh"
  fi
  echo
  networkStatus
  echo
  successln "Network is up. Next:  ./network/network.sh deploy"
}

networkDown() {
  infoln "== Stopping network (ledger data is kept in Docker volumes)"
  local cc; cc=$(chaincodeContainers)
  [[ -n "$cc" ]] && docker rm -f $cc >/dev/null
  compose down
  successln "Network stopped. Start again with: ./network/network.sh up"
}

networkClean() {
  warnln "This deletes ALL ledger data, CA databases, crypto material, chaincode images,"
  warnln "and the app's wallet + SQLite data (they would be invalid with new CAs)."
  if [[ "${FORCE:-}" != "1" ]]; then
    read -r -p "Type 'yes' to continue: " ans
    [[ "$ans" == "yes" ]] || { echo "aborted"; exit 1; }
  fi
  local cc; cc=$(chaincodeContainers)
  [[ -n "$cc" ]] && docker rm -f $cc >/dev/null
  compose down -v --remove-orphans
  local imgs; imgs=$(docker images --filter "reference=dev-peer0*" -q)
  [[ -n "$imgs" ]] && docker rmi -f $imgs >/dev/null
  rm -rf "${ORGS_DIR}" "${NETWORK_DIR}/channel-artifacts" "${NETWORK_DIR}/log"
  rm -rf "${NETWORK_DIR}/../server/wallet" "${NETWORK_DIR}/../server/data"
  successln "Clean slate. Start fresh with: ./network/network.sh up"
}

networkStatus() {
  infoln "Containers:"
  docker ps -a --filter "network=certledger_fabric" --format '  {{.Names}}\t{{.Status}}' | sort | column -t -s $'\t' || true
  requireBinaries
  QUIET_USEORG=1 useOrg university
  if out=$(peer channel getinfo -c "$CHANNEL_NAME" 2>/dev/null); then
    infoln "Channel ${CHANNEL_NAME} (seen by peer0.university):"
    echo "$out" | sed 's/^Blockchain info: /  /' | jq . 2>/dev/null || echo "  $out"
  else
    warnln "Channel ${CHANNEL_NAME} not available yet."
  fi
}

networkInspect() {
  requireBinaries
  for org in university platform; do
    QUIET_USEORG=1 useOrg "$org"
    infoln "== peer0.${org}"
    echo "  channels:  $(peer channel list 2>/dev/null | tail -n +2 | tr '\n' ' ')"
    echo "  height:    $(peer channel getinfo -c "$CHANNEL_NAME" 2>/dev/null | sed 's/^Blockchain info: //' | jq -r .height 2>/dev/null || echo '-')"
    echo "  installed: $(peer lifecycle chaincode queryinstalled -O json 2>/dev/null | jq -r '[.installed_chaincodes[]?.label] | join(", ")')"
  done
  QUIET_USEORG=1 useOrg university
  infoln "== Committed chaincode definition"
  peer lifecycle chaincode querycommitted -C "$CHANNEL_NAME" -n "$CC_NAME" -O json 2>/dev/null \
    | jq '{version, sequence, endorsement_plugin, validation_plugin, approvals}' || warnln "  (none committed)"
  infoln "== Memory use"
  docker stats --no-stream --format '  {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' \
    $(docker ps --filter "network=certledger_fabric" -q) 2>/dev/null | sort | column -t -s $'\t'
}

networkLogs() {
  local target="${1:-all}" pattern
  case "$target" in
    peer|peers)     pattern='^peer0\.' ;;
    orderer)        pattern='^orderer\.' ;;
    chaincode|cc)   pattern='^dev-peer0' ;;
    ca)             pattern='^ca_' ;;
    couch|couchdb)  pattern='^couchdb\.' ;;
    all)            pattern='^(peer0\.|orderer\.|dev-peer0)' ;;
    *)              pattern="$target" ;;
  esac
  local names; names=$(docker ps --format '{{.Names}}' | grep -E "$pattern" || true)
  [[ -z "$names" ]] && fatalln "No running containers match '$target'"
  local colors=(31 32 33 34 35 36 91 92 93 94) i=0
  trap 'kill 0' INT TERM
  for n in $names; do
    local label="$n"
    [[ "$n" == dev-peer0* ]] && label="chaincode@$(echo "$n" | sed -E 's/^dev-(peer0\.[a-z]+).*/\1/')"
    local c=${colors[$(( i % ${#colors[@]} ))]}
    docker logs -f --tail 20 "$n" 2>&1 | sed -u "s/^/$(printf '\033[%sm' "$c")[${label}]$(printf '\033[0m') /" &
    i=$((i+1))
  done
  infoln "Following logs for: $(echo $names | tr '\n' ' ')  (Ctrl+C to stop)"
  wait
}

networkLoglevel() {
  local node="${1:-}" spec="${2:-}"
  [[ -z "$node" || -z "$spec" ]] && fatalln "usage: network.sh loglevel <peer0.university|peer0.platform|orderer> <spec>"
  local port
  case "$node" in
    peer0.university*) port=9444 ;;
    peer0.platform*)   port=9445 ;;
    orderer*)          port=9443 ;;
    *) fatalln "unknown node '$node'" ;;
  esac
  echo "  current: $(curl -s "http://localhost:${port}/logspec")"
  curl -s -X PUT -d "{\"spec\":\"${spec}\"}" "http://localhost:${port}/logspec" >/dev/null
  successln "  new:     $(curl -s "http://localhost:${port}/logspec")"
}

# ---------------------------------------------------------------------------
cmd="${1:-help}"; shift || true
case "$cmd" in
  up)        networkUp ;;
  down)      networkDown ;;
  clean)     networkClean ;;
  restart)   networkDown; networkUp ;;
  deploy)    requireBinaries; "${NETWORK_DIR}/scripts/deployCC.sh" "$@" ;;
  status)    networkStatus ;;
  inspect)   networkInspect ;;
  logs)      networkLogs "$@" ;;
  loglevel)  networkLoglevel "$@" ;;
  *)         sed -n '3,15p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
