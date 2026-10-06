import { Router, Request, Response } from 'express';
import { fabricGatewayService } from '../services/fabricGateway';

const router = Router();

// Fabric Network Telemetry & Explorer Endpoint
router.get('/telemetry', async (req: Request, res: Response) => {
  try {
    const telemetry = await fabricGatewayService.getLedgerTelemetry();
    return res.json({
      success: true,
      telemetry
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
