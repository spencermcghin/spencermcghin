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

/**
 * CORS_ORIGIN is only set when the frontend is served from a different origin
 * than the API -- a split deploy. That single fact decides how the session
 * cookie has to be scoped.
 */
function isCrossOriginDeploy(): boolean {
  return Boolean(process.env.CORS_ORIGIN);
}

export function sessionCookieOptions() {
  // Same-origin: 'lax' lets the cookie ride normal navigation while blocking
  // it on cross-site POSTs, which covers CSRF without a separate token.
  //
  // Split deploy: the browser treats every API call as cross-site and will
  // not attach a 'lax' cookie at all, so the session silently never arrives.
  // 'none' is the only value that works, and browsers require Secure with it.
  // That does drop the SameSite protection, which is part of why serving both
  // halves from one origin is the better arrangement.
  const crossOrigin = isCrossOriginDeploy();

  return {
    httpOnly: true,
    sameSite: crossOrigin ? ('none' as const) : ('lax' as const),
    secure: crossOrigin || process.env.NODE_ENV === 'production',
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
