import fs from 'fs';
import path from 'path';
import express, { Express, NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { attachUser } from './auth/middleware';
import { initStore } from './db';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import characterRoutes from './routes/characters';
import inviteRoutes from './routes/invites';
import rulesetRoutes from './routes/rulesets';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Sessions ride on a cookie, so a split deploy must name the exact frontend
// origin: a credentialed request refuses a wildcard Access-Control-Allow-Origin.
// Same-origin deploys need no CORS configuration at all.
const allowedOrigin = process.env.CORS_ORIGIN;
const frontendDist = findFrontendBuild();

if (allowedOrigin) {
  // Split deploy: name the exact frontend origin. A credentialed request
  // refuses a wildcard Access-Control-Allow-Origin.
  app.use(cors({ origin: allowedOrigin, credentials: true }));
} else if (!frontendDist) {
  // API-only and unconfigured. Permissive CORS is a development convenience;
  // it grants nothing, since every endpoint needs a session cookie that a
  // wildcard response can never carry.
  app.use(cors());
}
// Otherwise this process serves both halves from one origin, so the browser
// never performs a CORS check and no headers are needed.

const corsMode = allowedOrigin
  ? `allow:${allowedOrigin}`
  : frontendDist
    ? 'same-origin'
    : 'wildcard';

// Trust the platform proxy so req.ip is the client address rather than the
// load balancer's -- the login throttle keys on it.
app.set('trust proxy', 1);

app.use(cookieParser());
// Rulesets are whole documents; the default 100kb limit is too small for a
// ruleset the size of a published game.
app.use(express.json({ limit: '8mb' }));

app.get('/api', (_req: Request, res: Response) => {
  // corsMode is reported so a misconfigured deploy can be diagnosed by
  // opening this URL, rather than by reading response headers. It exposes no
  // secret -- a wildcard is already visible in Access-Control-Allow-Origin.
  res.json({
    message: 'Character Manager API',
    version: 2,
    corsMode,
    servesFrontend: Boolean(frontendDist),
    // Same-origin deploys need no cross-origin sign-in, so this being false
    // alongside corsMode 'same-origin' is the healthy arrangement.
    signInWorksCrossOrigin: Boolean(allowedOrigin),
  });
});

app.use('/api', attachUser);
app.use('/api/auth', authRoutes);
app.use('/api/rulesets', rulesetRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/admin', adminRoutes);

// Unmatched API routes are errors, never the SPA shell -- returning HTML to a
// fetch that expected JSON produces a confusing parse failure at the client.
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' });
});

/**
 * Locates a built frontend, if one was deployed alongside the API.
 *
 * Single-service deploys (Railway) build the frontend into the same image and
 * serve it from here. Split deploys (Render static site + web service) simply
 * will not find a build, and the API runs on its own.
 */
function findFrontendBuild(): string | null {
  // An explicitly configured path is authoritative. Falling back from a bad
  // FRONTEND_DIST would hide the misconfiguration behind a build that happens
  // to be lying around.
  if (process.env.FRONTEND_DIST) {
    const dir = process.env.FRONTEND_DIST;
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
    console.warn(`FRONTEND_DIST is set to ${dir}, which has no index.html.`);
    return null;
  }

  const candidates = [
    // Compiled: <backend>/dist/backend/src/index.js
    path.resolve(__dirname, '../../../../frontend/dist'),
    // ts-node: <backend>/src/index.ts
    path.resolve(__dirname, '../../frontend/dist'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

if (frontendDist) {
  app.use(express.static(frontendDist));
  // Client-side routing: any unmatched GET resolves to the SPA shell. Written
  // as a catch-all middleware rather than app.get('*') because Express 5
  // rejects a bare wildcard -- its path-to-regexp requires a named parameter.
  app.use((req: Request, res: Response) => {
    if (req.method !== 'GET') {
      return res.status(404).json({ message: 'Not found' });
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log(`Serving frontend from ${frontendDist}`);
} else {
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found' });
  });
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

initStore()
  .then(() => {
    app.listen(port, () => {
      if (allowedOrigin) {
        console.log(
          `CORS: credentialed requests allowed from ${allowedOrigin} ` +
            '(session cookie is SameSite=None; Secure)'
        );
      } else if (frontendDist) {
        console.log(
          'CORS: not needed -- frontend and API share one origin ' +
            '(session cookie keeps SameSite=Lax)'
        );
      } else {
        // No frontend to serve and no origin allowed: any browser client is
        // necessarily on another origin and will be refused. Worth saying so
        // out loud rather than leaving it to be discovered in a console.
        console.warn(
          'CORS: no CORS_ORIGIN set and no frontend build found. A browser on ' +
            'another origin cannot sign in -- set CORS_ORIGIN to its URL.'
        );
      }
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise store:', err);
    process.exit(1);
  });
