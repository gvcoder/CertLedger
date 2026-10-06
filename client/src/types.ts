export type UserRole = 'SUPER_ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution?: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  content: string;
  questions: Question[];
  category: string;
  createdAt: string;
}

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

export type CertificateStatus = 
  | 'PENDING_TEACHER_APPROVAL'
  | 'PENDING_PLATFORM_APPROVAL'
  | 'ISSUED_VALID'
  | 'REVOKED';

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

export interface VerificationResult {
  found: boolean;
  error?: string;
  certificate?: CertificateAsset;
  verification?: {
    isFullyVerified: boolean;
    isStudentSigned: boolean;
    isTeacherSigned: boolean;
    isPlatformSigned: boolean;
    isRevoked: boolean;
    currentStatus: CertificateStatus;
    ledgerBlockCount: number;
  };
}
