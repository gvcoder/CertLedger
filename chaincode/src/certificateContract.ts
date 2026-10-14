import * as crypto from 'crypto';
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import {
    CertificateAsset,
    CertificateStatus,
    SignatureDetail,
    TransactionHistoryRecord,
} from './types';

/**
 * Who may call what. Roles come from the `role` attribute that Fabric CA
 * embeds in the caller's X.509 enrollment certificate (ecert=true), and the
 * organisation comes from the certificate's MSP. Neither can be faked by the
 * client: peers verify the certificate chain and the proposal signature
 * before this code ever runs.
 */
const ACL = {
    STUDENT: { mspId: 'UniversityMSP', role: 'STUDENT' },
    TEACHER: { mspId: 'UniversityMSP', role: 'TEACHER' },
    SUPER_ADMIN: { mspId: 'PlatformMSP', role: 'SUPER_ADMIN' },
} as const;
type AclKey = keyof typeof ACL;

/** Identity of the transaction submitter, extracted from its X.509 cert. */
interface Caller {
    mspId: string;
    role: string;
    userId: string;
    name: string;
    subject: string;
    issuer: string;
    fingerprint: string;
}

/** Chaincode event names (one per write transaction, stored in the block). */
export const EVENTS = {
    INITIATED: 'CertificateInitiated',
    TEACHER_SIGNED: 'TeacherSigned',
    PLATFORM_SIGNED: 'PlatformSigned',
    REVOKED: 'CertificateRevoked',
    LEDGER_INITIALISED: 'LedgerInitialised',
} as const;

const META_KEY = 'META~certledger';

@Info({ title: 'CertificateContract', description: 'Multi-party signed course certificates on Hyperledger Fabric' })
export class CertificateContract extends Contract {

    constructor() {
        super('CertificateContract');
    }

    // ---------------------------------------------------------------------
    // Observability hooks: every invocation logs entry/exit with timing.
    // Visible with:  ./network/network.sh logs chaincode
    // ---------------------------------------------------------------------

    private startTimes = new Map<string, number>();

    public async beforeTransaction(ctx: Context): Promise<void> {
        const { fcn, params } = ctx.stub.getFunctionAndParameters();
        const txId = ctx.stub.getTxID();
        this.startTimes.set(txId, Date.now());
        let caller = 'unknown';
        try {
            const c = this.getCaller(ctx);
            caller = `${c.mspId}/${c.role || '-'}/${c.userId || c.subject}`;
        } catch { /* identity parsing errors are reported by the function itself */ }
        this.log(ctx).info(`▶ ${fcn} tx=${short(txId)} caller=${caller} args=${JSON.stringify(params)}`);
    }

    public async afterTransaction(ctx: Context, result: unknown): Promise<void> {
        const txId = ctx.stub.getTxID();
        const started = this.startTimes.get(txId);
        this.startTimes.delete(txId);
        const ms = started ? Date.now() - started : -1;
        const size = typeof result === 'string' ? result.length : 0;
        this.log(ctx).info(`✔ ${ctx.stub.getFunctionAndParameters().fcn} tx=${short(txId)} ok in ${ms}ms (result ${size} bytes)`);
    }

    public async unknownTransaction(ctx: Context): Promise<void> {
        const { fcn } = ctx.stub.getFunctionAndParameters();
        this.log(ctx).warn(`✖ unknown function '${fcn}'`);
        throw new Error(`Function '${fcn}' does not exist in CertificateContract.`);
    }

    // ---------------------------------------------------------------------
    // Write transactions
    // ---------------------------------------------------------------------

    /**
     * InitLedger records network metadata once. No fake certificates are
     * seeded: every certificate on this ledger goes through the real
     * multi-party workflow.
     */
    @Transaction()
    public async InitLedger(ctx: Context): Promise<string> {
        const existing = await ctx.stub.getState(META_KEY);
        if (existing && existing.length > 0) {
            this.log(ctx).info('InitLedger: already initialised, nothing to do');
            return Buffer.from(existing).toString('utf8');
        }
        const caller = this.getCaller(ctx);
        const meta = {
            docType: 'meta',
            application: 'CertLedger',
            initialisedAt: this.txTime(ctx),
            initialisedTx: ctx.stub.getTxID(),
            initialisedBy: `${caller.mspId}:${caller.subject}`,
            workflow: ['PENDING_TEACHER_APPROVAL', 'PENDING_PLATFORM_APPROVAL', 'ISSUED_VALID'],
        };
        await this.put(ctx, META_KEY, meta);
        ctx.stub.setEvent(EVENTS.LEDGER_INITIALISED, Buffer.from(JSON.stringify({ txId: meta.initialisedTx })));
        return JSON.stringify(meta);
    }

