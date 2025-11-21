import { Router } from 'express';
import { randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import pool from '../db/pool';
import { createSession } from '../sessionStore';
import { loginSchema } from '../utils/validators';

interface LoginRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string | null;
  login_provider: string;
}

export const userAuthRouter = Router();

userAuthRouter.post('/signup', async (req, res, next) => {
  try {
    const base = loginSchema.parse(req.body);
    const displayName = (req.body?.displayName as string | undefined)?.trim() || base.email.split('@')[0];
    const userId = randomUUID();
    const profileId = randomUUID();
    await pool.query(
      `
        INSERT INTO users (id, email, password_hash, login_provider, status, created_at, updated_at)
        VALUES (?, ?, ?, 'password', 'active', NOW(), NOW())
      `,
      [userId, base.email.toLowerCase(), base.password]
    );
    await pool.query(
      `
        INSERT INTO profiles (id, user_id, display_name, locale, timezone, created_at, updated_at)
        VALUES (?, ?, ?, 'en-US', 'UTC', NOW(), NOW())
      `,
      [profileId, userId, displayName]
    );
    const token = createSession(userId);
    res.status(201).json({ token, profile: { id: profileId, displayName } });
  } catch (error) {
    next(error);
  }
});

userAuthRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const [rows] = await pool.query<LoginRow[]>(
      `SELECT id, email, password_hash, login_provider FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1`,
      [input.email]
    );
    const row = rows[0];
    if (!row || row.password_hash !== input.password) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const [[profile]] = await pool.query<
      Array<{ id: string; display_name: string } & RowDataPacket>
    >(`SELECT id, display_name FROM profiles WHERE user_id = ? LIMIT 1`, [row.id]);

    const token = createSession(row.id);
    res.json({
      token,
      profile: profile ? { id: profile.id, displayName: profile.display_name } : null
    });
  } catch (error) {
    next(error);
  }
});
