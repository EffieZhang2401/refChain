import { z } from 'zod';

export const createReferralSchema = z.object({
  merchantId: z.string().uuid(),
  maxUses: z.number().int().min(0).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type CreateReferralInput = z.infer<typeof createReferralSchema>;
