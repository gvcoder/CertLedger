#!/usr/bin/env bash
#
# registerEnroll.sh - issue all network identities from the Fabric CAs.
#
# For each org we:
#   1. enroll the CA bootstrap admin ("registrar")
#   2. register identities  (peer / orderer node, org Admin)
#   3. enroll them -> X.509 enrollment cert (msp/) + separate TLS cert (tls/)
#   4. lay out the MSP folders Fabric expects, with NodeOUs enabled so that
#      policies like 'UniversityMSP.peer' / '.admin' / '.client' work.
#
# Called by network.sh up; not normally run by hand.

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

CA_LOG="${NETWORK_DIR}/log/registerEnroll.log"
mkdir -p "$(dirname "$CA_LOG")"
: > "$CA_LOG"

# caClient <args...> : run fabric-ca-client, log output, show the log on failure
caClient() {
  echo "+ fabric-ca-client $*" >> "$CA_LOG"
  if ! fabric-ca-client "$@" >> "$CA_LOG" 2>&1; then
    errorln "fabric-ca-client $1 failed. Last lines of ${CA_LOG}:"
    tail -n 15 "$CA_LOG" >&2
    exit 1
  fi
}

waitForCA() {
  local org="$1" port="$2"
  local cert="${ORGS_DIR}/fabric-ca/${org}/ca-cert.pem"
  infoln "  waiting for ca-${org} on :${port} ..."
  for _ in $(seq 1 30); do
    if [[ -f "$cert" ]] && curl -sk "https://localhost:${port}/cainfo" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  fatalln "CA ca-${org} did not become ready (see: docker logs ca_${org})"
}

# writeNodeOUs <msp-dir> <cacert-relative-path>
writeNodeOUs() {
  local msp="$1" cacert="$2"
  cat > "${msp}/config.yaml" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: ${cacert}
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: ${cacert}
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: ${cacert}
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: ${cacert}
    OrganizationalUnitIdentifier: orderer
EOF
}

