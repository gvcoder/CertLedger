#!/usr/bin/env bash
#
# createChannel.sh - create 'certchannel' and join every node to it.
#
#   1. configtxgen   : build the channel genesis block from configtx/configtx.yaml
#   2. osnadmin      : ask the orderer to join (channel participation API, no system channel)
#   3. peer channel join : both peers join using the same genesis block
#
# Anchor peers are already encoded in the genesis block (see configtx.yaml).

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

ARTIFACTS="${NETWORK_DIR}/channel-artifacts"
BLOCK="${ARTIFACTS}/${CHANNEL_NAME}.block"
mkdir -p "$ARTIFACTS"

infoln "1/3 Generating genesis block for '${CHANNEL_NAME}' (profile CertLedgerChannel)"
FABRIC_CFG_PATH="${NETWORK_DIR}/configtx" \
  configtxgen -profile CertLedgerChannel -outputBlock "$BLOCK" -channelID "$CHANNEL_NAME" 2>&1 | tail -n 2

infoln "2/3 Joining orderer.certledger.com to '${CHANNEL_NAME}' via osnadmin"
for i in $(seq 1 10); do
  if osnadmin channel join --channelID "$CHANNEL_NAME" --config-block "$BLOCK" \
       -o localhost:7053 --ca-file "$ORDERER_CA" \
       --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY" >/dev/null 2>&1; then
    break
  fi
  # already joined is fine (re-runs)
  if osnadmin channel list -o localhost:7053 --ca-file "$ORDERER_CA" \
       --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY" 2>/dev/null \
       | grep -q "\"name\": \"${CHANNEL_NAME}\""; then
    break
  fi
  [[ $i -eq 10 ]] && fatalln "Orderer failed to join channel (docker logs orderer.certledger.com)"
  sleep 2
done
successln "  ✔ orderer joined"

joinPeer() {
  local org="$1"
  QUIET_USEORG=1 useOrg "$org"
  infoln "3/3 Joining peer0.${org} to '${CHANNEL_NAME}'"
  for i in $(seq 1 10); do
    if peer channel list 2>/dev/null | grep -qx "$CHANNEL_NAME"; then break; fi
    if peer channel join -b "$BLOCK" >/dev/null 2>&1; then break; fi
    [[ $i -eq 10 ]] && fatalln "peer0.${org} failed to join (docker logs peer0.${org}.certledger.com)"
    sleep 2
  done
  successln "  ✔ peer0.${org} joined"
}

joinPeer university
joinPeer platform

successln "Channel '${CHANNEL_NAME}' is ready."
