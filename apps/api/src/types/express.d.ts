import type { User, Profile } from './index';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: User;
        profile: Profile;
        merchantIds: string[];
      };
      userAuth?: {
        user: User;
        profile: Profile;
      };
    }
  }
}

export {};
