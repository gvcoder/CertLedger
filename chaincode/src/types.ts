export type CertificateStatus =
  | 'PENDING_TEACHER_APPROVAL'
  | 'PENDING_PLATFORM_APPROVAL'
  | 'ISSUED_VALID'
  | 'REVOKED';

/**
 * A signature recorded on the ledger.
 *
 * The *cryptographic* proof is the Fabric transaction itself: the signer's
 * private key signed the proposal, every endorsing peer verified it, and the
 * signed transaction is stored in a block. This record ties the certificate
 * to that transaction and to the signer's X.509 identity.
 */
export interface SignatureDetail {
  signed: boolean;
  signerId: string;          // app user id (from the X.509 'userId' attribute)
  signerName: string;
  signerRole: string;        // STUDENT | TEACHER | SUPER_ADMIN (from 'role' attribute)
  mspId: string;             // UniversityMSP | PlatformMSP
  x509Subject: string;       // full subject DN of the signing cert
  x509Issuer: string;        // issuing Fabric CA
  certFingerprint: string;   // SHA-256 of the signer's PEM certificate
  txId: string;              // Fabric transaction that carries the signature
  signedAt: string;          // deterministic: transaction timestamp
}

export interface MultiPartySignatures {
  student?: SignatureDetail;
  teacher?: SignatureDetail;
  platformAdmin?: SignatureDetail;
}

export interface CertificateAsset {
  docType: 'certificate';
  certificateId: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  teacherId: string;
  teacherName: string;
  platformAdminId?: string;
  score: number;
  issueTimestamp: string;
  completionHash: string;
  signatures: MultiPartySignatures;
  status: CertificateStatus;
  revoked: boolean;
  revocationReason?: string;
  revokedBy?: SignatureDetail;
  seedData?: boolean;
}

export interface TransactionHistoryRecord {
  txId: string;
  timestamp: string;
  isDelete: boolean;
  value: CertificateAsset | null;
}
