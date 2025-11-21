import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import pool from '../db/pool';
import { requireUserAuth } from '../middleware/requireUserAuth';

export const userRouter = Router();

userRouter.post('/wallet', requireUserAuth, async (req, res, next) => {
  try {
    const { walletAddress } = req.body as { walletAddress?: string };
    if (!walletAddress) {
      res.status(400).json({ message: 'walletAddress is required' });
      return;
    }
    await pool.query(`UPDATE users SET wallet_address = ?, updated_at = NOW() WHERE id = ?`, [
      walletAddress.toLowerCase(),
      (req as any).userAuth.user.id
    ]);
    res.json({ walletAddress: walletAddress.toLowerCase() });
  } catch (error) {
    next(error);
  }
});

userRouter.get('/points', requireUserAuth, async (req, res, next) => {
  try {
    const profileId = (req as any).userAuth.profile.id;
    const [rows] = await pool.query<
      Array<{ merchantId: string; merchantName: string; balance: number } & RowDataPacket>
    >(
      `
        SELECT
          m.id AS merchantId,
          m.name AS merchantName,
          COALESCE(SUM(CASE WHEN pl.direction = 'credit' THEN pl.points ELSE -pl.points END), 0) AS balance
        FROM merchants m
        LEFT JOIN point_ledger pl ON pl.merchant_id = m.id AND pl.profile_id = ?
        GROUP BY m.id, m.name
      `,
      [profileId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

userRouter.get('/transactions', requireUserAuth, async (req, res, next) => {
  try {
    const profileId = (req as any).userAuth.profile.id;
    const [rows] = await pool.query(
      `
        SELECT
          pl.id,
          pl.merchant_id AS merchantId,
          m.name AS merchantName,
          pl.order_id AS orderId,
          pl.points,
          pl.direction,
          pl.source,
          pl.created_at AS createdAt
        FROM point_ledger pl
        JOIN merchants m ON m.id = pl.merchant_id
        WHERE pl.profile_id = ?
        ORDER BY pl.created_at DESC
        LIMIT 50
      `,
      [profileId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});
