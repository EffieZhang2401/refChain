import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import pool from '../db/pool';
import { getUserIdByToken } from '../sessionStore';
import type { Profile, User } from '../types';

interface AuthRow extends RowDataPacket {
  userId: string;
  email: string;
  loginProvider: string;
  status: string;
  profileId: string;
  displayName: string;
  locale: string;
  timezone: string;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: '缺少 Authorization header' });
    }
    const token = authHeader.slice(7);
    const userId = getUserIdByToken(token);
    if (!userId) {
      return res.status(401).json({ message: '会话已失效，请重新登录' });
    }

    const [rows] = await pool.query<AuthRow[]>(
      `
        SELECT
          u.id        AS userId,
          u.email     AS email,
          u.login_provider AS loginProvider,
          u.status    AS status,
          p.id        AS profileId,
          p.display_name AS displayName,
          p.locale    AS locale,
          p.timezone  AS timezone
        FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE u.id = ?
        LIMIT 1
      `,
      [userId]
    );

    const row = rows[0];
    if (!row) {
      return res.status(401).json({ message: '用户不存在或已被删除' });
    }

    const [membershipRows] = await pool.query<Array<{ merchant_id: string } & RowDataPacket>>(
      `
        SELECT merchant_id
        FROM merchant_members
        WHERE profile_id = ? AND is_active = 1
      `,
      [row.profileId]
    );

    const merchantIds = membershipRows.map((membership) => membership.merchant_id);
    if (!merchantIds.length) {
      return res.status(403).json({ message: '该账号尚未绑定任何商户' });
    }

    const user: User = {
      id: row.userId,
      email: row.email,
      loginProvider: row.loginProvider as User['loginProvider'],
      status: row.status as User['status'],
      profileId: row.profileId,
      passwordHash: null
    };

    const profile: Profile = {
      id: row.profileId,
      userId: row.userId,
      displayName: row.displayName,
      locale: row.locale,
      timezone: row.timezone
    };

    req.auth = { user, profile, merchantIds };
    next();
  } catch (error) {
    next(error);
  }
};
