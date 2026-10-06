import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { fabricGatewayService } from '../services/fabricGateway';

const router = Router();

// Public Verification Endpoint (No authentication required!)
router.get('/public/verify/:certificateId', async (req: Request, res: Response) => {
  const { certificateId } = req.params;

  try {
    const result = await fabricGatewayService.verifyCertificate(certificateId);
    if (!result.found) {
      return res.status(404).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get Certificate Transaction History (Public audit trail)
router.get('/public/history/:certificateId', async (req: Request, res: Response) => {
  const { certificateId } = req.params;

  try {
    const history = await fabricGatewayService.getCertificateHistory(certificateId);
    return res.json({
      success: true,
      certificateId,
      history
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Student's Earned Certificates
router.get('/student/my-certificates', authenticateJWT, requireRole('STUDENT'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const all = await fabricGatewayService.getAllCertificates();
    const studentCerts = all.filter(c => c.studentId === req.user!.id);
    return res.json({ success: true, certificates: studentCerts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Teacher's Pending Signatures Queue
router.get('/pending/teacher', authenticateJWT, requireRole('TEACHER', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const all = await fabricGatewayService.getAllCertificates();
    const pending = all.filter(c => c.status === 'PENDING_TEACHER_APPROVAL');
    return res.json({ success: true, pendingCertificates: pending });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Teacher Signs Certificate (Academic Co-Sign)
router.post('/:id/sign/teacher', authenticateJWT, requireRole('TEACHER', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const certificateId = req.params.id;

  try {
    const result = await fabricGatewayService.teacherSignCertificate({
      certificateId,
      teacherId: req.user!.id,
      teacherName: req.user!.name
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// Platform Admin's Pending Signatures Queue (edX / Coursera Super-Admin)
router.get('/pending/platform', authenticateJWT, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const all = await fabricGatewayService.getAllCertificates();
    const pending = all.filter(c => c.status === 'PENDING_PLATFORM_APPROVAL');
    return res.json({ success: true, pendingCertificates: pending });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Platform Admin Co-Signs Certificate (Final Platform Endorsement)
router.post('/:id/sign/platform', authenticateJWT, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const certificateId = req.params.id;

  try {
    const result = await fabricGatewayService.platformAdminSignCertificate({
      certificateId,
      platformAdminId: req.user!.id,
      platformAdminName: req.user!.name
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// List All Certificates (Super-Admin Overview)
router.get('/all', authenticateJWT, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const certificates = await fabricGatewayService.getAllCertificates();
    return res.json({ success: true, certificates });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
