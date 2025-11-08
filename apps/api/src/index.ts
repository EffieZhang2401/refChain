import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { getDashboard } from './dataStore';

const PORT = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/dashboard', async (_req, res, next) => {
    try {
      const dashboard = await getDashboard();
      res.json(dashboard);
    } catch (error) {
      next(error);
    }
  });

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  });

  app.listen(PORT, () => {
    console.log(`Mini API running at http://localhost:${PORT}`);
  });
}

bootstrap();