    /**
     * Step 1 - the STUDENT (UniversityMSP, role=STUDENT) records course
     * completion. The student id is taken from the caller's certificate,
     * so nobody can initiate a certificate on someone else's behalf.
     */
    @Transaction()
    public async InitiateCertificate(
        ctx: Context,
        certificateId: string,
        studentName: string,
        courseId: string,
        courseTitle: string,
        teacherId: string,
        teacherName: string,
        score: number,
        completionHash: string,
    ): Promise<string> {
        const caller = this.authorize(ctx, 'STUDENT');

        requireNonEmpty({ certificateId, courseId, teacherId, completionHash });
        const numericScore = Number(score);
        if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
            throw new Error(`Invalid score '${score}': must be between 0 and 100.`);
        }
        if (await this.exists(ctx, certificateId)) {
            throw new Error(`Certificate with ID ${certificateId} already exists.`);
        }

        const now = this.txTime(ctx);
        const cert: CertificateAsset = {
            docType: 'certificate',
            certificateId,
            studentId: caller.userId,
            studentName: caller.name || studentName,
            courseId,
            courseTitle,
            teacherId,
            teacherName,
            score: numericScore,
            issueTimestamp: now,
            completionHash,
            signatures: { student: this.signature(ctx, caller) },
            status: 'PENDING_TEACHER_APPROVAL',
            revoked: false,
        };

