#!/usr/bin/env bash
#
# deployCC.sh - build + deploy the CertLedger chaincode with the standard
#               Fabric v2 chaincode lifecycle.
#
#   package -> install (both peers) -> approveformyorg (both orgs)
#           -> checkcommitreadiness -> commit -> (first deploy) InitLedger
#
# Usage:
#   deployCC.sh                 # auto: next sequence, version = 1.<seq-1>
#   deployCC.sh -v 1.1 -s 2     # explicit version / sequence (upgrade)
#   deployCC.sh -p "OR('UniversityMSP.peer','PlatformMSP.peer')"   # try another policy
#
# Every lifecycle step prints what it does so you can follow along.

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

REPO_DIR="$(cd "${NETWORK_DIR}/.." && pwd)"
CC_SRC="${REPO_DIR}/chaincode"
CC_POLICY="AND('UniversityMSP.peer','PlatformMSP.peer')"
CC_VERSION=""
CC_SEQUENCE=""

while getopts "v:s:p:" opt; do
  case $opt in
    v) CC_VERSION="$OPTARG" ;;
    s) CC_SEQUENCE="$OPTARG" ;;
    p) CC_POLICY="$OPTARG" ;;
    *) echo "usage: $0 [-v version] [-s sequence] [-p signature-policy]"; exit 1 ;;
  esac
done

QUIET_USEORG=1 useOrg university

# --- work out sequence / version --------------------------------------------
if [[ -z "$CC_SEQUENCE" ]]; then
  current=$(peer lifecycle chaincode querycommitted -C "$CHANNEL_NAME" -n "$CC_NAME" -O json 2>/dev/null | jq -r '.sequence // 0' || echo 0)
  CC_SEQUENCE=$(( ${current:-0} + 1 ))
fi
[[ -z "$CC_VERSION" ]] && CC_VERSION="1.$(( CC_SEQUENCE - 1 ))"
LABEL="${CC_NAME}_${CC_VERSION}"

infoln "Deploying chaincode '${CC_NAME}'  version=${CC_VERSION}  sequence=${CC_SEQUENCE}"
infoln "Endorsement policy: ${CC_POLICY}"

# --- 1. build TypeScript -----------------------------------------------------
infoln "1/6 Compiling TypeScript chaincode"
( cd "$REPO_DIR" && npm run build --workspace=chaincode --silent )

STAGE="${NETWORK_DIR}/channel-artifacts/cc-stage"
rm -rf "$STAGE" && mkdir -p "$STAGE"
cp "${CC_SRC}/package.json" "$STAGE/"
cp -r "${CC_SRC}/dist" "$STAGE/dist"
[[ -d "${CC_SRC}/META-INF" ]] && cp -r "${CC_SRC}/META-INF" "$STAGE/META-INF"

# --- 2. package --------------------------------------------------------------
PKG="${NETWORK_DIR}/channel-artifacts/${LABEL}.tar.gz"
infoln "2/6 Packaging -> $(basename "$PKG")  (label ${LABEL})"
peer lifecycle chaincode package "$PKG" --path "$STAGE" --lang node --label "$LABEL"
PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid "$PKG")
echo "    package id: ${PACKAGE_ID}"

# --- 3. install on both peers -----------------------------------------------
installOn() {
  QUIET_USEORG=1 useOrg "$1"
  if peer lifecycle chaincode queryinstalled -O json 2>/dev/null | jq -e --arg id "$PACKAGE_ID" '.installed_chaincodes[]? | select(.package_id==$id)' >/dev/null; then
    echo "    already installed on peer0.$1"
    return
  fi
  infoln "3/6 Installing on peer0.$1  (the peer builds a Node container - first time takes 1-3 min)"
  peer lifecycle chaincode install "$PKG"
}
installOn university
installOn platform

# --- 4. approve for each org -------------------------------------------------
approveFor() {
  QUIET_USEORG=1 useOrg "$1"
  infoln "4/6 Approving definition for ${CORE_PEER_LOCALMSPID}"
  # shellcheck disable=SC2046
  peer lifecycle chaincode approveformyorg $(ordererArgs) \
    --channelID "$CHANNEL_NAME" --name "$CC_NAME" --version "$CC_VERSION" \
    --package-id "$PACKAGE_ID" --sequence "$CC_SEQUENCE" \
    --signature-policy "$CC_POLICY" 2>&1 | grep -v "^$" | tail -n 1
}
approveFor university
approveFor platform

QUIET_USEORG=1 useOrg university
infoln "    commit readiness:"
peer lifecycle chaincode checkcommitreadiness --channelID "$CHANNEL_NAME" --name "$CC_NAME" \
  --version "$CC_VERSION" --sequence "$CC_SEQUENCE" --signature-policy "$CC_POLICY" -O json \
  | jq -r '.approvals | to_entries[] | "      \(.key): \(.value)"'

# --- 5. commit ---------------------------------------------------------------
infoln "5/6 Committing definition to '${CHANNEL_NAME}' (needs both orgs - LifecycleEndorsement MAJORITY)"
# shellcheck disable=SC2046
peer lifecycle chaincode commit $(ordererArgs) $(bothPeersArgs) \
  --channelID "$CHANNEL_NAME" --name "$CC_NAME" --version "$CC_VERSION" \
  --sequence "$CC_SEQUENCE" --signature-policy "$CC_POLICY" 2>&1 | tail -n 2
peer lifecycle chaincode querycommitted --channelID "$CHANNEL_NAME" --name "$CC_NAME"

# --- 6. init ledger (first deploy only) --------------------------------------
if [[ "$CC_SEQUENCE" == "1" ]]; then
  infoln "6/6 Invoking InitLedger (seed data) - endorsed by BOTH peers"
  # shellcheck disable=SC2046
  peer chaincode invoke $(ordererArgs) $(bothPeersArgs) -C "$CHANNEL_NAME" -n "$CC_NAME" \
    --waitForEvent -c '{"function":"InitLedger","Args":[]}' 2>&1 | tail -n 1
else
  infoln "6/6 Upgrade - skipping InitLedger (state is preserved across upgrades)"
fi

successln "Chaincode ${LABEL} deployed (sequence ${CC_SEQUENCE})."
