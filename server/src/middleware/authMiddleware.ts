import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/database.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check cookie or Authorization header
  let token = req.cookies?.auth_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      if (decoded && decoded.id) {
        const user = db.prepare('SELECT id, email, name, picture FROM users WHERE id = ?').get(decoded.id) as any;
        if (user) {
          req.userId = user.id;
          req.user = user;
          return next();
        }
      }
    } catch {
      // Invalid or expired token
    }
  }

  // Fallback for single-user local app: if exactly one user is logged in, attach that user
  const singleUser = db.prepare('SELECT id, email, name, picture FROM users LIMIT 1').get() as any;
  if (singleUser) {
    req.userId = singleUser.id;
    req.user = singleUser;
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Please connect your Google Account first.'
  });
}