        await this.put(ctx, certificateId, cert);
        this.transition(ctx, certificateId, '(new)', cert.status);
        this.emit(ctx, EVENTS.INITIATED, cert);
        return JSON.stringify(cert);
    }

    /**
     * Step 2 - the course TEACHER (UniversityMSP, role=TEACHER) co-signs.
     * Only the teacher named on the certificate may sign it.
     */
    @Transaction()
    public async TeacherSignCertificate(ctx: Context, certificateId: string): Promise<string> {
        const caller = this.authorize(ctx, 'TEACHER');
        const cert = await this.load(ctx, certificateId);

        if (cert.status !== 'PENDING_TEACHER_APPROVAL') {
            throw new Error(`Certificate ${certificateId} cannot be signed by a teacher in status ${cert.status}.`);
        }
        if (cert.teacherId !== caller.userId) {
            this.deny(ctx, `teacher ${caller.userId} is not the assigned teacher (${cert.teacherId})`);
        }

        const from = cert.status;
        cert.signatures.teacher = this.signature(ctx, caller);
        cert.status = 'PENDING_PLATFORM_APPROVAL';

        await this.put(ctx, certificateId, cert);
        this.transition(ctx, certificateId, from, cert.status);
        this.emit(ctx, EVENTS.TEACHER_SIGNED, cert);
        return JSON.stringify(cert);
    }

    /**
     * Step 3 - a platform SUPER_ADMIN (PlatformMSP) gives the final
     * endorsement. Both earlier signatures must be present.
     */
    @Transaction()
    public async PlatformAdminSignCertificate(ctx: Context, certificateId: string): Promise<string> {
        const caller = this.authorize(ctx, 'SUPER_ADMIN');
        const cert = await this.load(ctx, certificateId);

        if (cert.status !== 'PENDING_PLATFORM_APPROVAL') {
            throw new Error(`Certificate ${certificateId} is not pending platform approval. Current status: ${cert.status}.`);
        }
        if (!cert.signatures.student?.signed || !cert.signatures.teacher?.signed) {
            throw new Error('Multi-party signature constraint failed: Student and Teacher must sign before Platform endorsement.');
        }

        const from = cert.status;
        cert.platformAdminId = caller.userId;
        cert.signatures.platformAdmin = this.signature(ctx, caller);
        cert.status = 'ISSUED_VALID';

        await this.put(ctx, certificateId, cert);
        this.transition(ctx, certificateId, from, cert.status);
        this.emit(ctx, EVENTS.PLATFORM_SIGNED, cert);
        return JSON.stringify(cert);
    }

    /** A platform SUPER_ADMIN may revoke a certificate (kept on ledger, marked REVOKED). */
    @Transaction()
    public async RevokeCertificate(ctx: Context, certificateId: string, reason: string): Promise<string> {
        const caller = this.authorize(ctx, 'SUPER_ADMIN');
        requireNonEmpty({ reason });
        const cert = await this.load(ctx, certificateId);
        if (cert.revoked) {
            throw new Error(`Certificate ${certificateId} is already revoked.`);
        }

        const from = cert.status;
        cert.revoked = true;
        cert.status = 'REVOKED';
        cert.revocationReason = reason;
        cert.revokedBy = this.signature(ctx, caller);

        await this.put(ctx, certificateId, cert);
        this.transition(ctx, certificateId, from, cert.status);
        this.emit(ctx, EVENTS.REVOKED, cert);
        return JSON.stringify(cert);
    }

    // ---------------------------------------------------------------------
    // Read-only queries (evaluate - not sent to the orderer)
    // ---------------------------------------------------------------------

    @Transaction(false)
    @Returns('string')
    public async ReadCertificate(ctx: Context, certificateId: string): Promise<string> {
        return JSON.stringify(await this.load(ctx, certificateId));
    }

    @Transaction(false)
    @Returns('string')
    public async VerifyCertificate(ctx: Context, certificateId: string): Promise<string> {
        const cert = await this.load(ctx, certificateId);
        const s = cert.signatures;
        const isStudentSigned = !!s.student?.signed;
        const isTeacherSigned = !!s.teacher?.signed;
        const isPlatformSigned = !!s.platformAdmin?.signed;
        const correctOrgs =
            (!s.student || s.student.mspId === ACL.STUDENT.mspId) &&
            (!s.teacher || s.teacher.mspId === ACL.TEACHER.mspId) &&
            (!s.platformAdmin || s.platformAdmin.mspId === ACL.SUPER_ADMIN.mspId);
        const isFullyVerified =
            isStudentSigned && isTeacherSigned && isPlatformSigned && correctOrgs &&
            cert.status === 'ISSUED_VALID' && !cert.revoked;

        return JSON.stringify({
            certificate: cert,
            verificationStatus: {
                isFullyVerified,
                isStudentSigned,
                isTeacherSigned,
                isPlatformSigned,
                signersFromExpectedOrgs: correctOrgs,
                isRevoked: cert.revoked,
                currentStatus: cert.status,
            },
        });
    }

    /** Full provenance: every version of the certificate with its Fabric txId. */
    @Transaction(false)
    @Returns('string')
    public async GetCertificateHistory(ctx: Context, certificateId: string): Promise<string> {
        const iterator = await ctx.stub.getHistoryForKey(certificateId);
        const history: TransactionHistoryRecord[] = [];
        try {
            let res = await iterator.next();
            while (!res.done) {
                const m = res.value;
                const raw = Buffer.from(m.value).toString('utf8');
                history.push({
                    txId: m.txId,
                    timestamp: tsToIso(m.timestamp),
                    isDelete: m.isDelete,
                    value: raw ? JSON.parse(raw) : null,
                });
                res = await iterator.next();
            }
        } finally {
            await iterator.close();
        }
        return JSON.stringify(history);
    }

    @Transaction(false)
    @Returns('boolean')
    public async CertificateExists(ctx: Context, certificateId: string): Promise<boolean> {
        return this.exists(ctx, certificateId);
    }

    /** CouchDB rich query (uses indexStatus). */
    @Transaction(false)
    @Returns('string')
    public async QueryCertificatesByStatus(ctx: Context, status: string): Promise<string> {
        return this.richQuery(ctx, { docType: 'certificate', status: status as CertificateStatus });
    }

    @Transaction(false)
    @Returns('string')
    public async QueryCertificatesByStudent(ctx: Context, studentId: string): Promise<string> {
        return this.richQuery(ctx, { docType: 'certificate', studentId });
    }

    @Transaction(false)
    @Returns('string')
    public async QueryCertificatesByTeacher(ctx: Context, teacherId: string, status: string): Promise<string> {
        const selector: Record<string, string> = { docType: 'certificate', teacherId };
        if (status) selector.status = status;
        return this.richQuery(ctx, selector);
    }

    @Transaction(false)
    @Returns('string')
    public async GetAllCertificates(ctx: Context): Promise<string> {
        return this.richQuery(ctx, { docType: 'certificate' });
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private log(ctx: Context) {
        return ctx.logging.getLogger('certledger');
    }

    /** Deterministic time: identical on every endorsing peer. */
    private txTime(ctx: Context): string {
        return tsToIso(ctx.stub.getTxTimestamp());
    }

    private getCaller(ctx: Context): Caller {
        const ci = ctx.clientIdentity;
        const pem = Buffer.from(ci.getIDBytes()).toString('utf8');
        const { subject, issuer } = parseClientId(ci.getID());
        return {
            mspId: ci.getMSPID(),
            role: ci.getAttributeValue('role') || '',
            userId: ci.getAttributeValue('userId') || '',
            name: ci.getAttributeValue('displayName') || '',
            subject,
            issuer,
            fingerprint: crypto.createHash('sha256').update(pem).digest('hex'),
        };
    }

    private authorize(ctx: Context, need: AclKey): Caller {
        const caller = this.getCaller(ctx);
        const rule = ACL[need];
        if (caller.mspId !== rule.mspId || caller.role !== rule.role || !caller.userId) {
            this.deny(ctx,
                `requires ${rule.mspId} role=${rule.role}, caller is ${caller.mspId} role=${caller.role || '(none)'} userId=${caller.userId || '(none)'}`);
        }
        this.log(ctx).info(`  ACL ALLOW ${need}: ${caller.mspId}/${caller.userId}`);
        return caller;
    }

    private deny(ctx: Context, why: string): never {
        this.log(ctx).warn(`  ACL DENY: ${why}`);
        throw new Error(`Access denied: ${why}`);
    }

    private signature(ctx: Context, c: Caller): SignatureDetail {
        return {
            signed: true,
            signerId: c.userId,
            signerName: c.name || c.userId,
            signerRole: c.role,
            mspId: c.mspId,
            x509Subject: c.subject,
            x509Issuer: c.issuer,
            certFingerprint: c.fingerprint,
            txId: ctx.stub.getTxID(),
            signedAt: this.txTime(ctx),
        };
    }

    private async exists(ctx: Context, key: string): Promise<boolean> {
        const b = await ctx.stub.getState(key);
        return !!b && b.length > 0;
    }

    private async load(ctx: Context, certificateId: string): Promise<CertificateAsset> {
        const raw = await ctx.stub.getState(certificateId);
        if (!raw || raw.length === 0) {
            throw new Error(`Certificate ${certificateId} was not found on the ledger.`);
        }
        const b = Buffer.from(raw);
        this.log(ctx).debug(`  READ  ${certificateId} (${b.length} bytes, sha256=${sha(b).slice(0, 16)})`);
        return JSON.parse(b.toString('utf8')) as CertificateAsset;
    }

    private async put(ctx: Context, key: string, value: object): Promise<void> {
        const buf = Buffer.from(JSON.stringify(value));
        await ctx.stub.putState(key, buf);
        this.log(ctx).info(`  WRITE ${key} (${buf.length} bytes, sha256=${sha(buf).slice(0, 16)})`);
    }

    private transition(ctx: Context, id: string, from: string, to: string) {
        this.log(ctx).info(`  STATE ${id}: ${from} → ${to}`);
    }

    private emit(ctx: Context, name: string, cert: CertificateAsset) {
        const payload = {
            certificateId: cert.certificateId,
            status: cert.status,
            studentId: cert.studentId,
            teacherId: cert.teacherId,
            txId: ctx.stub.getTxID(),
        };
        ctx.stub.setEvent(name, Buffer.from(JSON.stringify(payload)));
        this.log(ctx).info(`  EVENT ${name} ${JSON.stringify(payload)}`);
    }

    private async richQuery(ctx: Context, selector: Record<string, string>): Promise<string> {
        const query = JSON.stringify({ selector });
        this.log(ctx).debug(`  QUERY ${query}`);
        const iterator = await ctx.stub.getQueryResult(query);
        const results: CertificateAsset[] = [];
        try {
            let res = await iterator.next();
            while (!res.done) {
                results.push(JSON.parse(Buffer.from(res.value.value).toString('utf8')));
                res = await iterator.next();
            }
        } finally {
            await iterator.close();
        }
        results.sort((a, b) => (a.issueTimestamp < b.issueTimestamp ? 1 : -1));
        return JSON.stringify(results);
    }
}

