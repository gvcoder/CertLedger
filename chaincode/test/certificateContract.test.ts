import { expect } from 'chai';
import * as sinon from 'sinon';
import { CertificateContract, EVENTS, parseClientId, tsToIso } from '../src/certificateContract';

/**
 * Minimal in-memory stand-ins for the Fabric ChaincodeStub / ClientIdentity,
 * so we can exercise the contract's rules without a running network.
 */
type Who = { mspId: string; role?: string; userId?: string; displayName?: string; cn: string };

const STUDENT: Who = { mspId: 'UniversityMSP', role: 'STUDENT', userId: 'STD-101', displayName: 'Alex Rivera', cn: 'STD-101' };
const OTHER_STUDENT: Who = { mspId: 'UniversityMSP', role: 'STUDENT', userId: 'STD-999', cn: 'STD-999' };
const TEACHER: Who = { mspId: 'UniversityMSP', role: 'TEACHER', userId: 'TCH-201', displayName: 'Prof. Faraday', cn: 'TCH-201' };
const WRONG_TEACHER: Who = { mspId: 'UniversityMSP', role: 'TEACHER', userId: 'TCH-777', cn: 'TCH-777' };
const ADMIN: Who = { mspId: 'PlatformMSP', role: 'SUPER_ADMIN', userId: 'SUPER-ADMIN-01', cn: 'SUPER-ADMIN-01' };
const FAKE_ADMIN: Who = { mspId: 'UniversityMSP', role: 'SUPER_ADMIN', userId: 'HACKER', cn: 'HACKER' };
const ORG_ADMIN_NO_ATTRS: Who = { mspId: 'PlatformMSP', cn: 'platformadmin' };

class FakeLedger {
    state = new Map<string, Buffer>();
    history = new Map<string, { txId: string; value: Buffer }[]>();
    events: { name: string; payload: any }[] = [];
    txCounter = 0;
    seconds = 1_790_000_000;
}

function makeCtx(ledger: FakeLedger, who: Who, fcn = 'test') {
    const txId = `tx${++ledger.txCounter}`.padEnd(64, '0');
    ledger.seconds += 5;
    const seconds = ledger.seconds;
    const pem = `-----BEGIN CERTIFICATE-----\n${who.cn}\n-----END CERTIFICATE-----\n`;
    const attrs: Record<string, string | undefined> = { role: who.role, userId: who.userId, displayName: who.displayName };

    const stub = {
        getTxID: () => txId,
        // protobuf Long-like seconds, like the real shim
        getTxTimestamp: () => ({ seconds: { toNumber: () => seconds, toString: () => String(seconds) }, nanos: 0 }),
        getFunctionAndParameters: () => ({ fcn, params: [] as string[] }),
        getState: async (k: string) => ledger.state.get(k) ?? Buffer.alloc(0),
        putState: async (k: string, v: Buffer) => {
            ledger.state.set(k, v);
            const h = ledger.history.get(k) ?? [];
            h.push({ txId, value: v });
            ledger.history.set(k, h);
        },
        setEvent: (name: string, payload: Buffer) => ledger.events.push({ name, payload: JSON.parse(payload.toString()) }),
        getQueryResult: async (q: string) => {
            const selector = JSON.parse(q).selector;
            const rows = [...ledger.state.entries()]
                .map(([key, value]) => ({ key, value, doc: JSON.parse(value.toString()) }))
                .filter(r => Object.entries(selector).every(([k, v]) => r.doc[k] === v));
            let i = 0;
            return {
                next: async () => (i < rows.length ? { done: false, value: rows[i++] } : { done: true, value: undefined }),
                close: async () => undefined,
            };
        },
        getHistoryForKey: async (k: string) => {
            const rows = ledger.history.get(k) ?? [];
            let i = 0;
            return {
                next: async () => i < rows.length
                    ? { done: false, value: { txId: rows[i].txId, value: rows[i++].value, isDelete: false, timestamp: { seconds, nanos: 0 } } }
                    : { done: true, value: undefined },
                close: async () => undefined,
            };
        },
    };

    const clientIdentity = {
        getMSPID: () => who.mspId,
        getID: () => `x509::/OU=client/CN=${who.cn}::/C=US/O=Hyperledger/CN=ca.${who.mspId}`,
        getIDBytes: () => Buffer.from(pem),
        getAttributeValue: (n: string) => attrs[n] ?? null,
    };

    const logger = { info: () => undefined, warn: () => undefined, debug: () => undefined, error: () => undefined };
    return { stub, clientIdentity, logging: { getLogger: () => logger } } as any;
}

