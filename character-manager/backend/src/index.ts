import fs from 'fs';
import path from 'path';
import express, { Express, NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { attachUser } from './auth/middleware';
import { initStore } from './db';
import authRoutes from './routes/auth';
import characterRoutes from './routes/characters';
import rulesetRoutes from './routes/rulesets';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Sessions ride on a cookie, so cross-origin requests must be explicitly
// allowed and must send credentials. Same-origin deploys need neither.
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(allowedOrigin ? { origin: allowedOrigin, credentials: true } : undefined)
);

// Trust the platform proxy so req.ip is the client address rather than the
// load balancer's -- the login throttle keys on it.
app.set('trust proxy', 1);

app.use(cookieParser());
// Rulesets are whole documents; the default 100kb limit is too small for a
// ruleset the size of a published game.
app.use(express.json({ limit: '8mb' }));

app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Character Manager API', version: 2 });
});

app.use('/api', attachUser);
app.use('/api/auth', authRoutes);
app.use('/api/rulesets', rulesetRoutes);
app.use('/api/characters', characterRoutes);

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
  const candidates = [
    process.env.FRONTEND_DIST,
    // Compiled: <backend>/dist/backend/src/index.js
    path.resolve(__dirname, '../../../../frontend/dist'),
    // ts-node: <backend>/src/index.ts
    path.resolve(__dirname, '../../frontend/dist'),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

const frontendDist = findFrontendBuild();

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
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise store:', err);
    process.exit(1);
  });