// ------------------------------------------------------------------------
// Pure utilities (exported for unit tests)
// ------------------------------------------------------------------------

/** Converts a protobuf Timestamp (seconds may be a Long) to ISO-8601. */
export function tsToIso(ts: { seconds: unknown; nanos?: number } | null | undefined): string {
    if (!ts) return new Date(0).toISOString();
    const s: any = ts.seconds;
    const seconds = typeof s === 'number' ? s
        : typeof s?.toNumber === 'function' ? s.toNumber()
        : Number(s?.toString?.() ?? s);
    const millis = seconds * 1000 + Math.floor((ts.nanos ?? 0) / 1e6);
    return new Date(millis).toISOString();
}

/** 'x509::/C=US/.../CN=alice::/C=US/.../CN=ca' -> { subject, issuer } */
export function parseClientId(id: string): { subject: string; issuer: string } {
    const parts = id.split('::');
    return { subject: parts[1] ?? id, issuer: parts[2] ?? '' };
}

function sha(b: Buffer): string {
    return crypto.createHash('sha256').update(b).digest('hex');
}

function short(txId: string): string {
    return txId.slice(0, 12);
}

function requireNonEmpty(fields: Record<string, string>) {
    for (const [k, v] of Object.entries(fields)) {
        if (v === undefined || v === null || String(v).trim() === '') {
            throw new Error(`Missing required argument '${k}'.`);
        }
    }
}
