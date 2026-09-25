import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      picture TEXT,
      accessToken TEXT NOT NULL,
      refreshToken TEXT,
      tokenExpiry INTEGER,
      connectedAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      userId TEXT PRIMARY KEY,
      isAutomationActive INTEGER NOT NULL DEFAULT 1,
      pollIntervalSeconds INTEGER NOT NULL DEFAULT 120,
      defaultCalendarId TEXT NOT NULL DEFAULT 'primary',
      defaultTimezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      confidenceThreshold REAL NOT NULL DEFAULT 0.70,
      lastSyncAt TEXT,
      lastSyncStatus TEXT,
      lastSyncMessage TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Rules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      senderEmail TEXT NOT NULL,
      keywords TEXT,
      calendarId TEXT NOT NULL DEFAULT 'primary',
      defaultDuration INTEGER NOT NULL DEFAULT 45,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Processed emails table (Idempotency and duplicate protection)
  db.exec(`
    CREATE TABLE IF NOT EXISTS processed_emails (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      messageId TEXT NOT NULL UNIQUE,
      threadId TEXT,
      ruleId TEXT,
      sender TEXT NOT NULL,
      subject TEXT,
      snippet TEXT,
      body TEXT,
      receivedAt TEXT,
      status TEXT NOT NULL, -- 'EVENT_CREATED', 'NEEDS_REVIEW', 'IGNORED', 'ERROR'
      calendarEventId TEXT,
      calendarEventUrl TEXT,
      extractedData TEXT, -- JSON string
      confidence REAL,
      errorMessage TEXT,
      processedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_processed_emails_messageId ON processed_emails(messageId);
    CREATE INDEX IF NOT EXISTS idx_processed_emails_userId ON processed_emails(userId);
    CREATE INDEX IF NOT EXISTS idx_processed_emails_status ON processed_emails(status);
  `);

  // Activity logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL, -- 'info', 'warn', 'error', 'success'
      message TEXT NOT NULL,
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
  `);

  seedInitialData();

  console.log('[Database] SQLite database initialized successfully at', config.dbPath);
}

/**
 * Seed initial user and target sender rules:
 * - User: sriramnbv26@gmail.com
 * - Senders: updates@topin.tech, academy-placements@nxtwave.in
 */
export function seedInitialData() {
  const targetEmail = 'sriramnbv26@gmail.com';
  const targetUserId = 'user_sriramnbv26';
  const now = new Date().toISOString();

  // 1. Ensure user record exists
  const existingUser = db.prepare('SELECT id, email FROM users WHERE email = ?').get(targetEmail) as any;
  const userIdToUse = existingUser ? existingUser.id : targetUserId;

  if (!existingUser) {
    db.prepare(`
      INSERT INTO users (id, email, name, picture, accessToken, refreshToken, tokenExpiry, connectedAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      targetUserId,
      targetEmail,
      'Sriram',
      '',
      '', // will be filled once user completes Google OAuth
      null,
      0,
      now,
      now
    );
  }

  // 2. Ensure default settings exist
  db.prepare(`
    INSERT OR IGNORE INTO settings (userId, isAutomationActive, pollIntervalSeconds, defaultCalendarId, defaultTimezone, confidenceThreshold)
    VALUES (?, 1, ?, 'primary', 'Asia/Kolkata', 0.70)
  `).run(userIdToUse, config.pollIntervalSeconds);

  // 3. Ensure the requested sender rules exist
  const defaultRules = [
    {
      id: 'rule_topin_tech',
      senderEmail: 'updates@topin.tech',
      keywords: '',
      calendarId: 'primary',
      defaultDuration: 45,
      timezone: 'Asia/Kolkata'
    },
    {
      id: 'rule_nxtwave_placements',
      senderEmail: 'academy-placements@nxtwave.in',
      keywords: '',
      calendarId: 'primary',
      defaultDuration: 45,
      timezone: 'Asia/Kolkata'
    }
  ];

  for (const rule of defaultRules) {
    const existingRule = db.prepare('SELECT id FROM rules WHERE senderEmail = ?').get(rule.senderEmail);
    if (!existingRule) {
      db.prepare(`
        INSERT INTO rules (id, userId, senderEmail, keywords, calendarId, defaultDuration, timezone, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        rule.id,
        userIdToUse,
        rule.senderEmail,
        rule.keywords,
        rule.calendarId,
        rule.defaultDuration,
        rule.timezone,
        now,
        now
      );
      console.log(`[Database] Pre-configured monitoring rule for sender: ${rule.senderEmail}`);
    }
  }
}
