import { nanoid } from 'nanoid';
import { supabaseAdmin } from '../../lib/supabaseClient';
import { AppError } from '../../utils/appError';
import { getMerchantById } from '../merchants/merchant.service';
import { getReferralByCode } from '../referrals/referral.service';
import { getOrCreateProfileByEmail } from '../profiles/profile.service';
import type { CreateOrderInput } from './order.validators';
import type { Order } from '../../types/domain';

const orderCode = () => `ORD-${nanoid(10).toUpperCase()}`;

export async function createOrder(actorProfileId: string, input: CreateOrderInput) {
  const merchant = await getMerchantById(input.merchantId);
  if (merchant.owner_profile_id !== actorProfileId) {
    throw new AppError('You do not own this merchant', 403);
  }

  const referral = input.referralCode ? await getReferralByCode(input.referralCode) : null;
  if (referral && referral.merchant_id !== merchant.id) {
    throw new AppError('Referral does not belong to merchant', 400);
  }

  const buyerProfile = await getOrCreateProfileByEmail(input.buyer.email, input.buyer.walletAddress ?? null, 'buyer');

  const cashbackPoints = Math.floor((input.amount * merchant.cashback_percentage) / 100);
  const referralPoints = referral ? Math.floor((input.amount * merchant.referral_reward_percentage) / 100) : 0;

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({
      order_code: orderCode(),
      merchant_id: merchant.id,
      buyer_profile_id: buyerProfile.id,
      referral_id: referral?.id ?? null,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      cashback_points: cashbackPoints,
      referral_points: referralPoints,
      metadata: input.metadata ?? {},
      status: 'pending'
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError('Failed to create order', 500, error);
  }

  const order = data as Order;

  const ledgerRows = [];
  if (cashbackPoints > 0) {
    ledgerRows.push({
      merchant_id: merchant.id,
      profile_id: buyerProfile.id,
      order_id: order.id,
      points: cashbackPoints,
      direction: 'credit',
      source: 'cashback',
      metadata: { order_code: order.order_code }
    });
  }

  if (referral && referralPoints > 0) {
    ledgerRows.push({
      merchant_id: merchant.id,
      profile_id: referral.owner_profile_id,
      order_id: order.id,
      points: referralPoints,
      direction: 'credit',
      source: 'referral',
      metadata: { order_code: order.order_code, referral_code: referral.code }
    });
  }

  if (ledgerRows.length) {
    const { error: ledgerError } = await supabaseAdmin.from('point_ledger').insert(ledgerRows);
    if (ledgerError) {
      throw new AppError('Failed to persist ledger entries', 500, ledgerError);
    }
  }

  if (referral) {
    await supabaseAdmin.rpc('increment_referral_usage', { referral_uuid: referral.id });
  }

  if (cashbackPoints > 0 || referralPoints > 0) {
    await supabaseAdmin.from('sync_tasks').insert({
      order_id: order.id,
      task_type: 'mint_points',
      payload: {
        merchantId: merchant.id,
        merchantTokenId: merchant.token_id,
        contractAddress: merchant.contract_address,
        buyerProfileId: buyerProfile.id,
        buyerWallet: buyerProfile.wallet_address,
        cashbackPoints,
        referralPoints,
        referralProfileId: referral?.owner_profile_id ?? null
      }
    });
  }

  return order;
}

export async function listOrdersByMerchant(actorProfileId: string, merchantId: string) {
  const merchant = await getMerchantById(merchantId);
  if (merchant.owner_profile_id !== actorProfileId) {
    throw new AppError('You do not own this merchant', 403);
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error || !data) {
    throw new AppError('Failed to fetch orders', 500, error);
  }

  return data as Order[];
}
