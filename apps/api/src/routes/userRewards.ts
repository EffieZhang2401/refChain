import { Router } from 'express';
import { randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import pool from '../db/pool';
import { requireUserAuth } from '../middleware/requireUserAuth';
import { mintPoints, isWeb3Enabled } from '../web3/pointsBridge';
import { z } from 'zod';

export const userRewardsRouter = Router();

userRewardsRouter.get('/:userId/merchant/:merchantId/coupons/catalog', requireUserAuth, async (req, res, next) => {
  try {
    const { userId, merchantId } = req.params;
    if (userId !== req.userAuth!.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const [[merchant]] = await pool.query<Array<{ name: string } & RowDataPacket>>(
      `SELECT name FROM merchants WHERE id = ? LIMIT 1`,
      [merchantId]
    );
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const [[balanceRow]] = await pool.query<Array<{ balance: number | null } & RowDataPacket>>(
      `
        SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN points ELSE -points END), 0) AS balance
        FROM point_ledger
        WHERE merchant_id = ? AND profile_id = ?
      `,
      [merchantId, req.userAuth!.profile.id]
    );

    const [catalogRows] = await pool.query<
      Array<{
        id: string;
        title: string;
        description: string | null;
        pointsRequired: number;
        expiresAt: string | null;
        isActive: number;
      } & RowDataPacket>
    >(
      `
        SELECT
          id,
          title,
          description,
          points_required AS pointsRequired,
          expires_at AS expiresAt,
          is_active AS isActive
        FROM coupon_catalog
        WHERE merchant_id = ? AND is_active = 1
        ORDER BY points_required ASC, created_at DESC
      `,
      [merchantId]
    );

    res.json({
      merchant: { id: merchantId, name: merchant.name },
      balance: Number(balanceRow?.balance ?? 0),
      catalog: catalogRows
    });
  } catch (error) {
    next(error);
  }
});

const redeemCouponSchema = z.object({
  merchantId: z.string().min(1),
  catalogId: z.string().min(1)
});

userRewardsRouter.post('/:userId/redeem-coupon', requireUserAuth, async (req, res, next) => {
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  try {
    const { userId } = req.params;
    if (userId !== req.userAuth!.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const body = redeemCouponSchema.parse(req.body);
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[catalog]] = await connection.query<
      Array<{
        id: string;
        merchantId: string;
        title: string;
        pointsRequired: number;
        expiresAt: string | null;
      } & RowDataPacket>
    >(
      `
        SELECT
          id,
          merchant_id AS merchantId,
          title,
          points_required AS pointsRequired,
          expires_at AS expiresAt
        FROM coupon_catalog
        WHERE id = ? AND merchant_id = ? AND is_active = 1
        LIMIT 1
        FOR UPDATE
      `,
      [body.catalogId, body.merchantId]
    );

    if (!catalog) {
      await connection.rollback();
      return res.status(404).json({ message: 'Coupon catalog not found' });
    }

    const [[balanceRow]] = await connection.query<Array<{ balance: number } & RowDataPacket>>(
      `SELECT balance FROM wallet_balances WHERE merchant_id = ? AND profile_id = ? FOR UPDATE`,
      [body.merchantId, req.userAuth!.profile.id]
    );
    const balance = Number(balanceRow?.balance ?? 0);
    if (balance < catalog.pointsRequired) {
      await connection.rollback();
      return res.status(400).json({ message: 'Not enough points to redeem this coupon' });
    }

    const couponCode = `CP-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const couponId = randomUUID();

    await connection.query(
      `
        INSERT INTO coupons (
          id, user_id, profile_id, merchant_id, catalog_id, code, points_spent, status, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `,
      [
        couponId,
        req.userAuth!.user.id,
        req.userAuth!.profile.id,
        body.merchantId,
        body.catalogId,
        couponCode,
        catalog.pointsRequired,
        catalog.expiresAt
      ]
    );

    await connection.query(
      `
        INSERT INTO point_ledger (
          id, merchant_id, profile_id, order_id, points, direction, source, created_at
        ) VALUES (?, ?, ?, NULL, ?, 'debit', 'coupon_redemption', NOW())
      `,
      [randomUUID(), body.merchantId, req.userAuth!.profile.id, catalog.pointsRequired]
    );

    await connection.commit();

    res.status(201).json({
      code: couponCode,
      expiresAt: catalog.expiresAt,
      merchantId: body.merchantId,
      catalogId: body.catalogId,
      pointsSpent: catalog.pointsRequired,
      balanceAfter: balance - catalog.pointsRequired
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

const redeemTokenSchema = z.object({
  merchantId: z.string().min(1),
  amount: z.number().int().positive(),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address')
});

userRewardsRouter.get('/:userId/merchant/:merchantId/token', requireUserAuth, async (req, res, next) => {
  try {
    const { userId, merchantId } = req.params;
    if (userId !== req.userAuth!.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const [[merchant]] = await pool.query<
      Array<{ name: string; token_id: number | null } & RowDataPacket>
    >(`SELECT name, token_id FROM merchants WHERE id = ? LIMIT 1`, [merchantId]);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const [[balanceRow]] = await pool.query<Array<{ balance: number | null } & RowDataPacket>>(
      `
        SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN points ELSE -points END), 0) AS balance
        FROM point_ledger
        WHERE merchant_id = ? AND profile_id = ?
      `,
      [merchantId, req.userAuth!.profile.id]
    );

    res.json({
      merchant: { id: merchantId, name: merchant.name, tokenId: merchant.token_id },
      balance: Number(balanceRow?.balance ?? 0),
      web3Ready: isWeb3Enabled()
    });
  } catch (error) {
    next(error);
  }
});

userRewardsRouter.post('/:userId/redeem-token', requireUserAuth, async (req, res, next) => {
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  try {
    const { userId } = req.params;
    if (userId !== req.userAuth!.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const body = redeemTokenSchema.parse({
      ...req.body,
      amount: Number(req.body?.amount)
    });

    if (!isWeb3Enabled()) {
      return res.status(400).json({ message: 'Web3 is not configured for minting' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[merchant]] = await connection.query<
      Array<{ token_id: number | null } & RowDataPacket>
    >(`SELECT token_id FROM merchants WHERE id = ? FOR UPDATE`, [body.merchantId]);

    if (!merchant || merchant.token_id === null) {
      await connection.rollback();
      return res.status(400).json({ message: 'Merchant token is not configured' });
    }

    const [[balanceRow]] = await connection.query<Array<{ balance: number | null } & RowDataPacket>>(
      `SELECT balance FROM wallet_balances WHERE merchant_id = ? AND profile_id = ? FOR UPDATE`,
      [body.merchantId, req.userAuth!.profile.id]
    );
    const balance = Number(balanceRow?.balance ?? 0);
    if (balance < body.amount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Not enough points to redeem tokens' });
    }

    const redemptionId = randomUUID();
    await connection.query(
      `
        INSERT INTO point_ledger (
          id, merchant_id, profile_id, order_id, points, direction, source, created_at
        ) VALUES (?, ?, ?, NULL, ?, 'debit', 'token_redemption', NOW())
      `,
      [randomUUID(), body.merchantId, req.userAuth!.profile.id, body.amount]
    );

    await connection.query(
      `
        INSERT INTO token_redemptions (id, user_id, merchant_id, points_spent, token_amount, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `,
      [redemptionId, req.userAuth!.user.id, body.merchantId, body.amount, body.amount]
    );

    // Mint on-chain; rollback if mint fails so points are not lost
    const mintResult = await mintPoints(body.wallet, merchant.token_id, body.amount);
    const txHash = mintResult.transactionHash ?? null;

    await connection.query(`UPDATE token_redemptions SET status = 'success', tx_hash = ? WHERE id = ?`, [
      txHash,
      redemptionId
    ]);

    await connection.commit();

    res.json({
      txHash: mintResult.transactionHash ?? null,
      merchantId: body.merchantId,
      tokenAmount: body.amount,
      balanceAfter: balance - body.amount
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
