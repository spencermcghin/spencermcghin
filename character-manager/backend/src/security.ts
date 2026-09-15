import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Transport and content security headers.
 *
 * TLS itself terminates at the platform edge (Railway); what the app owes on
 * top is telling browsers to insist on it (HSTS), refusing to be framed or
 * sniffed, and a Content-Security-Policy so an injected script has nowhere
 * to run.
 */

/**
 * Builds the CSP once at boot.
 *
 * The frontend carries one legitimate inline script (the theme restore in
 * index.html, which must run before paint). Rather than allowing all inline
 * scripts or hardcoding a hash that breaks the moment someone edits the
 * script, this reads the served index.html and hashes whatever inline
 * scripts it actually contains.
 */
export function buildCsp(frontendDist: string | null): string {
  const scriptSources = ["'self'"];

  if (frontendDist) {
    try {
      const html = fs.readFileSync(path.join(frontendDist, 'index.html'), 'utf8');
      const inline = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
      for (const match of html.matchAll(inline)) {
        const body = match[1];
        if (body.trim()) {
          const hash = createHash('sha256').update(body).digest('base64');
          scriptSources.push(`'sha256-${hash}'`);
        }
      }
    } catch (err) {
      console.warn('CSP: could not read index.html for script hashes:', err);
    }
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    // Inline style attributes are used in a handful of components; allowing
    // them is the standard trade for not rewriting every one as a class.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function securityHeaders(csp: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // HSTS only ever goes out over HTTPS; sending it on plain HTTP is
    // ignored by browsers and misleading in local development.
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', csp);
    next();
  };
}

/**
 * Belt and braces behind the platform edge: if a plain-HTTP request does
 * arrive through the proxy in production, send it to the HTTPS address
 * before it carries a session cookie any further.
 */
export function httpsRedirect(req: Request, res: Response, next: NextFunction) {
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers['x-forwarded-proto'] === 'http'
  ) {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
}
