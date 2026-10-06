import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'certledger_jwt_secret_default_key_2026',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  fabricMode: (process.env.FABRIC_MODE || 'EMULATOR') as 'EMULATOR' | 'FABRIC_NETWORK',
  fabricChannel: process.env.FABRIC_CHANNEL_NAME || 'certchannel',
  fabricChaincode: process.env.FABRIC_CHAINCODE_NAME || 'certledger',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000'
};
