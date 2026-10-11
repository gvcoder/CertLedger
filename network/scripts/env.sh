#!/usr/bin/env bash
#
# env.sh - shared variables + helpers for the CertLedger network scripts.
#
# You can also `source` it in your own shell to drive the `peer` CLI by hand:
#
#   source network/scripts/env.sh
#   useOrg university          # act as University admin against peer0.university
#   peer channel getinfo -c certchannel
#   useOrg platform            # switch to Platform admin
#
# (Safe to source multiple times.)

# Resolve network/ directory regardless of where we are sourced from
_ENV_SRC="${BASH_SOURCE[0]:-$0}"
NETWORK_DIR="$(cd "$(dirname "${_ENV_SRC}")/.." && pwd)"
export NETWORK_DIR

export PATH="${NETWORK_DIR}/bin:${PATH}"
export FABRIC_CFG_PATH="${NETWORK_DIR}/config"      # core.yaml for the peer CLI

export CHANNEL_NAME="${CHANNEL_NAME:-certchannel}"
export CC_NAME="${CC_NAME:-certledger}"

ORGS_DIR="${NETWORK_DIR}/organizations"
export ORDERER_CA="${ORGS_DIR}/ordererOrganizations/certledger.com/tlsca/tlsca.certledger.com-cert.pem"
export ORDERER_ADMIN_TLS_SIGN_CERT="${ORGS_DIR}/ordererOrganizations/certledger.com/orderers/orderer.certledger.com/tls/server.crt"
export ORDERER_ADMIN_TLS_PRIVATE_KEY="${ORGS_DIR}/ordererOrganizations/certledger.com/orderers/orderer.certledger.com/tls/server.key"
export ORDERER_ADDRESS="localhost:7050"
export ORDERER_HOSTNAME="orderer.certledger.com"

export PEER_UNIVERSITY_CA="${ORGS_DIR}/peerOrganizations/university.certledger.com/tlsca/tlsca.university.certledger.com-cert.pem"
export PEER_PLATFORM_CA="${ORGS_DIR}/peerOrganizations/platform.certledger.com/tlsca/tlsca.platform.certledger.com-cert.pem"

# Containers run as you, so generated files stay owned by you
export FABRIC_UID="$(id -u)"
export FABRIC_GID="$(id -g)"

# ---- pretty output ---------------------------------------------------------
C_RESET='\033[0m'; C_RED='\033[0;31m'; C_GREEN='\033[0;32m'; C_BLUE='\033[0;34m'; C_YELLOW='\033[1;33m'
infoln()    { echo -e "${C_BLUE}$*${C_RESET}"; }
successln() { echo -e "${C_GREEN}$*${C_RESET}"; }
warnln()    { echo -e "${C_YELLOW}$*${C_RESET}"; }
errorln()   { echo -e "${C_RED}$*${C_RESET}" >&2; }
fatalln()   { errorln "$*"; exit 1; }

# ---- switch peer CLI identity ---------------------------------------------
# useOrg university|platform
useOrg() {
  local org="$1"
  export CORE_PEER_TLS_ENABLED=true
  case "$org" in
    university|University|1)
      export CORE_PEER_LOCALMSPID=UniversityMSP
      export CORE_PEER_TLS_ROOTCERT_FILE="${PEER_UNIVERSITY_CA}"
      export CORE_PEER_MSPCONFIGPATH="${ORGS_DIR}/peerOrganizations/university.certledger.com/users/Admin@university.certledger.com/msp"
      export CORE_PEER_ADDRESS=localhost:7051
      ;;
    platform|Platform|2)
      export CORE_PEER_LOCALMSPID=PlatformMSP
      export CORE_PEER_TLS_ROOTCERT_FILE="${PEER_PLATFORM_CA}"
      export CORE_PEER_MSPCONFIGPATH="${ORGS_DIR}/peerOrganizations/platform.certledger.com/users/Admin@platform.certledger.com/msp"
      export CORE_PEER_ADDRESS=localhost:9051
      ;;
    *)
      errorln "Unknown org '$org' (use: university | platform)"; return 1 ;;
  esac
  [[ -n "${QUIET_USEORG:-}" ]] || echo -e "${C_GREEN}peer CLI now acting as ${CORE_PEER_LOCALMSPID} admin -> ${CORE_PEER_ADDRESS}${C_RESET}"
}

# Flags that target BOTH endorsing peers (needed for the AND endorsement policy)
bothPeersArgs() {
  echo "--peerAddresses localhost:7051 --tlsRootCertFiles ${PEER_UNIVERSITY_CA} --peerAddresses localhost:9051 --tlsRootCertFiles ${PEER_PLATFORM_CA}"
}

# Flags for talking to the orderer from the host
ordererArgs() {
  echo "-o ${ORDERER_ADDRESS} --ordererTLSHostnameOverride ${ORDERER_HOSTNAME} --tls --cafile ${ORDERER_CA}"
}
