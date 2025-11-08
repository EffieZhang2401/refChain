import { Magic } from '@magic-sdk/admin';
import { env } from '../env';

export const magic = new Magic(env.MAGIC_SECRET_KEY);
