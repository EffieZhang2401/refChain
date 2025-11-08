import { nanoid } from 'nanoid';
import { supabaseAdmin } from '../../lib/supabaseClient';
import { AppError } from '../../utils/appError';
import type { ReferralLink } from '../../types/domain';
import type { CreateReferralInput } from './referral.validators';
import { getMerchantById } from '../merchants/merchant.service';

const generateCode = () => `RC-${nanoid(8).toUpperCase()}`;

export async function createReferralLink(ownerProfileId: string, input: CreateReferralInput) {
  const merchant = await getMerchantById(input.merchantId);
  if (merchant.owner_profile_id !== ownerProfileId) {
    throw new AppError('You do not own this merchant', 403);
  }

  const { data, error } = await supabaseAdmin
    .from('referral_links')
    .insert({
      owner_profile_id: ownerProfileId,
      merchant_id: merchant.id,
      code: generateCode(),
      max_uses: input.maxUses ?? null,
      expires_at: input.expiresAt ?? null,
      metadata: input.metadata ?? {}
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError('Failed to create referral', 500, error);
  }

  return data as ReferralLink;
}

export async function getReferralByCode(code: string) {
  const { data, error } = await supabaseAdmin.from('referral_links').select('*').eq('code', code).single();

  if (error || !data) {
    throw new AppError('Referral not found', 404);
  }

  return data as ReferralLink;
}

export async function listReferralsByMerchant(actorProfileId: string, merchantId: string) {
  const merchant = await getMerchantById(merchantId);
  if (merchant.owner_profile_id !== actorProfileId) {
    throw new AppError('You do not own this merchant', 403);
  }

  const { data, error } = await supabaseAdmin
    .from('referral_links')
    .select('*')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false });

  if (error || !data) {
    throw new AppError('Failed to list referrals', 500, error);
  }

  return data as ReferralLink[];
}
