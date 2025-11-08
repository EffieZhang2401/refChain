import type { RequestHandler } from 'express';
import { magic } from '../lib/magicAdmin';
import { AppError } from '../utils/appError';
import { getOrCreateProfileFromMagic } from '../modules/profiles/profile.service';

const TOKEN_HEADER = 'x-magic-token';

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const headerToken = req.headers[TOKEN_HEADER];
  const rawToken = typeof headerToken === 'string' ? headerToken : Array.isArray(headerToken) ? headerToken[0] : undefined;

  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const didToken = rawToken ?? bearerToken;

  if (!didToken) {
    throw new AppError('Missing Magic DID token', 401);
  }

  await magic.token.validate(didToken);
  const metadata = await magic.users.getMetadataByToken(didToken);
  if (!metadata.email) {
    throw new AppError('Magic user metadata missing email', 400);
  }

  const profile = await getOrCreateProfileFromMagic(metadata);
  req.user = profile;
  next();
};
