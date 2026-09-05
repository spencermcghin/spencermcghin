import type { NextFunction, Request, Response } from 'express';
import { getStore, type User } from '../db';
import { hashSessionToken } from './credentials';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

export const SESSION_COOKIE = 'session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // 'lax' lets the cookie ride normal navigation while blocking it on
    // cross-site POSTs, which covers CSRF for a same-origin app without a
    // separate token.
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

/** Populates req.user when the request carries a valid session. Never rejects. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token.length > 0) {
    try {
      const user = await getStore().findSessionUser(hashSessionToken(token));
      if (user) {
        req.user = user;
        req.sessionToken = token;
      }
    } catch (err) {
      // A store failure must not be mistaken for a valid session.
      console.error('Session lookup failed:', err);
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  next();
}
