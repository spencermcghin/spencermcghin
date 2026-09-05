import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initStore } from './db';
import characterRoutes from './routes/characters';
import rulesetRoutes from './routes/rulesets';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
// Rulesets are whole documents; the default 100kb limit is too small for a
// ruleset the size of a published game.
app.use(express.json({ limit: '8mb' }));

app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Character Manager API', version: 2 });
});

app.use('/api/rulesets', rulesetRoutes);
app.use('/api/characters', characterRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' });
});

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
