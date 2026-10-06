import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import aiRoutes from './routes/ai';
import certificateRoutes from './routes/certificates';
import fabricRoutes from './routes/fabric';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/fabric', fabricRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'CertLedger Hyperledger Fabric Secured Certificate Platform',
    timestamp: new Date().toISOString(),
    mode: config.fabricMode
  });
});

app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 CertLedger Express API Server running on port ${config.port}`);
  console.log(`🔗 Fabric Mode: ${config.fabricMode}`);
  console.log(`=======================================================`);
});
