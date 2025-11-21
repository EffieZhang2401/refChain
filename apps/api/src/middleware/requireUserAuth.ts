import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import pool from '../db/pool';
import { getUserIdByToken } from '../sessionStore';
import type { User, Profile } from '../types';

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string | null;
  wallet_address: string | null;
  login_provider: string;
  status: string;
  profileId: string;
  displayName: string;
}

export const requireUserAuth: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing Authorization header' });
    }
    const token = authHeader.slice(7);
    const userId = getUserIdByToken(token);
    if (!userId) {
      return res.status(401).json({ message: 'Session expired, please sign in again' });
    }

    const [rows] = await pool.query<UserRow[]>(
      `
        SELECT
          u.id,
          u.email,
          u.password_hash,
          u.wallet_address,
          u.login_provider,
          u.status,
          p.id AS profileId,
          p.display_name AS displayName
        FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE u.id = ?
        LIMIT 1
      `,
      [userId]
    );

    const row = rows[0];
    if (!row) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user: User = {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      walletAddress: row.wallet_address ?? undefined,
      loginProvider: row.login_provider as User['loginProvider'],
      status: row.status as User['status'],
      profileId: row.profileId
    };

    const profile: Profile = {
      id: row.profileId,
      userId: row.id,
      displayName: row.displayName,
      locale: 'en-US',
      timezone: 'UTC'
    };

    (req as any).userAuth = { user, profile };
    next();
  } catch (error) {
    next(error);
  }
};
