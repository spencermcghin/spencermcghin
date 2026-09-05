import type { Request, Response } from 'express';
import { getStore, seedUserSpace } from '../db';
import {
  checkPasswordStrength,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
} from '../auth/credentials';
import { SESSION_COOKIE, SESSION_TTL_MS, sessionCookieOptions } from '../auth/middleware';

/**
 * A throwaway hash with a known-wrong password, compared against when no user
 * matches so that a missing account and a wrong password take similar time.
 * Without it, response latency reveals which addresses are registered.
 */
const DUMMY_HASH_PROMISE = hashPassword('not-a-real-password-placeholder');

/**
 * Per-process login throttle. Enough to make online guessing impractical;
 * it is not a substitute for a shared limiter if this ever runs multi-instance.
 */
const attempts = new Map<string, { count: number; firstAt: number }>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function throttled(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function clearThrottle(key: string): void {
  attempts.delete(key);
}

async function startSession(res: Response, userId: string): Promise<void> {
  const { token, tokenHash } = createSessionToken();
  await getStore().createSession(tokenHash, userId, new Date(Date.now() + SESSION_TTL_MS));
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function register(req: Request, res: Response) {
  const store = getStore();
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const password = String(req.body?.password ?? '');
  const displayName = String(req.body?.displayName ?? '').trim() || email.split('@')[0];

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  const weak = checkPasswordStrength(password);
  if (weak) return res.status(400).json({ message: weak.message });

  if (await store.findUserByEmail(email)) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const user = await store.createUser({
    email,
    displayName,
    passwordHash: await hashPassword(password),
  });

  // A new space starts with a private copy of Eldritch so the app opens on
  // something real rather than an empty list.
  await seedUserSpace(store, user.id);
  await startSession(res, user.id);

  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const store = getStore();
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const password = String(req.body?.password ?? '');

  const key = `${req.ip ?? 'unknown'}:${email}`;
  if (throttled(key)) {
    return res
      .status(429)
      .json({ message: 'Too many attempts. Try again in a few minutes.' });
  }

  const record = await store.findUserByEmail(email);

  // Always run a verification so timing does not distinguish the two failures,
  // and report the same message either way.
  const ok = record
    ? await verifyPassword(password, record.passwordHash)
    : (await verifyPassword(password, await DUMMY_HASH_PROMISE), false);

  if (!record || !ok) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  clearThrottle(key);
  await startSession(res, record.id);

  const { passwordHash: _omit, ...user } = record;
  res.json({ user });
}

export async function logout(req: Request, res: Response) {
  if (req.sessionToken) {
    await getStore().deleteSession(hashSessionToken(req.sessionToken));
  }
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  res.json({ user: req.user });
}
