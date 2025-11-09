import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiRouter } from './routes';

const PORT = Number(process.env.PORT ?? 4000);

const app = express();

app.use(
  cors({
    origin: '*'
  })
);
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(400).json({ message: err.message || 'Bad request' });
});

app.listen(PORT, () => {
  console.log(`RefChain API listening on http://localhost:${PORT}`);
});
