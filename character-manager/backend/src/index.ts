import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import characterRoutes from './routes/characters';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Character Manager API' });
});

app.use('/api/characters', characterRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
