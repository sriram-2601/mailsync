import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { initDatabase } from './db/database.js';
import { authRouter } from './routes/authRoutes.js';
import { rulesRouter } from './routes/rulesRoutes.js';
import { calendarRouter } from './routes/calendarRoutes.js';
import { syncRouter } from './routes/syncRoutes.js';
import { emailsRouter } from './routes/emailsRoutes.js';
import { logsRouter } from './routes/logsRoutes.js';
import { startBackgroundSync } from './services/syncService.js';
import { logger } from './services/logger.js';

// Initialize Database
initDatabase();

const app = express();

// Middlewares
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/calendars', calendarRouter);
app.use('/api/sync', syncRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/logs', logsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    googleConfigured: config.isGoogleConfigured()
  });
});

// Serve compiled client assets in production if present
const candidatePaths = [
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist/client')
];

const clientDistPath = candidatePaths.find(p => fs.existsSync(p));
if (clientDistPath) {
  console.log(`[Server] Serving compiled client static build from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ServerError]', err);
  logger.error(`Internal server error: ${err.message}`, err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong on the server'
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 MailCal Sync Server is running on http://localhost:${config.port}`);
  console.log(`💻 Client URL: ${config.clientUrl}`);
  console.log(`🔑 Google OAuth configured: ${config.isGoogleConfigured() ? 'YES ✅' : 'NO ❌ (set in .env)'}`);
  console.log(`🤖 Gemini AI configured: ${config.geminiApiKey ? 'YES ✅' : 'NO (using NLP heuristic engine) ℹ️'}`);
  console.log(`======================================================\n`);

  // Start background periodic sync loop
  startBackgroundSync();
});
