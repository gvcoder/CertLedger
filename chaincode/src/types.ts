export type CertificateStatus = 
  | 'PENDING_TEACHER_APPROVAL'
  | 'PENDING_PLATFORM_APPROVAL'
  | 'ISSUED_VALID'
  | 'REVOKED';

export interface SignatureDetail {
  signed: boolean;
  signerId: string;
  signerName: string;
  signedAt: string;
  signatureHash: string;
}

export interface MultiPartySignatures {
  student: SignatureDetail;
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
}

export interface TransactionHistoryRecord {
  txId: string;
  timestamp: string;
  isDelete: boolean;
  value: CertificateAsset;
}
