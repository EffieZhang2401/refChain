import { z } from 'zod';

export const createMerchantSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  supportEmail: z.string().email().optional(),
  walletAddress: z.string().min(6),
  cashbackPercentage: z.number().min(0).max(100).default(5),
  referralRewardPercentage: z.number().min(0).max(100).default(2),
  metadata: z.record(z.unknown()).optional()
});

export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
