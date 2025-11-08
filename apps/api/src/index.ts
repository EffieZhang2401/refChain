import 'dotenv/config';
import { env } from './env';
import { createServer } from './server';

const app = createServer();

app.listen(env.PORT, () => {
  console.log(`RefChain API listening on http://localhost:${env.PORT}`);
});
