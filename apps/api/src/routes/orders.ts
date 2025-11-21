import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';
import pool from '../db/pool';
import { createOrderSchema } from '../utils/validators';
import { requireAuth } from '../middleware/requireAuth';
import type { Order } from '../types';

export const ordersRouter = Router();

const ensureProfileByEmail = async (email: string) => {
  const normalized = email.toLowerCase();
  const [userRows] = await pool.query<Array<{ id: string } & RowDataPacket>>(
    `SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
    [normalized]
  );
  let userId: string;
  let profileId: string;

  if (userRows.length) {
    userId = userRows[0].id;
    const [profileRows] = await pool.query<Array<{ id: string } & RowDataPacket>>(
      `SELECT id FROM profiles WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    if (profileRows.length) {
      profileId = profileRows[0].id;
    } else {
      profileId = randomUUID();
      await pool.query(
        `INSERT INTO profiles (id, user_id, display_name, locale, timezone, created_at, updated_at)
         VALUES (?, ?, ?, 'en-US', 'UTC', NOW(), NOW())`,
        [profileId, userId, normalized.split('@')[0]]
      );
    }
  } else {
    userId = randomUUID();
    profileId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, login_provider, status, created_at, updated_at)
       VALUES (?, ?, NULL, 'password', 'active', NOW(), NOW())`,
      [userId, normalized]
    );
    await pool.query(
      `INSERT INTO profiles (id, user_id, display_name, locale, timezone, created_at, updated_at)
       VALUES (?, ?, ?, 'en-US', 'UTC', NOW(), NOW())`,
      [profileId, userId, normalized.split('@')[0]]
    );
  }

  return profileId;
};

ordersRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const merchantId = (req.query.merchantId as string) ?? req.auth!.merchantIds[0];
    if (!merchantId || !req.auth!.merchantIds.includes(merchantId)) {
      res.status(400).json({ message: '请提供可访问的 merchantId' });
      return;
    }

    const [rows] = await pool.query<Array<Order & RowDataPacket>>(
      `
        SELECT
          id,
          order_code AS orderCode,
          merchant_id AS merchantId,
          buyer_email AS buyerEmail,
          referral_id AS referralId,
          amount,
          currency,
          cashback_points AS cashbackPoints,
          referral_points AS referralPoints,
          status,
          onchain_status AS onchainStatus,
          created_at AS createdAt
        FROM orders
        WHERE merchant_id = ?
        ORDER BY created_at DESC
      `,
      [merchantId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

ordersRouter.post('/', requireAuth, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const parsed = createOrderSchema.parse({
      ...req.body,
      amount: Number(req.body?.amount),
      currency: req.body?.currency || 'USD'
    });

    if (!req.auth!.merchantIds.includes(parsed.merchantId)) {
      res.status(403).json({ message: '无权为该商户创建订单' });
      return;
    }

    const [[merchant]] = await connection.query<
      Array<
        {
          cashbackPercentage: number;
          referralRewardPercentage: number;
          walletAddress: string | null;
          tokenId: number | null;
        } & RowDataPacket
      >
    >(
      `
        SELECT
          cashback_percentage AS cashbackPercentage,
          referral_reward_percentage AS referralRewardPercentage,
          wallet_address AS walletAddress,
          token_id AS tokenId
        FROM merchants
        WHERE id = ?
        LIMIT 1
      `,
      [parsed.merchantId]
    );

    if (!merchant) {
      res.status(404).json({ message: '商户不存在' });
      return;
    }

    let referralId: string | null = null;
    let referralOwnerProfileId: string | null = null;
    if (parsed.referralCode) {
      const [refRows] = await connection.query<Array<{ id: string } & RowDataPacket>>(
        `
          SELECT id, owner_profile_id AS ownerProfileId
          FROM referral_links
          WHERE code = ? AND merchant_id = ?
          LIMIT 1
        `,
        [parsed.referralCode, parsed.merchantId]
      );
      if (!refRows.length) {
        res.status(400).json({ message: '推荐码不存在或不属于该商户' });
        return;
      }
      referralId = refRows[0].id;
      referralOwnerProfileId = (refRows as any)[0].ownerProfileId;
    }

    const buyerProfileId = await ensureProfileByEmail(parsed.buyerEmail);

    const cashbackPoints = Math.floor((parsed.amount * merchant.cashbackPercentage) / 100);
    const referralPoints = referralId ? Math.floor((parsed.amount * merchant.referralRewardPercentage) / 100) : 0;

    await connection.beginTransaction();

    const orderId = randomUUID();
    const orderCode = `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    await connection.query(
      `
        INSERT INTO orders (
          id, order_code, merchant_id, buyer_email, referral_id,
          amount, currency, cashback_points, referral_points, status,
          onchain_status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'not_started', NOW(), NOW())
      `,
      [orderId, orderCode, parsed.merchantId, parsed.buyerEmail, referralId, parsed.amount, parsed.currency, cashbackPoints, referralPoints]
    );

    if (cashbackPoints > 0) {
      await connection.query(
        `
          INSERT INTO point_ledger (
            id, merchant_id, profile_id, order_id, points, direction, source, created_at
          ) VALUES (?, ?, ?, ?, ?, 'credit', 'cashback', NOW())
        `,
        [randomUUID(), parsed.merchantId, buyerProfileId, orderId, cashbackPoints]
      );
    }

    if (referralId && referralPoints > 0 && referralOwnerProfileId) {
      await connection.query(
        `
          INSERT INTO point_ledger (
            id, merchant_id, profile_id, order_id, points, direction, source, created_at
          ) VALUES (?, ?, ?, ?, ?, 'credit', 'referral', NOW())
        `,
        [randomUUID(), parsed.merchantId, referralOwnerProfileId, orderId, referralPoints]
      );
      await connection.query(`UPDATE referral_links SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = ?`, [
        referralId
      ]);
    }

    await connection.commit();

    const [rows] = await connection.query<Array<Order & RowDataPacket>>(
      `
        SELECT
          id,
          order_code AS orderCode,
          merchant_id AS merchantId,
          buyer_email AS buyerEmail,
          referral_id AS referralId,
          amount,
          currency,
          cashback_points AS cashbackPoints,
          referral_points AS referralPoints,
          status,
          onchain_status AS onchainStatus,
          created_at AS createdAt
        FROM orders
        WHERE id = ?
      `,
      [orderId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});
