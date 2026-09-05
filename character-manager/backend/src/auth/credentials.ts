import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Password hashing on scrypt from node:crypto.
 *
 * scrypt is memory-hard and built in, so there is no native module to fail to
 * compile on a deploy host and no dependency to keep patched.
 *
 * Stored as `scrypt$<salt hex>$<hash hex>`; the algorithm tag leaves room to
 * migrate later without guessing at what an existing row contains.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);

  // Lengths must match before timingSafeEqual, which throws otherwise.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * Session tokens are 256 bits of randomness. The cookie carries the raw token;
 * the database stores only its SHA-256, so a leaked table does not hand an
 * attacker usable sessions. The token has no structure to forge, so it needs
 * no signing secret.
 */
export function createSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashSessionToken(token) };
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface PasswordProblem {
  message: string;
}

/** Deliberately minimal: length is the requirement that actually helps. */
export function checkPasswordStrength(password: string): PasswordProblem | null {
  if (password.length < 10) {
    return { message: 'Password must be at least 10 characters.' };
  }
  if (password.length > 200) {
    return { message: 'Password must be at most 200 characters.' };
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
