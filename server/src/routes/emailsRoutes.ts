import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db } from '../db/database.js';
import { getAuthenticatedClient } from '../services/googleAuth.js';
import { createGoogleCalendarEvent } from '../services/calendarService.js';
import { logger } from '../services/logger.js';
import { ExtractedMeetingInfo } from '../services/aiExtractor.js';

export const emailsRouter = Router();

emailsRouter.use(authMiddleware);

// Get email stats
emailsRouter.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  const total = db.prepare('SELECT COUNT(*) as count FROM processed_emails WHERE userId = ?').get(userId) as any;
  const created = db.prepare("SELECT COUNT(*) as count FROM processed_emails WHERE userId = ? AND status = 'EVENT_CREATED'").get(userId) as any;
  const needsReview = db.prepare("SELECT COUNT(*) as count FROM processed_emails WHERE userId = ? AND status = 'NEEDS_REVIEW'").get(userId) as any;
  const errors = db.prepare("SELECT COUNT(*) as count FROM processed_emails WHERE userId = ? AND status = 'ERROR'").get(userId) as any;
  const activeRules = db.prepare('SELECT COUNT(*) as count FROM rules WHERE userId = ? AND isActive = 1').get(userId) as any;

  return res.json({
    totalProcessed: total?.count || 0,
    eventsCreated: created?.count || 0,
    needsReview: needsReview?.count || 0,
    errors: errors?.count || 0,
    activeRules: activeRules?.count || 0
  });
});

// Get processed emails list
emailsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const status = req.query.status as string;
  const limit = parseInt(req.query.limit as string, 10) || 50;

  let query = 'SELECT * FROM processed_emails WHERE userId = ?';
  const params: any[] = [userId];

  if (status && status !== 'ALL') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY processedAt DESC LIMIT ?';
  params.push(limit);

  const emails = db.prepare(query).all(...params).map((email: any) => {
    try {
      email.extractedData = JSON.parse(email.extractedData);
    } catch {
      email.extractedData = null;
    }
    return email;
  });

  return res.json({ emails });
});

// Approve & Schedule event manually from "Needs Review"
emailsRouter.post('/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const emailId = req.params.id;
  const {
    eventTitle,
    date,
    startTime,
    endTime,
    durationMinutes,
    timezone,
    location,
    meetingUrl,
    description,
    calendarId
  } = req.body;

  const emailRecord = db.prepare('SELECT * FROM processed_emails WHERE id = ? AND userId = ?').get(emailId, userId) as any;
  if (!emailRecord) {
    return res.status(404).json({ error: 'Processed email record not found' });
  }

  if (!date || !startTime) {
    return res.status(400).json({ error: 'Date and start time are required to create a calendar event' });
  }

  const extracted: ExtractedMeetingInfo = {
    eventTitle: eventTitle || emailRecord.subject,
    date,
    startTime,
    endTime: endTime || startTime,
    durationMinutes: durationMinutes || 45,
    timezone: timezone || 'UTC',
    location: location || (meetingUrl ? 'Online' : ''),
    meetingUrl: meetingUrl || '',
    description: description || emailRecord.body || '',
    confidence: 1.0,
    isAmbiguous: false
  };

  try {
    const authClient = await getAuthenticatedClient(userId);
    const targetCalendar = calendarId || 'primary';

    const createdEvent = await createGoogleCalendarEvent(
      authClient,
      targetCalendar,
      extracted,
      {
        sender: emailRecord.sender,
        subject: emailRecord.subject,
        snippet: emailRecord.snippet
      }
    );

    // Update database status to EVENT_CREATED
    db.prepare(`
      UPDATE processed_emails
      SET status = 'EVENT_CREATED',
          calendarEventId = ?,
          calendarEventUrl = ?,
          extractedData = ?,
          confidence = 1.0,
          errorMessage = NULL,
          processedAt = ?
      WHERE id = ? AND userId = ?
    `).run(
      createdEvent.eventId,
      createdEvent.htmlLink,
      JSON.stringify(extracted),
      new Date().toISOString(),
      emailId,
      userId
    );

    logger.success(
      `Approved and scheduled Calendar Event "${extracted.eventTitle}"`,
      { eventId: createdEvent.eventId, link: createdEvent.htmlLink },
      userId
    );

    const updated = db.prepare('SELECT * FROM processed_emails WHERE id = ?').get(emailId) as any;
    updated.extractedData = extracted;

    return res.json({
      success: true,
      email: updated,
      calendarEventUrl: createdEvent.htmlLink
    });
  } catch (err: any) {
    logger.error('Failed to approve and create calendar event', err, userId);
    return res.status(500).json({ error: 'Failed to create event in Google Calendar', message: err.message });
  }
});

// Dismiss an email from review (mark as IGNORED)
emailsRouter.post('/:id/dismiss', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const emailId = req.params.id;

  const emailRecord = db.prepare('SELECT id FROM processed_emails WHERE id = ? AND userId = ?').get(emailId, userId);
  if (!emailRecord) {
    return res.status(404).json({ error: 'Email record not found' });
  }

  db.prepare(`
    UPDATE processed_emails
    SET status = 'IGNORED', errorMessage = 'Dismissed by user'
    WHERE id = ? AND userId = ?
  `).run(emailId, userId);

  return res.json({ success: true, message: 'Email dismissed' });
});

// Delete a processed email record (allows re-processing if needed)
emailsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const emailId = req.params.id;

  db.prepare('DELETE FROM processed_emails WHERE id = ? AND userId = ?').run(emailId, userId);
  return res.json({ success: true, message: 'Record deleted' });
});
