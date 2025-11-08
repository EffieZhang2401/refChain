import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { createReferralSchema } from './referral.validators';
import { createReferralLink, getReferralByCode, listReferralsByMerchant } from './referral.service';

export const referralRouter = Router();

referralRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createReferralSchema.parse(req.body);
    const referral = await createReferralLink(req.user!.id, input);
    res.status(201).json(referral);
  })
);

referralRouter.get(
  '/merchant/:merchantId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const referrals = await listReferralsByMerchant(req.user!.id, req.params.merchantId);
    res.json(referrals);
  })
);

referralRouter.get(
  '/code/:code',
  requireAuth,
  asyncHandler(async (req, res) => {
    const referral = await getReferralByCode(req.params.code);
    res.json(referral);
  })
);
