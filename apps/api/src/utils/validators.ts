import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});

export const createReferralSchema = z.object({
  merchantId: z.string().min(1)
});

export const createOrderSchema = z.object({
  merchantId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  buyerEmail: z.string().email(),
  referralCode: z.string().min(4).optional()
});
