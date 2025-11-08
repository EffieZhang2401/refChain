import { z } from 'zod';

export const createOrderSchema = z.object({
  merchantId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  referralCode: z.string().optional(),
  buyer: z.object({
    email: z.string().email(),
    walletAddress: z.string().optional(),
    displayName: z.string().optional()
  }),
  metadata: z.record(z.unknown()).optional()
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
