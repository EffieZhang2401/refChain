import { supabaseAdmin } from '../../lib/supabaseClient';
import { AppError } from '../../utils/appError';
import type { Merchant } from '../../types/domain';
import type { CreateMerchantInput } from './merchant.validators';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export async function createMerchant(ownerProfileId: string, input: CreateMerchantInput) {
  const { data, error } = await supabaseAdmin
    .from('merchants')
    .insert({
      owner_profile_id: ownerProfileId,
      name: input.name,
      slug: slugify(input.name),
      email: input.email.toLowerCase(),
      support_email: input.supportEmail?.toLowerCase() ?? null,
      wallet_address: input.walletAddress.toLowerCase(),
      cashback_percentage: input.cashbackPercentage,
      referral_reward_percentage: input.referralRewardPercentage,
      metadata: input.metadata ?? {}
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError('Failed to create merchant', 500, error);
  }

  return data as Merchant;
}

export async function listMerchants(ownerProfileId: string) {
  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('owner_profile_id', ownerProfileId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    throw new AppError('Failed to list merchants', 500, error);
  }

  return data as Merchant[];
}

export async function getMerchantById(id: string) {
  const { data, error } = await supabaseAdmin.from('merchants').select('*').eq('id', id).single();
  if (error || !data) {
    throw new AppError('Merchant not found', 404);
  }

  return data as Merchant;
}
