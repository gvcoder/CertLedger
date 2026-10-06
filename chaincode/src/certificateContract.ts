import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { CertificateAsset, CertificateStatus, TransactionHistoryRecord } from './types';

@Info({ title: 'CertificateContract', description: 'Multi-Party Signed Course Certificate Smart Contract for Hyperledger Fabric' })
export class CertificateContract extends Contract {

    constructor() {
        super('CertificateContract');
    }

    /**
     * InitLedger populates the ledger with sample seed certificates for demonstration & verification.
     */
    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        const seedCertificates: CertificateAsset[] = [
            {
                docType: 'certificate',
                certificateId: 'CERT-2026-1001',
                studentId: 'STD-101',
                studentName: 'Alex Rivera',
                courseId: 'CRS-501',
                courseTitle: 'Introduction to Blockchain & Hyperledger Fabric Architecture',
                teacherId: 'TCH-201',
                teacherName: 'Prof. Michael Faraday',
                platformAdminId: 'SUPER-ADMIN-01',
                score: 100,
                issueTimestamp: '2026-10-06T08:00:00.000Z',
                completionHash: '0xa4f8b9e123456789abcdef0123456789abcdef0123456789abcdef0123456789',
                signatures: {
                    student: {
                        signed: true,
                        signerId: 'STD-101',
                        signerName: 'Alex Rivera',
                        signedAt: '2026-10-06T08:00:00.000Z',
                        signatureHash: 'sig_std_0x9812a4f'
                    },
                    teacher: {
                        signed: true,
                        signerId: 'TCH-201',
                        signerName: 'Prof. Michael Faraday',
                        signedAt: '2026-10-06T08:02:00.000Z',
                        signatureHash: 'sig_tch_0x3341b8c'
                    },
                    platformAdmin: {
                        signed: true,
                        signerId: 'SUPER-ADMIN-01',
                        signerName: 'EdX Platform Provider',
                        signedAt: '2026-10-06T08:05:00.000Z',
                        signatureHash: 'sig_admin_0x77c449e'
                    }
                },
                status: 'ISSUED_VALID',
                revoked: false
            }
        ];

