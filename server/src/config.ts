import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const renderExternalUrl = process.env.RENDER_EXTERNAL_URL;

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || renderExternalUrl || 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || (
    renderExternalUrl 
      ? `${renderExternalUrl.replace(/\/$/, '')}/api/auth/callback` 
      : 'http://localhost:5000/api/auth/callback'
  ),
  jwtSecret: process.env.JWT_SECRET || 'mailcal-sync-super-secret-jwt-key-2026',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  pollIntervalSeconds: parseInt(process.env.POLL_INTERVAL_SECONDS || '120', 10),
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'mailcal.db'),
  isGoogleConfigured(): boolean {
    return Boolean(this.googleClientId && this.googleClientSecret);
  }
};
