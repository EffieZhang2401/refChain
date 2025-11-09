import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';
import pool from '../db/pool';
import { createReferralSchema } from '../utils/validators';
import { requireAuth } from '../middleware/requireAuth';
import type { ReferralLink } from '../types';

export const referralsRouter = Router();

referralsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const merchantId = (req.query.merchantId as string) ?? null;
    const merchantIds = merchantId ? [merchantId] : req.auth!.merchantIds;
    if (!merchantIds.every((id) => req.auth!.merchantIds.includes(id))) {
      res.status(403).json({ message: '无权访问指定商户的推荐链接' });
      return;
    }
    if (!merchantIds.length) {
      res.json([]);
      return;
    }
    const placeholders = merchantIds.map(() => '?').join(',');
    const [rows] = await pool.query<Array<ReferralLink & RowDataPacket>>(
      `
        SELECT
          r.id,
          r.code,
          r.merchant_id AS merchantId,
          r.owner_profile_id AS ownerProfileId,
          r.max_uses AS maxUses,
          r.usage_count AS usageCount,
          r.expires_at AS expiresAt,
          r.is_active AS isActive,
          r.created_at AS createdAt,
          r.updated_at AS updatedAt,
          p.display_name AS ownerName
        FROM referral_links r
        JOIN profiles p ON p.id = r.owner_profile_id
        WHERE r.merchant_id IN (${placeholders})
        ORDER BY r.created_at DESC
      `,
      merchantIds
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

referralsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = createReferralSchema.parse(req.body);
    if (!req.auth!.merchantIds.includes(input.merchantId)) {
      res.status(403).json({ message: '无权为该商户创建推荐码' });
      return;
    }
    const code = `RC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      `
        INSERT INTO referral_links (
          id, code, merchant_id, owner_profile_id, max_uses, usage_count, is_active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, NULL, 0, 1, NOW(), NOW())
      `,
      [randomUUID(), code, input.merchantId, req.auth!.profile.id]
    );
    const [rows] = await pool.query<Array<ReferralLink & RowDataPacket>>(
      `
        SELECT
          id,
          code,
          merchant_id AS merchantId,
          owner_profile_id AS ownerProfileId,
          max_uses AS maxUses,
          usage_count AS usageCount,
          expires_at AS expiresAt,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM referral_links
        WHERE code = ?
        LIMIT 1
      `,
      [code]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});