        for (const cert of seedCertificates) {
            await ctx.stub.putState(cert.certificateId, Buffer.from(JSON.stringify(cert)));
        }
    }

    /**
     * InitiateCertificate: Triggered when a student passes a course exam.
     * Sets Student Signature and transitions status to PENDING_TEACHER_APPROVAL.
     */
    @Transaction()
    public async InitiateCertificate(
        ctx: Context,
        certificateId: string,
        studentId: string,
        studentName: string,
        courseId: string,
        courseTitle: string,
        teacherId: string,
        teacherName: string,
        score: number,
        completionHash: string,
        studentSignatureHash: string
    ): Promise<string> {
        const exists = await this.CertificateExists(ctx, certificateId);
        if (exists) {
            throw new Error(`Certificate with ID ${certificateId} already exists.`);
        }

        const now = new Date().toISOString();
        const certAsset: CertificateAsset = {
            docType: 'certificate',
            certificateId,
            studentId,
            studentName,
            courseId,
            courseTitle,
            teacherId,
            teacherName,
            score: Number(score),
            issueTimestamp: now,
            completionHash,
            signatures: {
                student: {
                    signed: true,
                    signerId: studentId,
                    signerName: studentName,
                    signedAt: now,
                    signatureHash: studentSignatureHash
                }
            },
            status: 'PENDING_TEACHER_APPROVAL',
            revoked: false
        };

        await ctx.stub.putState(certificateId, Buffer.from(JSON.stringify(certAsset)));
        return JSON.stringify(certAsset);
    }

    /**
     * TeacherSignCertificate: Teacher reviews student's exam completion and applies Academic Signature.
     * Transitions status to PENDING_PLATFORM_APPROVAL.
     */
    @Transaction()
    public async TeacherSignCertificate(
        ctx: Context,
        certificateId: string,
        teacherId: string,
        teacherName: string,
        teacherSignatureHash: string
    ): Promise<string> {
        const certBytes = await ctx.stub.getState(certificateId);
        if (!certBytes || certBytes.length === 0) {
            throw new Error(`Certificate ${certificateId} does not exist.`);
        }

        const cert: CertificateAsset = JSON.parse(certBytes.toString());

        if (cert.status !== 'PENDING_TEACHER_APPROVAL') {
            throw new Error(`Certificate ${certificateId} cannot be signed by teacher in status ${cert.status}.`);
        }

        const now = new Date().toISOString();
        cert.signatures.teacher = {
            signed: true,
            signerId: teacherId,
            signerName: teacherName,
            signedAt: now,
            signatureHash: teacherSignatureHash
        };
        cert.status = 'PENDING_PLATFORM_APPROVAL';

        await ctx.stub.putState(certificateId, Buffer.from(JSON.stringify(cert)));
        return JSON.stringify(cert);
    }

    /**
     * PlatformAdminSignCertificate: Super-Admin (Platform Provider e.g. edX/Coursera) applies final endorsement.
     * Verifies that Student and Teacher signatures exist, then mints asset as ISSUED_VALID.
     */
    @Transaction()
    public async PlatformAdminSignCertificate(
        ctx: Context,
        certificateId: string,
        platformAdminId: string,
        platformAdminName: string,
        platformSignatureHash: string
    ): Promise<string> {
        const certBytes = await ctx.stub.getState(certificateId);
        if (!certBytes || certBytes.length === 0) {
            throw new Error(`Certificate ${certificateId} does not exist.`);
        }

        const cert: CertificateAsset = JSON.parse(certBytes.toString());

        if (cert.status !== 'PENDING_PLATFORM_APPROVAL') {
            throw new Error(`Certificate ${certificateId} is not pending platform approval. Current status: ${cert.status}.`);
        }

        if (!cert.signatures.student?.signed || !cert.signatures.teacher?.signed) {
            throw new Error(`Multi-party signature constraint failed: Student and Teacher must sign before Platform endorsement.`);
        }

        const now = new Date().toISOString();
        cert.platformAdminId = platformAdminId;
        cert.signatures.platformAdmin = {
            signed: true,
            signerId: platformAdminId,
            signerName: platformAdminName,
            signedAt: now,
            signatureHash: platformSignatureHash
        };
        cert.status = 'ISSUED_VALID';

        await ctx.stub.putState(certificateId, Buffer.from(JSON.stringify(cert)));
        return JSON.stringify(cert);
    }

    /**
     * VerifyCertificate: Returns certificate details and signature verification summary.
     */
    @Transaction(false)
    @Returns('string')
    public async VerifyCertificate(ctx: Context, certificateId: string): Promise<string> {
        const certBytes = await ctx.stub.getState(certificateId);
        if (!certBytes || certBytes.length === 0) {
            throw new Error(`Certificate ${certificateId} was not found on the Hyperledger Fabric ledger.`);
        }

        const cert: CertificateAsset = JSON.parse(certBytes.toString());
        const isStudentSigned = !!cert.signatures.student?.signed;
        const isTeacherSigned = !!cert.signatures.teacher?.signed;
        const isPlatformSigned = !!cert.signatures.platformAdmin?.signed;

        const isFullyVerified = isStudentSigned && isTeacherSigned && isPlatformSigned && cert.status === 'ISSUED_VALID' && !cert.revoked;

        const response = {
            certificate: cert,
            verificationStatus: {
                isFullyVerified,
                isStudentSigned,
                isTeacherSigned,
                isPlatformSigned,
                isRevoked: cert.revoked,
                currentStatus: cert.status
            }
        };

        return JSON.stringify(response);
    }

    /**
     * GetCertificateHistory: Retrieves the full block-by-block immutable provenance history of a certificate asset.
     */
    @Transaction(false)
    @Returns('string')
    public async GetCertificateHistory(ctx: Context, certificateId: string): Promise<string> {
        const iterator = await ctx.stub.getHistoryForKey(certificateId);
        const history: TransactionHistoryRecord[] = [];

        let result = await iterator.next();
        while (!result.done) {
            if (result.value) {
                const txValue = Buffer.from(result.value.value).toString('utf8');
                let parsedValue: CertificateAsset | any = {};
                try {
                    parsedValue = JSON.parse(txValue);
                } catch {
                    parsedValue = txValue;
                }

                history.push({
                    txId: result.value.txId,
                    timestamp: new Date(result.value.timestamp.seconds.low * 1000).toISOString(),
                    isDelete: result.value.isDelete,
                    value: parsedValue
                });
            }
            result = await iterator.next();
        }
        await iterator.close();

        return JSON.stringify(history);
    }

    /**
     * CertificateExists returns true when asset with given ID exists in world state.
     */
    @Transaction(false)
    @Returns('boolean')
    public async CertificateExists(ctx: Context, certificateId: string): Promise<boolean> {
        const certBytes = await ctx.stub.getState(certificateId);
        return certBytes && certBytes.length > 0;
    }

    /**
     * RevokeCertificate: Allows Super-Admin to mark an improperly issued certificate as REVOKED.
     */
    @Transaction()
    public async RevokeCertificate(ctx: Context, certificateId: string, reason: string): Promise<string> {
        const certBytes = await ctx.stub.getState(certificateId);
        if (!certBytes || certBytes.length === 0) {
            throw new Error(`Certificate ${certificateId} does not exist.`);
        }

        const cert: CertificateAsset = JSON.parse(certBytes.toString());
        cert.revoked = true;
        cert.status = 'REVOKED';
        cert.revocationReason = reason;

        await ctx.stub.putState(certificateId, Buffer.from(JSON.stringify(cert)));
        return JSON.stringify(cert);
    }
}
