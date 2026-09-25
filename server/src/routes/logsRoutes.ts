import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

export const logsRouter = Router();

// Get recent activity logs
logsRouter.get('/', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const level = req.query.level as string;

  let query = 'SELECT * FROM activity_logs';
  const params: any[] = [];

  if (level && level !== 'ALL') {
    query += ' WHERE level = ?';
    params.push(level);
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const logs = db.prepare(query).all(...params);
  return res.json({ logs });
});

// Clear activity logs
logsRouter.delete('/', (req: Request, res: Response) => {
  db.prepare('DELETE FROM activity_logs').run();
  return res.json({ success: true, message: 'Logs cleared successfully' });
});
