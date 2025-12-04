import { Router } from 'express';
import { randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import pool from '../db/pool';
import { requireAuth } from '../middleware/requireAuth';
import { z } from 'zod';

export const merchantCouponsRouter = Router();

const createCatalogSchema = z.object({
  merchantId: z.string().min(1),
  title: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  pointsRequired: z.number().int().positive(),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expiresAt must be YYYY-MM-DD')
    .optional()
});

type CatalogRow = {
  id: string;
  title: string;
  description: string | null;
  pointsRequired: number;
  expiresAt: string | null;
  isActive: number;
  issuedCount: number | null;
  redeemedCount: number | null;
  activeCoupons: number | null;
} & RowDataPacket;

type CouponRow = {
  id: string;
  catalogId: string;
  code: string;
  status: 'active' | 'redeemed' | 'expired';
  expiresAt: string | null;
  pointsSpent: number;
  createdAt: string;
  displayName: string | null;
} & RowDataPacket;

const mapCatalogRow = (row: CatalogRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  pointsRequired: Number(row.pointsRequired),
  expiresAt: row.expiresAt,
  isActive: Boolean(row.isActive),
  issuedCount: Number(row.issuedCount ?? 0),
  redeemedCount: Number(row.redeemedCount ?? 0),
  activeCoupons: Number(row.activeCoupons ?? 0)
});

merchantCouponsRouter.get('/catalog', requireAuth, async (req, res, next) => {
  try {
    const merchantId = (req.query.merchantId as string) ?? req.auth!.merchantIds[0];
    if (!merchantId || !req.auth!.merchantIds.includes(merchantId)) {
      return res.status(400).json({ message: 'Invalid merchantId' });
    }

    const [[merchant]] = await pool.query<Array<{ name: string } & RowDataPacket>>(
      `SELECT name FROM merchants WHERE id = ? LIMIT 1`,
      [merchantId]
    );
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const [catalogRows] = await pool.query<CatalogRow[]>(
      `
        SELECT
          cc.id,
          cc.title,
          cc.description,
          cc.points_required AS pointsRequired,
          cc.expires_at AS expiresAt,
          cc.is_active AS isActive,
          COALESCE(SUM(c.status = 'active'), 0) AS activeCoupons,
          COALESCE(SUM(c.status = 'redeemed'), 0) AS redeemedCount,
          COUNT(c.id) AS issuedCount
        FROM coupon_catalog cc
        LEFT JOIN coupons c ON c.catalog_id = cc.id
        WHERE cc.merchant_id = ?
        GROUP BY cc.id
        ORDER BY cc.created_at DESC
      `,
      [merchantId]
    );

    const [recentCoupons] = await pool.query<CouponRow[]>(
      `
        SELECT
          c.id,
          c.catalog_id AS catalogId,
          c.code,
          c.status,
          c.expires_at AS expiresAt,
          c.points_spent AS pointsSpent,
          c.created_at AS createdAt,
          p.display_name AS displayName
        FROM coupons c
        LEFT JOIN profiles p ON p.id = c.profile_id
        WHERE c.merchant_id = ?
        ORDER BY c.created_at DESC
        LIMIT 15
      `,
      [merchantId]
    );

    const catalog = catalogRows.map(mapCatalogRow);
    const stats = {
      totalCatalogs: catalog.length,
      activeCatalogs: catalog.filter((item) => item.isActive).length,
      totalIssued: catalog.reduce((sum, item) => sum + item.issuedCount, 0),
      totalRedeemed: catalog.reduce((sum, item) => sum + item.redeemedCount, 0)
    };

    res.json({
      merchant: { id: merchantId, name: merchant.name },
      stats,
      catalog,
      recentCoupons: recentCoupons.map((row) => ({
        id: row.id,
        catalogId: row.catalogId,
        code: row.code,
        status: row.status,
        expiresAt: row.expiresAt,
        pointsSpent: Number(row.pointsSpent),
        createdAt: row.createdAt,
        profileName: row.displayName ?? null
      }))
    });
  } catch (error) {
    next(error);
  }
});

merchantCouponsRouter.post('/catalog', requireAuth, async (req, res, next) => {
  try {
    const input = createCatalogSchema.parse({
      ...req.body,
      pointsRequired: Number(req.body?.pointsRequired)
    });

    if (!req.auth!.merchantIds.includes(input.merchantId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const catalogId = randomUUID();
    await pool.query(
      `
        INSERT INTO coupon_catalog (
          id, merchant_id, title, description, points_required, expires_at, is_active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `,
      [catalogId, input.merchantId, input.title, input.description ?? null, input.pointsRequired, input.expiresAt ?? null]
    );

    const [rows] = await pool.query<CatalogRow[]>(
      `
        SELECT
          cc.id,
          cc.title,
          cc.description,
          cc.points_required AS pointsRequired,
          cc.expires_at AS expiresAt,
          cc.is_active AS isActive,
          0 AS activeCoupons,
          0 AS redeemedCount,
          0 AS issuedCount
        FROM coupon_catalog cc
        WHERE cc.id = ?
        LIMIT 1
      `,
      [catalogId]
    );

    const row = rows[0];
    if (!row) {
      return res.status(500).json({ message: 'Failed to create coupon' });
    }

    res.status(201).json(mapCatalogRow(row));
  } catch (error) {
    next(error);
  }
});
