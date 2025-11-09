import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import pool from '../db/pool';
import { requireAuth } from '../middleware/requireAuth';
import type { DashboardPayload } from '../types';

export const dashboardRouter = Router();

dashboardRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const merchantId = (req.query.merchantId as string) ?? req.auth!.merchantIds[0];
    if (!merchantId || !req.auth!.merchantIds.includes(merchantId)) {
      res.status(400).json({ message: '请提供可访问的 merchantId' });
      return;
    }

    const [[merchant]] = await pool.query<Array<DashboardPayload['merchant'] & RowDataPacket>>(
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
      `,
      [merchantId]
    );

    if (!merchant) {
      res.status(404).json({ message: '商户不存在' });
      return;
    }

    const [[orderStats]] = await pool.query<Array<{ totalOrders: number; pendingOrders: number } & RowDataPacket>>(
      `
        SELECT
          COUNT(*) AS totalOrders,
          SUM(status = 'pending') AS pendingOrders
        FROM orders
        WHERE merchant_id = ?
      `,
      [merchantId]
    );

    const [[referralStats]] = await pool.query<Array<{ totalReferralUses: number | null } & RowDataPacket>>(
      `
        SELECT SUM(usage_count) AS totalReferralUses
        FROM referral_links
        WHERE merchant_id = ?
      `,
      [merchantId]
    );

    const [[pointsStats]] = await pool.query<Array<{ totalPointsOutstanding: number | null } & RowDataPacket>>(
      `
        SELECT COALESCE(SUM(
          CASE WHEN direction = 'credit' THEN points ELSE -points END
        ), 0) AS totalPointsOutstanding
        FROM point_ledger
        WHERE merchant_id = ?
      `,
      [merchantId]
    );

    const [recentOrders] = await pool.query<Array<DashboardPayload['recentOrders'][number] & RowDataPacket>>(
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
        LIMIT 10
      `,
      [merchantId]
    );

    const [topReferrals] = await pool.query<Array<DashboardPayload['topReferrals'][number] & RowDataPacket>>(
      `
        SELECT
          id,
          code,
          merchant_id AS merchantId,
          owner_profile_id AS ownerProfileId,
          usage_count AS usageCount,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM referral_links
        WHERE merchant_id = ?
        ORDER BY usage_count DESC
        LIMIT 5
      `,
      [merchantId]
    );

    res.json({
      merchant,
      totals: {
        totalOrders: Number(orderStats?.totalOrders ?? 0),
        pendingOrders: Number(orderStats?.pendingOrders ?? 0),
        totalReferralUses: Number(referralStats?.totalReferralUses ?? 0),
        totalPointsOutstanding: Number(pointsStats?.totalPointsOutstanding ?? 0)
      },
      recentOrders,
      topReferrals,
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
