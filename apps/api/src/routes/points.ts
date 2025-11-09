import type { RowDataPacket } from 'mysql2';
import { Router } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/requireAuth';
import { getOnchainBalance, isWeb3Enabled } from '../web3/pointsBridge';

export const pointsRouter = Router();

pointsRouter.get('/onchain/:merchantId', requireAuth, async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    if (!req.auth!.merchantIds.includes(merchantId)) {
      return res.status(403).json({ message: '无权查看该商户数据' });
    }

    const [[merchant]] = await pool.query<
      Array<
        {
          wallet_address: string | null;
          token_id: number | null;
        } & RowDataPacket
      >
    >(`SELECT wallet_address, token_id FROM merchants WHERE id = ? LIMIT 1`, [merchantId]);

    if (!merchant) {
      res.status(404).json({ message: '商户不存在' });
      return;
    }

    const [[local]] = await pool.query<Array<{ localPoints: number | null } & RowDataPacket>>(
      `
        SELECT COALESCE(SUM(
          CASE WHEN direction = 'credit' THEN points ELSE -points END
        ), 0) AS localPoints
        FROM point_ledger
        WHERE merchant_id = ?
      `,
      [merchantId]
    );

    const localPoints = Number(local?.localPoints ?? 0);
    let onchainBalance: number | null = null;

    if (merchant.wallet_address && merchant.token_id && isWeb3Enabled()) {
      onchainBalance = await getOnchainBalance(merchant.wallet_address, merchant.token_id);
    }

    let status: 'synced' | 'pending' | 'not_configured';
    if (onchainBalance === null) {
      status = 'not_configured';
    } else if (onchainBalance === localPoints) {
      status = 'synced';
    } else {
      status = 'pending';
    }

    res.json({
      merchantId,
      walletAddress: merchant.wallet_address,
      tokenId: merchant.token_id,
      localPoints,
      onchainBalance,
      status
    });
  } catch (error) {
    next(error);
  }
});
