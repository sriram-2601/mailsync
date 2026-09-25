import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  userId?: string | null;
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string | null;
}

export const logger = {
  log(level: LogLevel, message: string, details?: any, userId?: string | null) {
    const timestamp = new Date().toISOString();
    const id = uuidv4();
    const formattedDetails = details 
      ? (typeof details === 'string' ? details : JSON.stringify(details, null, 2))
      : null;

    try {
      const stmt = db.prepare(`
        INSERT INTO activity_logs (id, userId, timestamp, level, message, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, userId || null, timestamp, level, message, formattedDetails);
    } catch (err) {
      console.error('[Logger] Failed to write log to database:', err);
    }

    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (level === 'error') {
      console.error(prefix, message, details || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, details || '');
    } else {
      console.log(prefix, message, details || '');
    }
  },

  info(message: string, details?: any, userId?: string | null) {
    this.log('info', message, details, userId);
  },

  warn(message: string, details?: any, userId?: string | null) {
    this.log('warn', message, details, userId);
  },

  error(message: string, details?: any, userId?: string | null) {
    this.log('error', message, details, userId);
  },

  success(message: string, details?: any, userId?: string | null) {
    this.log('success', message, details, userId);
  }
};