# copyTLS <node-dir>  : rename generated TLS material to the names Fabric uses
copyTLS() {
  local dir="$1"
  cp "${dir}"/tls/tlscacerts/* "${dir}/tls/ca.crt"
  cp "${dir}"/tls/signcerts/*  "${dir}/tls/server.crt"
  cp "${dir}"/tls/keystore/*   "${dir}/tls/server.key"
}

# ---------------------------------------------------------------------------
# Peer organisations
# ---------------------------------------------------------------------------
createPeerOrg() {
  local org="$1" port="$2"
  local domain="${org}.certledger.com"
  local caname="ca-${org}"
  local tlscert="${ORGS_DIR}/fabric-ca/${org}/ca-cert.pem"
  local orgdir="${ORGS_DIR}/peerOrganizations/${domain}"
  local peerdir="${orgdir}/peers/peer0.${domain}"
  local admindir="${orgdir}/users/Admin@${domain}"
  local cacert="cacerts/localhost-${port}-${caname}.pem"

  infoln "Creating identities for ${domain}"
  waitForCA "$org" "$port"
  mkdir -p "$orgdir"
  export FABRIC_CA_CLIENT_HOME="$orgdir"

  infoln "  enrolling CA registrar (admin)"
  caClient enroll -u "https://admin:adminpw@localhost:${port}" --caname "$caname" --tls.certfiles "$tlscert"

  writeNodeOUs "${orgdir}/msp" "$cacert"
  mkdir -p "${orgdir}/msp/tlscacerts" "${orgdir}/tlsca" "${orgdir}/ca"
  cp "$tlscert" "${orgdir}/msp/tlscacerts/ca.crt"
  cp "$tlscert" "${orgdir}/tlsca/tlsca.${domain}-cert.pem"
  cp "$tlscert" "${orgdir}/ca/ca.${domain}-cert.pem"

  infoln "  registering peer0 + org admin"
  caClient register --caname "$caname" --id.name peer0 --id.secret peer0pw --id.type peer \
    --tls.certfiles "$tlscert"
  caClient register --caname "$caname" --id.name "${org}admin" --id.secret "${org}adminpw" --id.type admin \
    --tls.certfiles "$tlscert"

  infoln "  enrolling peer0 (MSP + TLS)"
  caClient enroll -u "https://peer0:peer0pw@localhost:${port}" --caname "$caname" \
    -M "${peerdir}/msp" --csr.hosts "peer0.${domain}" --tls.certfiles "$tlscert"
  cp "${orgdir}/msp/config.yaml" "${peerdir}/msp/config.yaml"
  caClient enroll -u "https://peer0:peer0pw@localhost:${port}" --caname "$caname" \
    -M "${peerdir}/tls" --enrollment.profile tls \
    --csr.hosts "peer0.${domain}" --csr.hosts localhost --tls.certfiles "$tlscert"
  copyTLS "$peerdir"

  infoln "  enrolling Admin@${domain}"
  caClient enroll -u "https://${org}admin:${org}adminpw@localhost:${port}" --caname "$caname" \
    -M "${admindir}/msp" --tls.certfiles "$tlscert"
  cp "${orgdir}/msp/config.yaml" "${admindir}/msp/config.yaml"

  successln "  ✔ ${domain} identities issued"
}

# ---------------------------------------------------------------------------
# Orderer organisation
# ---------------------------------------------------------------------------
createOrdererOrg() {
  local port=9054 caname="ca-orderer" domain="certledger.com"
  local tlscert="${ORGS_DIR}/fabric-ca/ordererOrg/ca-cert.pem"
  local orgdir="${ORGS_DIR}/ordererOrganizations/${domain}"
  local nodedir="${orgdir}/orderers/orderer.${domain}"
  local admindir="${orgdir}/users/Admin@${domain}"
  local cacert="cacerts/localhost-${port}-${caname}.pem"

  infoln "Creating identities for the ordering service (${domain})"
  waitForCA ordererOrg "$port"
  mkdir -p "$orgdir"
  export FABRIC_CA_CLIENT_HOME="$orgdir"

  caClient enroll -u "https://admin:adminpw@localhost:${port}" --caname "$caname" --tls.certfiles "$tlscert"

  writeNodeOUs "${orgdir}/msp" "$cacert"
  mkdir -p "${orgdir}/msp/tlscacerts" "${orgdir}/tlsca"
  cp "$tlscert" "${orgdir}/msp/tlscacerts/tlsca.${domain}-cert.pem"
  cp "$tlscert" "${orgdir}/tlsca/tlsca.${domain}-cert.pem"

  caClient register --caname "$caname" --id.name orderer --id.secret ordererpw --id.type orderer \
    --tls.certfiles "$tlscert"
  caClient register --caname "$caname" --id.name ordererAdmin --id.secret ordererAdminpw --id.type admin \
    --tls.certfiles "$tlscert"

  caClient enroll -u "https://orderer:ordererpw@localhost:${port}" --caname "$caname" \
    -M "${nodedir}/msp" --csr.hosts "orderer.${domain}" --csr.hosts localhost --tls.certfiles "$tlscert"
  cp "${orgdir}/msp/config.yaml" "${nodedir}/msp/config.yaml"
  caClient enroll -u "https://orderer:ordererpw@localhost:${port}" --caname "$caname" \
    -M "${nodedir}/tls" --enrollment.profile tls \
    --csr.hosts "orderer.${domain}" --csr.hosts localhost --tls.certfiles "$tlscert"
  copyTLS "$nodedir"
  mkdir -p "${nodedir}/msp/tlscacerts"
  cp "${nodedir}"/tls/tlscacerts/* "${nodedir}/msp/tlscacerts/tlsca.${domain}-cert.pem"

  caClient enroll -u "https://ordererAdmin:ordererAdminpw@localhost:${port}" --caname "$caname" \
    -M "${admindir}/msp" --tls.certfiles "$tlscert"
  cp "${orgdir}/msp/config.yaml" "${admindir}/msp/config.yaml"

  successln "  ✔ ordering service identities issued"
}

createPeerOrg university 7054
createPeerOrg platform 8054
createOrdererOrg
