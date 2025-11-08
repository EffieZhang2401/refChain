import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MAGIC_SECRET_KEY: z.string().min(1),
  CORS_ORIGIN: z.string().optional(),
  POINTS_CONTRACT_ADDRESS: z.string().optional(),
  POLYGON_AMOY_RPC_URL: z.string().optional(),
  WEB3_PRIVATE_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);

export type Env = typeof env;
