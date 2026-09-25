import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db } from '../db/database.js';
import { logger } from '../services/logger.js';

export const rulesRouter = Router();

rulesRouter.use(authMiddleware);

// Get all rules for current user
rulesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const rules = db.prepare('SELECT * FROM rules WHERE userId = ? ORDER BY createdAt DESC').all(userId);
  return res.json({ rules });
});

// Create a new rule
rulesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { senderEmail, keywords, calendarId, defaultDuration, timezone, isActive } = req.body;

  if (!senderEmail || typeof senderEmail !== 'string') {
    return res.status(400).json({ error: 'Sender email is required' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const duration = parseInt(defaultDuration, 10) || 45;
  const activeState = isActive !== false ? 1 : 0;
  const tz = timezone || 'UTC';
  const calId = calendarId || 'primary';

  try {
    db.prepare(`
      INSERT INTO rules (id, userId, senderEmail, keywords, calendarId, defaultDuration, timezone, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      senderEmail.trim().toLowerCase(),
      (keywords || '').trim(),
      calId,
      duration,
      tz,
      activeState,
      now,
      now
    );

    const createdRule = db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
    logger.info(`Created monitoring rule for sender: ${senderEmail}`, { ruleId: id }, userId);
    return res.status(201).json({ rule: createdRule });
  } catch (err: any) {
    logger.error('Failed to create rule', err, userId);
    return res.status(500).json({ error: 'Failed to create rule', message: err.message });
  }
});

// Update a rule
rulesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const ruleId = req.params.id;
  const { senderEmail, keywords, calendarId, defaultDuration, timezone, isActive } = req.body;

  const existing = db.prepare('SELECT * FROM rules WHERE id = ? AND userId = ?').get(ruleId, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  const duration = parseInt(defaultDuration, 10) || 45;
  const activeState = isActive !== undefined ? (isActive ? 1 : 0) : (existing as any).isActive;
  const tz = timezone || (existing as any).timezone || 'UTC';
  const calId = calendarId || (existing as any).calendarId || 'primary';
  const sender = (senderEmail || (existing as any).senderEmail).trim().toLowerCase();
  const kw = keywords !== undefined ? keywords.trim() : (existing as any).keywords;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE rules
      SET senderEmail = ?, keywords = ?, calendarId = ?, defaultDuration = ?, timezone = ?, isActive = ?, updatedAt = ?
      WHERE id = ? AND userId = ?
    `).run(sender, kw, calId, duration, tz, activeState, now, ruleId, userId);

    const updated = db.prepare('SELECT * FROM rules WHERE id = ?').get(ruleId);
    logger.info(`Updated monitoring rule: ${sender}`, { ruleId }, userId);
    return res.json({ rule: updated });
  } catch (err: any) {
    logger.error('Failed to update rule', err, userId);
    return res.status(500).json({ error: 'Failed to update rule', message: err.message });
  }
});

// Toggle rule active status
rulesRouter.patch('/:id/toggle', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const ruleId = req.params.id;

  const existing = db.prepare('SELECT * FROM rules WHERE id = ? AND userId = ?').get(ruleId, userId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  const newState = existing.isActive ? 0 : 1;
  db.prepare('UPDATE rules SET isActive = ?, updatedAt = ? WHERE id = ? AND userId = ?')
    .run(newState, new Date().toISOString(), ruleId, userId);

  const updated = db.prepare('SELECT * FROM rules WHERE id = ?').get(ruleId);
  return res.json({ rule: updated });
});

// Delete a rule
rulesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const ruleId = req.params.id;

  const existing = db.prepare('SELECT * FROM rules WHERE id = ? AND userId = ?').get(ruleId, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  db.prepare('DELETE FROM rules WHERE id = ? AND userId = ?').run(ruleId, userId);
  logger.info(`Deleted rule ${ruleId}`, null, userId);
  return res.json({ success: true, message: 'Rule deleted successfully' });
});
