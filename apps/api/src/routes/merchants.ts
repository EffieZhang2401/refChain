import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import pool from '../db/pool';
import { requireAuth } from '../middleware/requireAuth';
import { buildInClause } from '../utils/sql';
import type { Merchant } from '../types';
import { z } from 'zod';

export const merchantsRouter = Router();

const walletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, '钱包地址格式不正确'),
  tokenId: z.number().int().positive().optional()
});
merchantsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const merchantIds = req.auth!.merchantIds;
    if (!merchantIds.length) {
      res.json([]);
      return;
    }
    const { clause, params } = buildInClause(merchantIds);
    const [merchants] = await pool.query<Array<Merchant & RowDataPacket>>(
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
    res.json(merchants);
  } catch (error) {
    next(error);
  }
});

merchantsRouter.put('/:merchantId/wallet', requireAuth, async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    if (!req.auth!.merchantIds.includes(merchantId)) {
      return res.status(403).json({ message: '无权更新该商户钱包' });
    }
    const body = walletSchema.parse(req.body);
    await pool.query(
      `
        UPDATE merchants
        SET wallet_address = ?, token_id = COALESCE(?, token_id), updated_at = NOW()
        WHERE id = ?
      `,
      [body.walletAddress.toLowerCase(), body.tokenId ?? null, merchantId]
    );
    res.json({ walletAddress: body.walletAddress.toLowerCase(), tokenId: body.tokenId ?? null });
  } catch (error) {
    next(error);
  }
});

merchantsRouter.get('/:merchantId', requireAuth, async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    if (!req.auth!.merchantIds.includes(merchantId)) {
      res.status(403).json({ message: '无权访问该商户' });
      return;
    }
    const [rows] = await pool.query<Array<Merchant & RowDataPacket>>(
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
        WHERE id = ?
        LIMIT 1
      `,
      [merchantId]
    );
    const merchant = rows[0];
    if (!merchant) {
      res.status(404).json({ message: '商户不存在' });
      return;
    }
    res.json(merchant);
  } catch (error) {
    next(error);
  }
});
