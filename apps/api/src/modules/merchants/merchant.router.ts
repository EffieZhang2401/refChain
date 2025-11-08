import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AppError } from '../../utils/appError';
import { createMerchant } from './merchant.service';
import { createMerchantSchema } from './merchant.validators';
import { listMerchants, getMerchantById } from './merchant.service';

export const merchantRouter = Router();

merchantRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createMerchantSchema.parse(req.body);
    const merchant = await createMerchant(req.user!.id, input);
    res.status(201).json(merchant);
  })
);

merchantRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchants = await listMerchants(req.user!.id);
    res.json(merchants);
  })
);

merchantRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const merchant = await getMerchantById(req.params.id);
    if (merchant.owner_profile_id !== req.user!.id) {
      throw new AppError('You do not own this merchant', 403);
    }
    res.json(merchant);
  })
);
