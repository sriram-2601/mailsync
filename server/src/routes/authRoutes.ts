import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getAuthorizationUrl, handleOAuthCallback, disconnectUser } from '../services/googleAuth.js';
import { db } from '../db/database.js';
import { logger } from '../services/logger.js';

export const authRouter = Router();

// Check system configuration and current user connection status
authRouter.get('/status', (req: Request, res: Response) => {
  const isGoogleConfigured = config.isGoogleConfigured();
  
  // Find current active user
  let token = req.cookies?.auth_token;
  let currentUser = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      if (decoded?.id) {
        currentUser = db.prepare('SELECT id, email, name, picture, connectedAt, accessToken FROM users WHERE id = ?').get(decoded.id) as any;
      }
    } catch {
      currentUser = null;
    }
  }

  // If no cookie, check user in DB
  if (!currentUser) {
    currentUser = db.prepare('SELECT id, email, name, picture, connectedAt, accessToken FROM users LIMIT 1').get() as any;
  }

  const isConnected = Boolean(currentUser && currentUser.accessToken && currentUser.accessToken.trim().length > 0);

  return res.json({
    isGoogleConfigured,
    isConnected,
    user: currentUser ? {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      picture: currentUser.picture,
      connectedAt: currentUser.connectedAt
    } : null,
    hasGeminiKey: Boolean(config.geminiApiKey)
  });
});

// Get Google OAuth Redirect URL
authRouter.get('/google', (req: Request, res: Response) => {
  if (!config.isGoogleConfigured()) {
    return res.status(400).json({
      error: 'Google OAuth not configured',
      message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env'
    });
  }

  try {
    const url = getAuthorizationUrl();
    return res.json({ url });
  } catch (err: any) {
    logger.error('Failed to generate OAuth URL', err);
    return res.status(500).json({ error: 'Failed to generate OAuth URL', message: err.message });
  }
});

// OAuth Callback
authRouter.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    logger.error(`Google OAuth returned error: ${error}`);
    return res.redirect(`${config.clientUrl}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${config.clientUrl}?error=missing_code`);
  }

  try {
    const user = await handleOAuthCallback(code);

    // Issue JWT cookie
    const token = jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: '30d'
    });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return res.redirect(`${config.clientUrl}?auth=success`);
  } catch (err: any) {
    logger.error('Error handling Google OAuth callback', err);
    return res.redirect(`${config.clientUrl}?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
});

// Disconnect / Revoke Account
authRouter.post('/disconnect', async (req: Request, res: Response) => {
  const singleUser = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined;
  const userId = (req as any).userId || singleUser?.id;

  if (!userId) {
    return res.status(400).json({ error: 'No connected account to disconnect' });
  }

  try {
    await disconnectUser(userId);
    res.clearCookie('auth_token');
    return res.json({ success: true, message: 'Account disconnected successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to disconnect account', message: err.message });
  }
});

// Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('auth_token');
  return res.json({ success: true, message: 'Logged out successfully' });
});
