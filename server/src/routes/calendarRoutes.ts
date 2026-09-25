import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getAuthenticatedClient } from '../services/googleAuth.js';
import { listUserCalendars } from '../services/calendarService.js';
import { logger } from '../services/logger.js';

export const calendarRouter = Router();

calendarRouter.use(authMiddleware);

// List all writable Google Calendars for user
calendarRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  try {
    const authClient = await getAuthenticatedClient(userId);
    const calendars = await listUserCalendars(authClient);
    return res.json({ calendars });
  } catch (err: any) {
    logger.error('Failed to list user Google Calendars', err, userId);
    return res.status(500).json({ error: 'Failed to list calendars', message: err.message });
  }
});
