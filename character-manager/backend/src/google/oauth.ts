import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

/**
 * Per-user Google OAuth, metadata-only.
 *
 * Each staff member connects their own Google account; the app asks for
 * drive.metadata.readonly and nothing else, so it can list names and
 * modified times of files in folders the user can see, and can never read
 * a document's contents. Configuration is two env vars; without them every
 * Google feature reports itself unconfigured rather than broken.
 *
 * Refresh tokens are the one durable secret this feature stores. They are
 * encrypted at rest with a key derived from the client secret, so a copy
 * of the database alone cannot mint Drive access; it would also take the
 * deployment's environment.
 */

const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly openid email';

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Dev-only pretend mode: no Google, fixture data. Never in production. */
export function googleFake(): boolean {
  return process.env.GOOGLE_FAKE === '1' && process.env.NODE_ENV !== 'production';
}

function clientId(): string {
  return process.env.GOOGLE_CLIENT_ID ?? '';
}

function clientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? '';
}

/* ---------------- state token ----------------
 * Binds the OAuth round trip to the signed-in user, so a callback URL
 * pasted into someone else's browser attaches nothing. */

function stateKey(): Buffer {
  return createHash('sha256').update(`state:${clientSecret()}`).digest();
}

export function signState(userId: string): string {
  const body = `${userId}.${Date.now() + 10 * 60 * 1000}.${randomBytes(8).toString('hex')}`;
  const mac = createHmac('sha256', stateKey()).update(body).digest('hex');
  return Buffer.from(`${body}.${mac}`).toString('base64url');
}

export function verifyState(state: string, userId: string): boolean {
  try {
    const raw = Buffer.from(state, 'base64url').toString();
    const at = raw.lastIndexOf('.');
    const body = raw.slice(0, at);
    const mac = raw.slice(at + 1);
    const expect = createHmac('sha256', stateKey()).update(body).digest('hex');
    if (mac !== expect) return false;
    const [uid, expiry] = body.split('.');
    return uid === userId && Number(expiry) > Date.now();
  } catch {
    return false;
  }
}

/* ---------------- token encryption ---------------- */

function encKey(): Buffer {
  return createHash('sha256').update(`tokens:${clientSecret()}`).digest();
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString('base64url')).join('.');
}

export function decryptToken(stored: string): string {
  const [iv, tag, body] = stored.split('.').map((p) => Buffer.from(p, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

/* ---------------- the OAuth round trip ---------------- */

export function authUrl(redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    // Without this a returning user gets no refresh token the second time.
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export interface TokenGrant {
  refreshToken: string;
  accessToken: string;
  email: string;
}

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<TokenGrant | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
  };
  if (!data.access_token || !data.refresh_token) return null;

  // The id_token's payload carries the email; it arrived over TLS from
  // Google moments ago, so decoding without re-verification is sound here.
  let email = '';
  try {
    const payload = JSON.parse(
      Buffer.from((data.id_token ?? '').split('.')[1], 'base64url').toString()
    ) as { email?: string };
    email = payload.email ?? '';
  } catch {
    /* Email is a display nicety; the grant works without it. */
  }
  return { refreshToken: data.refresh_token, accessToken: data.access_token, email };
}

export async function accessTokenFor(encryptedRefresh: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: decryptToken(encryptedRefresh),
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/** Best-effort: tell Google the grant is over. Failure changes nothing here. */
export async function revokeToken(encryptedRefresh: string): Promise<void> {
  try {
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: decryptToken(encryptedRefresh) }),
    });
  } catch {
    /* The row is deleted either way; Google expires orphans on its own. */
  }
}
