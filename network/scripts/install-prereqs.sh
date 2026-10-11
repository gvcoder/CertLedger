#!/usr/bin/env bash
#
# install-prereqs.sh - Phase 0: install Hyperledger Fabric binaries + Docker images
#
# Installs everything *inside the repo* (network/bin, network/config) so nothing
# touches system directories. Safe to re-run: skips work that is already done.
#
# Usage:  ./network/scripts/install-prereqs.sh
#
set -euo pipefail

FABRIC_VERSION="${FABRIC_VERSION:-2.5.16}"
CA_VERSION="${CA_VERSION:-1.5.22}"
NODEENV_TAG="${NODEENV_TAG:-2.5}"
COUCHDB_VERSION="${COUCHDB_VERSION:-3.3.3}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

c_green='\033[0;32m'; c_yellow='\033[1;33m'; c_red='\033[0;31m'; c_off='\033[0m'
info()  { echo -e "${c_green}==>${c_off} $*"; }
warn()  { echo -e "${c_yellow}WARN:${c_off} $*"; }
fatal() { echo -e "${c_red}ERROR:${c_off} $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Sanity-check host prerequisites
# ---------------------------------------------------------------------------
info "Checking host prerequisites"
for cmd in docker curl jq git tar; do
  command -v "$cmd" >/dev/null 2>&1 || fatal "'$cmd' is required but not installed."
done
docker info >/dev/null 2>&1 || fatal "Docker daemon is not reachable. Is Docker running and are you in the 'docker' group?"
docker compose version >/dev/null 2>&1 || fatal "Docker Compose v2 ('docker compose') is required."
echo "    docker:  $(docker --version)"
echo "    compose: $(docker compose version --short)"
echo "    node:    $(node --version 2>/dev/null || echo 'not found (needed for the app, not for the network)')"

# ---------------------------------------------------------------------------
# 2. Fabric binaries (peer, orderer, configtxgen, osnadmin, fabric-ca-client ...)
# ---------------------------------------------------------------------------
cd "${NETWORK_DIR}"

if [[ ! -x install-fabric.sh ]]; then
  info "Downloading official install-fabric.sh"
  curl -sSLo install-fabric.sh \
    https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
  chmod +x install-fabric.sh
fi

if [[ -x bin/peer ]] && bin/peer version 2>/dev/null | grep -q "Version: v\?${FABRIC_VERSION}"; then
  info "Fabric binaries v${FABRIC_VERSION} already present in network/bin - skipping"
else
  info "Installing Fabric v${FABRIC_VERSION} / Fabric CA v${CA_VERSION} binaries into network/bin"
  ./install-fabric.sh --fabric-version "${FABRIC_VERSION}" --ca-version "${CA_VERSION}" binary
fi

# ---------------------------------------------------------------------------
# 3. Docker images
# ---------------------------------------------------------------------------
info "Pulling Fabric Docker images (peer, orderer, ccenv, baseos, ca)"
./install-fabric.sh --fabric-version "${FABRIC_VERSION}" --ca-version "${CA_VERSION}" docker

info "Pulling Node.js chaincode runtime image (fabric-nodeenv:${NODEENV_TAG})"
docker pull "hyperledger/fabric-nodeenv:${NODEENV_TAG}"

info "Pulling CouchDB ${COUCHDB_VERSION} (world-state database)"
docker pull "couchdb:${COUCHDB_VERSION}"

# ---------------------------------------------------------------------------
# 4. Verify
# ---------------------------------------------------------------------------
info "Verifying installation"
export PATH="${NETWORK_DIR}/bin:${PATH}"
echo "--- peer ---";             peer version | sed 's/^/    /'
echo "--- configtxgen ---";      configtxgen --version | sed 's/^/    /'
echo "--- osnadmin ---";         { osnadmin --help 2>&1 || true; } | head -1 | sed 's/^/    /'
echo "--- fabric-ca-client ---"; fabric-ca-client version | sed 's/^/    /'
echo "--- images ---"
docker images --format '    {{.Repository}}:{{.Tag}}\t{{.Size}}' | grep -E 'hyperledger/|couchdb' | sort

info "Phase 0 complete. Binaries: ${NETWORK_DIR}/bin  Config: ${NETWORK_DIR}/config"
