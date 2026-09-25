import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { db } from '../db/database.js';
import { logger } from './logger.js';

// Required Google API Scopes: minimal required permissions
export const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
];

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );
}

export function getAuthorizationUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh_token
    prompt: 'consent',     // Forces consent prompt so refresh_token is guaranteed
    scope: GOOGLE_SCOPES,
    state: state || ''
  });
}

export interface UserSessionData {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export async function handleOAuthCallback(code: string): Promise<UserSessionData> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Fetch user info from Google
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfoRes = await oauth2.userinfo.get();
  const userInfo = userInfoRes.data;

  if (!userInfo.id || !userInfo.email) {
    throw new Error('Google OAuth failed to return user ID or email');
  }

  const now = new Date().toISOString();
  const tokenExpiry = tokens.expiry_date || (Date.now() + 3600 * 1000);

  // Upsert user in database
  const existingUser = db.prepare('SELECT id, refreshToken FROM users WHERE id = ?').get(userInfo.id) as { id: string; refreshToken?: string } | undefined;

  // Preserve previous refresh token if Google didn't return a new one on re-auth
  const refreshTokenToSave = tokens.refresh_token || existingUser?.refreshToken || null;

  if (existingUser) {
    db.prepare(`
      UPDATE users
      SET email = ?, name = ?, picture = ?, accessToken = ?, refreshToken = ?, tokenExpiry = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      userInfo.email,
      userInfo.name || '',
      userInfo.picture || '',
      tokens.access_token,
      refreshTokenToSave,
      tokenExpiry,
      now,
      userInfo.id
    );
  } else {
    db.prepare(`
      INSERT INTO users (id, email, name, picture, accessToken, refreshToken, tokenExpiry, connectedAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userInfo.id,
      userInfo.email,
      userInfo.name || '',
      userInfo.picture || '',
      tokens.access_token,
      refreshTokenToSave,
      tokenExpiry,
      now,
      now
    );

    // Create default settings for user
    db.prepare(`
      INSERT OR IGNORE INTO settings (userId, isAutomationActive, pollIntervalSeconds, defaultCalendarId, defaultTimezone, confidenceThreshold)
      VALUES (?, 1, ?, 'primary', 'Asia/Kolkata', 0.70)
    `).run(userInfo.id, config.pollIntervalSeconds);
  }

  // Migrate seeded placeholder rules to authenticated user ID
  if (userInfo.id !== 'user_sriramnbv26') {
    db.prepare(`UPDATE rules SET userId = ? WHERE userId = 'user_sriramnbv26'`).run(userInfo.id);
    db.prepare(`UPDATE settings SET userId = ? WHERE userId = 'user_sriramnbv26'`).run(userInfo.id);
    db.prepare(`DELETE FROM users WHERE id = 'user_sriramnbv26'`).run();
  }

  // Ensure default rules exist for this user if missing
  const defaultSenders = ['updates@topin.tech', 'academy-placements@nxtwave.in'];
  for (const sender of defaultSenders) {
    const existing = db.prepare('SELECT id FROM rules WHERE userId = ? AND senderEmail = ?').get(userInfo.id, sender);
    if (!existing) {
      db.prepare(`
        INSERT INTO rules (id, userId, senderEmail, keywords, calendarId, defaultDuration, timezone, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, '', 'primary', 45, 'Asia/Kolkata', 1, ?, ?)
      `).run(`rule_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, userInfo.id, sender, now, now);
    }
  }

  logger.success(`Google account connected: ${userInfo.email}`, null, userInfo.id);

  return {
    id: userInfo.id,
    email: userInfo.email,
    name: userInfo.name || '',
    picture: userInfo.picture || ''
  };
}

export async function getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user || !user.accessToken || user.accessToken.trim().length === 0) {
    throw new Error('Google account is not connected. Please click "Sign in with Google" to authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
    expiry_date: user.tokenExpiry
  });

  // Check if token is expired or expiring within 5 minutes (300,000 ms)
  const isExpiringSoon = !user.tokenExpiry || (user.tokenExpiry - Date.now() < 300000);

  if (isExpiringSoon && user.refreshToken) {
    try {
      logger.info(`Refreshing Google OAuth token for user: ${user.email}`, null, userId);
      const refreshResponse = await oauth2Client.refreshAccessToken();
      const newTokens = refreshResponse.credentials;
      
      const newExpiry = newTokens.expiry_date || (Date.now() + 3600 * 1000);
      const newAccessToken = newTokens.access_token || user.accessToken;
      const newRefreshToken = newTokens.refresh_token || user.refreshToken;

      db.prepare(`
        UPDATE users
        SET accessToken = ?, refreshToken = ?, tokenExpiry = ?, updatedAt = ?
        WHERE id = ?
      `).run(newAccessToken, newRefreshToken, newExpiry, new Date().toISOString(), userId);

      oauth2Client.setCredentials(newTokens);
    } catch (refreshErr) {
      logger.error(`Failed to refresh Google OAuth token for user ${user.email}`, refreshErr, userId);
      throw new Error('Google OAuth token refresh failed. Please reconnect your Google account.');
    }
  }

  return oauth2Client;
}

export async function disconnectUser(userId: string): Promise<void> {
  try {
    const user = db.prepare('SELECT accessToken, refreshToken, email FROM users WHERE id = ?').get(userId) as any;
    if (user && user.accessToken) {
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials({ access_token: user.accessToken });
      try {
        await oauth2Client.revokeCredentials();
      } catch (e) {
        // Token revocation might fail if already invalid, safe to proceed
      }
    }
    
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    db.prepare('DELETE FROM settings WHERE userId = ?').run(userId);
    logger.info(`Google account disconnected and tokens removed: ${user?.email || userId}`, null, userId);
  } catch (err) {
    logger.error('Error during user disconnect', err, userId);
    throw err;
  }
}
