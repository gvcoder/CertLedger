import { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { generateAIQuestions } from '../services/gemini';

const router = Router();

// AI Question Generator Endpoint (Teachers & Super-Admin)
router.post('/generate-questions', authenticateJWT, requireRole('TEACHER', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { title, text } = req.body;

  if (!title || !text) {
    return res.status(400).json({ success: false, error: 'Please provide both course title and text content.' });
  }

  try {
    const questions = await generateAIQuestions(title, text);
    return res.json({
      success: true,
      questions
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate questions: ' + err.message
    });
  }
});

export default router;
