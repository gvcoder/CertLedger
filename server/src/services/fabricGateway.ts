import crypto from 'crypto';
import { fabricEmulatorInstance } from './fabricEmulator';
import { config } from '../config';

export class FabricGatewayService {

  public async initiateCertificate(params: {
    certificateId: string;
    studentId: string;
    studentName: string;
    courseId: string;
    courseTitle: string;
    teacherId: string;
    teacherName: string;
    score: number;
    completionHash: string;
  }) {
    const txId = 'tx_' + crypto.randomBytes(8).toString('hex');
    const studentSigHash = 'sig_student_0x' + crypto.randomBytes(8).toString('hex');

    if (config.fabricMode === 'EMULATOR') {
      const existing = fabricEmulatorInstance.getState(params.certificateId);
      if (existing) {
        throw new Error(`Certificate with ID ${params.certificateId} already exists.`);
      }

      const now = new Date().toISOString();
      const certAsset = {
        docType: 'certificate',
        certificateId: params.certificateId,
        studentId: params.studentId,
        studentName: params.studentName,
        courseId: params.courseId,
        courseTitle: params.courseTitle,
        teacherId: params.teacherId,
        teacherName: params.teacherName,
        score: params.score,
        issueTimestamp: now,
        completionHash: params.completionHash,
        signatures: {
          student: {
            signed: true,
            signerId: params.studentId,
            signerName: params.studentName,
            signedAt: now,
            signatureHash: studentSigHash
          }
        },
        status: 'PENDING_TEACHER_APPROVAL',
        revoked: false
      };

      fabricEmulatorInstance.putState(
        params.certificateId,
        JSON.stringify(certAsset),
        txId,
        'InitiateCertificate',
        [params.certificateId, params.studentId, params.courseId]
      );

      return { txId, certificate: certAsset };
    } else {
      // Production Fabric Network Call Placeholder
      throw new Error("Production Fabric SDK Connection Mode requested. Ensure Peer/Orderer containers are active.");
    }
  }

  public async teacherSignCertificate(params: {
    certificateId: string;
    teacherId: string;
    teacherName: string;
  }) {
    const txId = 'tx_' + crypto.randomBytes(8).toString('hex');
    const teacherSigHash = 'sig_teacher_0x' + crypto.randomBytes(8).toString('hex');

    if (config.fabricMode === 'EMULATOR') {
      const rawState = fabricEmulatorInstance.getState(params.certificateId);
      if (!rawState) {
        throw new Error(`Certificate ${params.certificateId} does not exist on the ledger.`);
      }

      const cert = JSON.parse(rawState);
      if (cert.status !== 'PENDING_TEACHER_APPROVAL') {
        throw new Error(`Certificate ${params.certificateId} cannot be signed in state '${cert.status}'.`);
      }

      const now = new Date().toISOString();
      cert.signatures.teacher = {
        signed: true,
        signerId: params.teacherId,
        signerName: params.teacherName,
        signedAt: now,
        signatureHash: teacherSigHash
      };
      cert.status = 'PENDING_PLATFORM_APPROVAL';

      fabricEmulatorInstance.putState(
        params.certificateId,
        JSON.stringify(cert),
        txId,
        'TeacherSignCertificate',
        [params.certificateId, params.teacherId]
      );

      return { txId, certificate: cert };
    } else {
      throw new Error("Production Fabric Network connection mode active.");
    }
  }

  public async platformAdminSignCertificate(params: {
    certificateId: string;
    platformAdminId: string;
    platformAdminName: string;
  }) {
    const txId = 'tx_' + crypto.randomBytes(8).toString('hex');
    const platformSigHash = 'sig_platform_0x' + crypto.randomBytes(8).toString('hex');

    if (config.fabricMode === 'EMULATOR') {
      const rawState = fabricEmulatorInstance.getState(params.certificateId);
      if (!rawState) {
        throw new Error(`Certificate ${params.certificateId} does not exist on the ledger.`);
      }

      const cert = JSON.parse(rawState);
      if (cert.status !== 'PENDING_PLATFORM_APPROVAL') {
        throw new Error(`Certificate ${params.certificateId} is not pending platform approval. Current status: ${cert.status}.`);
      }

      const now = new Date().toISOString();
      cert.platformAdminId = params.platformAdminId;
      cert.signatures.platformAdmin = {
        signed: true,
        signerId: params.platformAdminId,
        signerName: params.platformAdminName,
        signedAt: now,
        signatureHash: platformSigHash
      };
      cert.status = 'ISSUED_VALID';

      fabricEmulatorInstance.putState(
        params.certificateId,
        JSON.stringify(cert),
        txId,
        'PlatformAdminSignCertificate',
        [params.certificateId, params.platformAdminId]
      );

      return { txId, certificate: cert };
    } else {
      throw new Error("Production Fabric Network connection mode active.");
    }
  }

  public async verifyCertificate(certificateId: string) {
    if (config.fabricMode === 'EMULATOR') {
      const rawState = fabricEmulatorInstance.getState(certificateId);
      if (!rawState) {
        return { found: false, error: 'Certificate ID not found on Hyperledger Fabric ledger.' };
      }

      const cert = JSON.parse(rawState);
      const isStudentSigned = !!cert.signatures.student?.signed;
      const isTeacherSigned = !!cert.signatures.teacher?.signed;
      const isPlatformSigned = !!cert.signatures.platformAdmin?.signed;
      const isFullyVerified = isStudentSigned && isTeacherSigned && isPlatformSigned && cert.status === 'ISSUED_VALID' && !cert.revoked;

      return {
        found: true,
        certificate: cert,
        verification: {
          isFullyVerified,
          isStudentSigned,
          isTeacherSigned,
          isPlatformSigned,
          isRevoked: cert.revoked,
          currentStatus: cert.status,
          ledgerBlockCount: fabricEmulatorInstance.getBlocks().length
        }
      };
    } else {
      throw new Error("Production Fabric Network connection mode active.");
    }
  }

  public async getCertificateHistory(certificateId: string) {
    if (config.fabricMode === 'EMULATOR') {
      return fabricEmulatorInstance.getHistory(certificateId);
    } else {
      throw new Error("Production Fabric Network connection mode active.");
    }
  }

  public async getAllCertificates() {
    return fabricEmulatorInstance.getAllCertificates();
  }

  public async getLedgerTelemetry() {
    const blocks = fabricEmulatorInstance.getBlocks();
    const certs = fabricEmulatorInstance.getAllCertificates();
    const pendingTeacher = certs.filter(c => c.status === 'PENDING_TEACHER_APPROVAL').length;
    const pendingPlatform = certs.filter(c => c.status === 'PENDING_PLATFORM_APPROVAL').length;
    const issuedValid = certs.filter(c => c.status === 'ISSUED_VALID').length;

    return {
      mode: config.fabricMode,
      channel: config.fabricChannel,
      chaincode: config.fabricChaincode,
      totalBlocks: blocks.length,
      latestBlockHash: blocks[blocks.length - 1].dataHash,
      totalCertificates: certs.length,
      metrics: {
        pendingTeacher,
        pendingPlatform,
        issuedValid
      },
      recentBlocks: blocks.slice(-5).reverse()
    };
  }
}

export const fabricGatewayService = new FabricGatewayService();
