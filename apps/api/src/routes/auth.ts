import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';
import pool from '../db/pool';
import { createSession } from '../sessionStore';
import { loginSchema } from '../utils/validators';
import { requireAuth } from '../middleware/requireAuth';
import type { Merchant } from '../types';
import { buildInClause } from '../utils/sql';

interface LoginRow extends RowDataPacket {
  userId: string;
  email: string;
  passwordHash: string | null;
  loginProvider: string;
  status: string;
  profileId: string;
  displayName: string;
}

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const [rows] = await pool.query<LoginRow[]>(
      `
        SELECT
          u.id AS userId,
          u.email AS email,
          u.password_hash AS passwordHash,
          u.login_provider AS loginProvider,
          u.status AS status,
          p.id AS profileId,
          p.display_name AS displayName
        FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE LOWER(u.email) = LOWER(?) LIMIT 1
      `,
      [email]
    );

    const userRow = rows[0];
    if (!userRow || !userRow.passwordHash || userRow.passwordHash !== password) {
      res.status(401).json({ message: '账号或密码错误' });
      return;
    }

    const [memberRows] = await pool.query<Array<{ merchant_id: string } & RowDataPacket>>(
      `
        SELECT merchant_id
        FROM merchant_members
        WHERE profile_id = ? AND is_active = 1
      `,
      [userRow.profileId]
    );

    const merchantIds = memberRows.map((m) => m.merchant_id);

    let merchants: Merchant[] = [];
    if (merchantIds.length) {
      const { clause, params } = buildInClause(merchantIds);
      const [merchantRows] = await pool.query<Array<Merchant & RowDataPacket>>(
        `
          SELECT
            id,
            owner_profile_id AS ownerProfileId,
            name,
            slug,
            industry,
            support_email AS supportEmail,
            cashback_percentage AS cashbackPercentage,
            referral_reward_percentage AS referralRewardPercentage,
            status,
            metadata,
            created_at AS createdAt
          FROM merchants
          WHERE id IN ${clause}
        `,
        params
      );
      merchants = merchantRows;
    }

    const token = createSession(userRow.userId ?? randomUUID());
    res.json({
      token,
      profile: {
        id: userRow.profileId,
        displayName: userRow.displayName
      },
      merchants
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.auth!.user,
    profile: req.auth!.profile,
    merchantIds: req.auth!.merchantIds
  });
});