describe('CertificateContract', () => {
    let contract: CertificateContract;
    let ledger: FakeLedger;
    const as = (who: Who) => makeCtx(ledger, who);

    const initiate = (who: Who = STUDENT, id = 'CERT-1') =>
        contract.InitiateCertificate(as(who), id, 'Alex', 'CRS-501', 'Intro to Fabric', 'TCH-201', 'Prof. Faraday', 92 as any, 'abc123');

    beforeEach(() => {
        contract = new CertificateContract();
        ledger = new FakeLedger();
    });
    afterEach(() => sinon.restore());

    describe('happy path: student → teacher → platform', () => {
        it('issues a fully verified certificate with three real signer records', async () => {
            await initiate();
            await contract.TeacherSignCertificate(as(TEACHER), 'CERT-1');
            await contract.PlatformAdminSignCertificate(as(ADMIN), 'CERT-1');

            const v = JSON.parse(await contract.VerifyCertificate(as(STUDENT), 'CERT-1'));
            expect(v.verificationStatus.isFullyVerified).to.equal(true);
            expect(v.certificate.status).to.equal('ISSUED_VALID');

            const sigs = v.certificate.signatures;
            expect(sigs.student.mspId).to.equal('UniversityMSP');
            expect(sigs.teacher.signerRole).to.equal('TEACHER');
            expect(sigs.platformAdmin.mspId).to.equal('PlatformMSP');
            expect(sigs.student.certFingerprint).to.match(/^[0-9a-f]{64}$/);
            expect(sigs.student.txId).to.not.equal(sigs.teacher.txId);
            expect(sigs.student.x509Subject).to.contain('CN=STD-101');
        });

        it('emits one chaincode event per step', async () => {
            await initiate();
            await contract.TeacherSignCertificate(as(TEACHER), 'CERT-1');
            await contract.PlatformAdminSignCertificate(as(ADMIN), 'CERT-1');
            expect(ledger.events.map(e => e.name)).to.deep.equal([EVENTS.INITIATED, EVENTS.TEACHER_SIGNED, EVENTS.PLATFORM_SIGNED]);
            expect(ledger.events[2].payload).to.include({ certificateId: 'CERT-1', status: 'ISSUED_VALID' });
        });

        it('records full history with one entry per transaction', async () => {
            await initiate();
            await contract.TeacherSignCertificate(as(TEACHER), 'CERT-1');
            const h = JSON.parse(await contract.GetCertificateHistory(as(STUDENT), 'CERT-1'));
            expect(h).to.have.length(2);
            expect(h.map((r: any) => r.value.status)).to.deep.equal(['PENDING_TEACHER_APPROVAL', 'PENDING_PLATFORM_APPROVAL']);
            expect(h[0].timestamp).to.match(/^\d{4}-\d{2}-\d{2}T/);
        });
    });

    describe('access control (from X.509 attributes)', () => {
        it('takes the studentId from the certificate, not from arguments', async () => {
            const cert = JSON.parse(await initiate());
            expect(cert.studentId).to.equal('STD-101');
            expect(cert.studentName).to.equal('Alex Rivera'); // displayName attribute wins
        });

        it('rejects a teacher initiating a certificate', async () => {
            await expectReject(initiate(TEACHER), /Access denied.*role=STUDENT/);
        });

        it('rejects a student signing as teacher', async () => {
            await initiate();
            await expectReject(contract.TeacherSignCertificate(as(STUDENT), 'CERT-1'), /Access denied/);
        });

        it('rejects a teacher who is not assigned to the certificate', async () => {
            await initiate();
            await expectReject(contract.TeacherSignCertificate(as(WRONG_TEACHER), 'CERT-1'), /not the assigned teacher/);
        });

        it('rejects SUPER_ADMIN role claimed from the wrong organisation', async () => {
            await initiate();
            await contract.TeacherSignCertificate(as(TEACHER), 'CERT-1');
            await expectReject(contract.PlatformAdminSignCertificate(as(FAKE_ADMIN), 'CERT-1'), /requires PlatformMSP/);
        });

        it('rejects identities without app attributes (e.g. raw org admin)', async () => {
            await initiate();
            await contract.TeacherSignCertificate(as(TEACHER), 'CERT-1');
            await expectReject(contract.PlatformAdminSignCertificate(as(ORG_ADMIN_NO_ATTRS), 'CERT-1'), /Access denied/);
        });

        it('only SUPER_ADMIN may revoke', async () => {
            await initiate();
            await expectReject(contract.RevokeCertificate(as(TEACHER), 'CERT-1', 'fraud'), /Access denied/);
            const revoked = JSON.parse(await contract.RevokeCertificate(as(ADMIN), 'CERT-1', 'fraud'));
            expect(revoked.status).to.equal('REVOKED');
            expect(revoked.revokedBy.mspId).to.equal('PlatformMSP');
        });
    });

    describe('state machine', () => {
        it('rejects duplicate certificate ids', async () => {
            await initiate();
            await expectReject(initiate(), /already exists/);
        });

        it('rejects platform signature before teacher signature', async () => {
            await initiate();
            await expectReject(contract.PlatformAdminSignCertificate(as(ADMIN), 'CERT-1'), /not pending platform approval/);
        });

        it('rejects signing twice', async () => {
            await initiate();
            await contract.TeacherSignCertificate(as(TEACHER), 'CERT-1');
            await expectReject(contract.TeacherSignCertificate(as(TEACHER), 'CERT-1'), /cannot be signed/);
        });

        it('rejects out-of-range scores', async () => {
            await expectReject(
                contract.InitiateCertificate(as(STUDENT), 'X', 'n', 'c', 't', 'TCH-201', 'p', 150 as any, 'h'),
                /Invalid score/);
        });

        it('revoked certificates are not verified', async () => {
            await initiate();
            await contract.TeacherSignCertificate(as(TEACHER), 'CERT-1');
            await contract.PlatformAdminSignCertificate(as(ADMIN), 'CERT-1');
            await contract.RevokeCertificate(as(ADMIN), 'CERT-1', 'plagiarism');
            const v = JSON.parse(await contract.VerifyCertificate(as(STUDENT), 'CERT-1'));
            expect(v.verificationStatus.isFullyVerified).to.equal(false);
            expect(v.verificationStatus.isRevoked).to.equal(true);
        });

        it('unknown certificate gives a clear error', async () => {
            await expectReject(contract.VerifyCertificate(as(STUDENT), 'NOPE'), /not found/);
        });
    });

    describe('queries', () => {
        it('filters by status, student and teacher', async () => {
            await initiate(STUDENT, 'CERT-A');
            await initiate(OTHER_STUDENT, 'CERT-B');
            await contract.TeacherSignCertificate(as(TEACHER), 'CERT-A');

            const pendingTeacher = JSON.parse(await contract.QueryCertificatesByStatus(as(ADMIN), 'PENDING_TEACHER_APPROVAL'));
            expect(pendingTeacher.map((c: any) => c.certificateId)).to.deep.equal(['CERT-B']);

            const mine = JSON.parse(await contract.QueryCertificatesByStudent(as(STUDENT), 'STD-101'));
            expect(mine.map((c: any) => c.certificateId)).to.deep.equal(['CERT-A']);

            const teacherQueue = JSON.parse(await contract.QueryCertificatesByTeacher(as(TEACHER), 'TCH-201', 'PENDING_TEACHER_APPROVAL'));
            expect(teacherQueue.map((c: any) => c.certificateId)).to.deep.equal(['CERT-B']);

            const all = JSON.parse(await contract.GetAllCertificates(as(ADMIN)));
            expect(all).to.have.length(2);
        });
    });

    describe('determinism', () => {
        it('uses the transaction timestamp, never the wall clock', async () => {
            const clock = sinon.useFakeTimers(new Date('1999-01-01T00:00:00Z'));
            const cert = JSON.parse(await initiate());
            clock.restore();
            expect(cert.issueTimestamp).to.not.contain('1999');
            expect(cert.issueTimestamp).to.equal(cert.signatures.student.signedAt);
        });

        it('produces identical write sets for identical inputs (two endorsing peers)', async () => {
            const peerA = new FakeLedger();
            const peerB = new FakeLedger();
            await contract.InitiateCertificate(makeCtx(peerA, STUDENT), 'C', 'n', 'c', 't', 'TCH-201', 'p', 80 as any, 'h');
            await contract.InitiateCertificate(makeCtx(peerB, STUDENT), 'C', 'n', 'c', 't', 'TCH-201', 'p', 80 as any, 'h');
            expect(peerA.state.get('C')!.toString()).to.equal(peerB.state.get('C')!.toString());
        });
    });

    describe('InitLedger', () => {
        it('writes metadata once and seeds no fake certificates', async () => {
            await contract.InitLedger(as(ORG_ADMIN_NO_ATTRS));
            await contract.InitLedger(as(ORG_ADMIN_NO_ATTRS));
            expect(JSON.parse(await contract.GetAllCertificates(as(ADMIN)))).to.have.length(0);
            expect(ledger.events.filter(e => e.name === EVENTS.LEDGER_INITIALISED)).to.have.length(1);
        });
    });

    describe('utilities', () => {
        it('tsToIso handles Long, number and string seconds', () => {
            expect(tsToIso({ seconds: 0, nanos: 0 })).to.equal('1970-01-01T00:00:00.000Z');
            expect(tsToIso({ seconds: { toNumber: () => 60 }, nanos: 5e8 })).to.equal('1970-01-01T00:01:00.500Z');
            expect(tsToIso({ seconds: '120' })).to.equal('1970-01-01T00:02:00.000Z');
        });

        it('parseClientId splits subject and issuer', () => {
            expect(parseClientId('x509::/CN=alice::/CN=ca')).to.deep.equal({ subject: '/CN=alice', issuer: '/CN=ca' });
        });
    });
});

async function expectReject(p: Promise<unknown>, re: RegExp) {
    try {
        await p;
    } catch (e: any) {
        expect(e.message).to.match(re);
        return;
    }
    throw new Error(`expected rejection matching ${re}`);
}
