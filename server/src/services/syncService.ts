import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { logger } from './logger.js';
import { getAuthenticatedClient } from './googleAuth.js';
import { searchEmails, FetchedGmailMessage } from './gmailService.js';
import { extractMeetingInfo, ExtractedMeetingInfo } from './aiExtractor.js';
import { createGoogleCalendarEvent } from './calendarService.js';
import { config } from '../config.js';

export interface SyncSummary {
  scanned: number;
  created: number;
  needsReview: number;
  skipped: number;
  errors: number;
}

export async function syncUserEmails(userId: string, isManual = false): Promise<SyncSummary> {
  const summary: SyncSummary = {
    scanned: 0,
    created: 0,
    needsReview: 0,
    skipped: 0,
    errors: 0
  };

  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined;
  if (!user) {
    throw new Error('User not found');
  }

  const settings = db.prepare('SELECT * FROM settings WHERE userId = ?').get(userId) as any || {
    isAutomationActive: 1,
    confidenceThreshold: 0.70
  };

  if (!isManual && !settings.isAutomationActive) {
    logger.info(`Automation is paused for user ${user.email}. Skipping background sync.`, null, userId);
    return summary;
  }

  const rules = db.prepare('SELECT * FROM rules WHERE userId = ? AND isActive = 1').all(userId) as any[];
  if (rules.length === 0) {
    logger.info(`No active monitoring rules configured for user ${user.email}.`, null, userId);
    return summary;
  }

  logger.info(`Starting Gmail sync for ${user.email} with ${rules.length} active rule(s)...`, null, userId);

  let authClient;
  try {
    authClient = await getAuthenticatedClient(userId);
  } catch (authErr: any) {
    logger.error(`Authentication error during sync: ${authErr.message}`, null, userId);
    db.prepare(`
      UPDATE settings
      SET lastSyncAt = ?, lastSyncStatus = 'ERROR', lastSyncMessage = ?
      WHERE userId = ?
    `).run(new Date().toISOString(), authErr.message, userId);
    throw authErr;
  }

  for (const rule of rules) {
    try {
      logger.info(`Searching Gmail for sender "${rule.senderEmail}" (Keywords: "${rule.keywords || 'None'}")...`, null, userId);
      const emails: FetchedGmailMessage[] = await searchEmails(authClient, rule.senderEmail, rule.keywords);
      summary.scanned += emails.length;

      for (const email of emails) {
        // Idempotency check: duplicate protection
        const existing = db.prepare('SELECT id, status, calendarEventId FROM processed_emails WHERE messageId = ?').get(email.id) as any;
        if (existing) {
          summary.skipped++;
          continue;
        }

        try {
          // Extract meeting info
          const extracted: ExtractedMeetingInfo = await extractMeetingInfo(
            email.subject,
            email.body,
            rule.defaultDuration || 45,
            rule.timezone || 'UTC'
          );

          const threshold = settings.confidenceThreshold || 0.70;
          const isConfident = extracted.confidence >= threshold &&
                              Boolean(extracted.date) &&
                              Boolean(extracted.startTime) &&
                              !extracted.isAmbiguous;

          const now = new Date().toISOString();
          const recordId = uuidv4();

          if (isConfident) {
            // Automatically create Google Calendar event
            try {
              const targetCalendar = rule.calendarId || settings.defaultCalendarId || 'primary';
              const createdEvent = await createGoogleCalendarEvent(
                authClient,
                targetCalendar,
                extracted,
                { sender: email.sender, subject: email.subject, snippet: email.snippet }
              );

              db.prepare(`
                INSERT INTO processed_emails (
                  id, userId, messageId, threadId, ruleId, sender, subject,
                  snippet, body, receivedAt, status, calendarEventId,
                  calendarEventUrl, extractedData, confidence, processedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EVENT_CREATED', ?, ?, ?, ?, ?)
              `).run(
                recordId,
                userId,
                email.id,
                email.threadId,
                rule.id,
                email.sender,
                email.subject,
                email.snippet,
                email.body,
                email.receivedAt,
                createdEvent.eventId,
                createdEvent.htmlLink,
                JSON.stringify(extracted),
                extracted.confidence,
                now
              );

              summary.created++;
              logger.success(
                `Created Calendar Event "${extracted.eventTitle}" for email from ${email.sender}`,
                { eventId: createdEvent.eventId, url: createdEvent.htmlLink, date: extracted.date, time: extracted.startTime },
                userId
              );
            } catch (calErr: any) {
              logger.error(`Failed to create calendar event for email "${email.subject}": ${calErr.message}`, calErr, userId);
              
              db.prepare(`
                INSERT INTO processed_emails (
                  id, userId, messageId, threadId, ruleId, sender, subject,
                  snippet, body, receivedAt, status, extractedData,
                  confidence, errorMessage, processedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ERROR', ?, ?, ?, ?)
              `).run(
                recordId,
                userId,
                email.id,
                email.threadId,
                rule.id,
                email.sender,
                email.subject,
                email.snippet,
                email.body,
                email.receivedAt,
                JSON.stringify(extracted),
                extracted.confidence,
                `Calendar API Error: ${calErr.message}`,
                now
              );

              summary.errors++;
            }
          } else {
            // Mark as NEEDS_REVIEW
            const reason = extracted.ambiguityReason || 'Requires manual review (low confidence or missing date/time)';
            
            db.prepare(`
              INSERT INTO processed_emails (
                id, userId, messageId, threadId, ruleId, sender, subject,
                snippet, body, receivedAt, status, extractedData,
                confidence, errorMessage, processedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEEDS_REVIEW', ?, ?, ?, ?)
            `).run(
              recordId,
              userId,
              email.id,
              email.threadId,
              rule.id,
              email.sender,
              email.subject,
              email.snippet,
              email.body,
              email.receivedAt,
              JSON.stringify(extracted),
              extracted.confidence,
              reason,
              now
            );

            summary.needsReview++;
            logger.warn(
              `Email "${email.subject}" marked as Needs Review: ${reason}`,
              { sender: email.sender, confidence: extracted.confidence },
              userId
            );
          }
        } catch (procErr: any) {
          summary.errors++;
          logger.error(`Error processing email "${email.subject}": ${procErr.message}`, procErr, userId);
        }
      }
    } catch (ruleErr: any) {
      summary.errors++;
      logger.error(`Error evaluating rule for sender "${rule.senderEmail}": ${ruleErr.message}`, ruleErr, userId);
    }
  }

  // Update sync metadata
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE settings
    SET lastSyncAt = ?, lastSyncStatus = 'SUCCESS', lastSyncMessage = ?
    WHERE userId = ?
  `).run(
    now,
    `Scanned: ${summary.scanned}, Created: ${summary.created}, Needs Review: ${summary.needsReview}`,
    userId
  );

  return summary;
}

/**
 * Background polling loop
 */
let syncIntervalTimer: NodeJS.Timeout | null = null;

export function startBackgroundSync() {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
  }

  const intervalMs = Math.max(30, config.pollIntervalSeconds) * 1000;
  console.log(`[SyncService] Background sync scheduler started (interval: ${config.pollIntervalSeconds}s)`);

  syncIntervalTimer = setInterval(async () => {
    try {
      const activeUsers = db.prepare(`
        SELECT u.id, u.email
        FROM users u
        INNER JOIN settings s ON u.id = s.userId
        WHERE s.isAutomationActive = 1 AND u.accessToken IS NOT NULL AND length(u.accessToken) > 0
      `).all() as { id: string; email: string }[];

      for (const u of activeUsers) {
        try {
          await syncUserEmails(u.id, false);
        } catch (e: any) {
          console.error(`[SyncService] Background sync error for user ${u.email}:`, e.message);
        }
      }
    } catch (err: any) {
      console.error('[SyncService] Global background sync tick error:', err.message);
    }
  }, intervalMs);
}
