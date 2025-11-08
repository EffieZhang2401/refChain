import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getMerchantDashboard } from './dashboard.service';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/merchant',
  requireAuth,
  asyncHandler(async (req, res) => {
    const dashboard = await getMerchantDashboard(req.user!.id);
    res.json(dashboard);
  })
);
