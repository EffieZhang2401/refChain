import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './env';
import { routes } from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createServer() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((v) => v.trim()) : true,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', routes);
  app.use(errorHandler);

  return app;
}
