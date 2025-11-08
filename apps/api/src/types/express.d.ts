import type { Profile } from './domain';

declare global {
  namespace Express {
    interface Request {
      user?: Profile;
    }
  }
}

export {};
