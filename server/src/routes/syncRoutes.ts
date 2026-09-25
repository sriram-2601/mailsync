import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { syncUserEmails } from '../services/syncService.js';
import { extractMeetingInfo } from '../services/aiExtractor.js';
import { db } from '../db/database.js';
import { logger } from '../services/logger.js';

export const syncRouter = Router();

// Test parser endpoint (can be tested even before connecting if desired)
syncRouter.post('/test-parser', async (req: Request, res: Response) => {
  const { subject, body, defaultDuration, timezone } = req.body;

  if (!subject && !body) {
    return res.status(400).json({ error: 'Subject or body is required for test' });
  }

  try {
    const extracted = await extractMeetingInfo(
      subject || '',
      body || '',
      parseInt(defaultDuration, 10) || 45,
      timezone || 'UTC'
    );
    return res.json({ extracted });
  } catch (err: any) {
    return res.status(500).json({ error: 'Parser failed', message: err.message });
  }
});

// Require auth for remaining sync endpoints
syncRouter.use(authMiddleware);

// Manual trigger: Check Gmail Now
syncRouter.post('/check-now', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  try {
    logger.info('Manual "Check Gmail Now" triggered by user', null, userId);
    const summary = await syncUserEmails(userId, true);
    return res.json({
      success: true,
      summary,
      message: `Sync completed: ${summary.scanned} scanned, ${summary.created} events created, ${summary.needsReview} needs review.`
    });
  } catch (err: any) {
    logger.error('Manual sync execution failed', err, userId);
    return res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

// Get automation status and settings
syncRouter.get('/status', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  const settings = db.prepare('SELECT * FROM settings WHERE userId = ?').get(userId) as any || {
    isAutomationActive: 1,
    pollIntervalSeconds: 120,
    defaultCalendarId: 'primary',
    defaultTimezone: 'UTC',
    confidenceThreshold: 0.70,
    lastSyncAt: null,
    lastSyncStatus: null,
    lastSyncMessage: null
  };

  return res.json({ settings });
});

// Update automation settings (ON/OFF toggle, calendar, interval)
syncRouter.patch('/settings', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { isAutomationActive, defaultCalendarId, defaultTimezone, pollIntervalSeconds, confidenceThreshold } = req.body;

  const current = db.prepare('SELECT * FROM settings WHERE userId = ?').get(userId) as any || {};

  const active = isAutomationActive !== undefined ? (isAutomationActive ? 1 : 0) : (current.isAutomationActive ?? 1);
  const calId = defaultCalendarId || current.defaultCalendarId || 'primary';
  const tz = defaultTimezone || current.defaultTimezone || 'UTC';
  const interval = pollIntervalSeconds ? parseInt(pollIntervalSeconds, 10) : (current.pollIntervalSeconds || 120);
  const threshold = confidenceThreshold !== undefined ? parseFloat(confidenceThreshold) : (current.confidenceThreshold || 0.70);

  db.prepare(`
    INSERT INTO settings (userId, isAutomationActive, pollIntervalSeconds, defaultCalendarId, defaultTimezone, confidenceThreshold)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      isAutomationActive = excluded.isAutomationActive,
      pollIntervalSeconds = excluded.pollIntervalSeconds,
      defaultCalendarId = excluded.defaultCalendarId,
      defaultTimezone = excluded.defaultTimezone,
      confidenceThreshold = excluded.confidenceThreshold
  `).run(userId, active, interval, calId, tz, threshold);

  logger.info(`Automation settings updated: Automation is ${active ? 'ACTIVE' : 'PAUSED'}`, null, userId);

  const updated = db.prepare('SELECT * FROM settings WHERE userId = ?').get(userId);
  return res.json({ settings: updated });
});
