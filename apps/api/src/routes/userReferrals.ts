import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import pool from '../db/pool';

export const userReferralRouter = Router();

userReferralRouter.get('/:code/info', async (req, res, next) => {
  try {
    const code = req.params.code;
    const [rows] = await pool.query<
      Array<
        {
          code: string;
          merchantId: string;
          merchantName: string;
          industry: string | null;
        } & RowDataPacket
      >
    >(
      `
        SELECT
          r.code,
          r.merchant_id AS merchantId,
          m.name AS merchantName,
          m.industry
        FROM referral_links r
        JOIN merchants m ON m.id = r.merchant_id
        WHERE r.code = ?
        LIMIT 1
      `,
      [code]
    );
    if (!rows.length) {
      res.status(404).json({ message: 'Referral code not found' });
      return;
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

userReferralRouter.post('/click/:code', async (req, res, next) => {
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  try {
    connection = await pool.getConnection();
    const code = req.params.code;
    const [refRows] = await connection.query<Array<{ id: string } & RowDataPacket>>(
      `
        SELECT id
        FROM referral_links
        WHERE code = ?
          AND is_active = 1
          AND (max_uses IS NULL OR usage_count < max_uses)
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `,
      [code]
    );
    if (!refRows.length) {
      res.status(404).json({ message: 'Referral code not found' });
      return;
    }
    const referralId = refRows[0].id;
    await connection.beginTransaction();
    await connection.query(`UPDATE referral_links SET usage_count = usage_count + 1 WHERE id = ?`, [referralId]);
    await connection.commit();
    res.json({ message: 'Referral click recorded', referralId });
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
