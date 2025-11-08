import { supabaseAdmin } from '../../lib/supabaseClient';
import { AppError } from '../../utils/appError';
import type { Merchant, Order, ReferralLink } from '../../types/domain';

interface DashboardMetrics {
  merchant: Merchant;
  totals: {
    totalOrders: number;
    pendingOrders: number;
    totalReferralUses: number;
    totalPointsOutstanding: number;
  };
  recentOrders: Order[];
  topReferrals: ReferralLink[];
}

export async function getMerchantDashboard(profileId: string): Promise<DashboardMetrics> {
  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('owner_profile_id', profileId)
    .maybeSingle();

  if (merchantError || !merchant) {
    throw new AppError('No merchant linked to this profile', 404);
  }

  const [{ data: recentOrders }, { data: referralLinks }, { data: ledgerEntries }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('referral_links')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('usage_count', { ascending: false })
      .limit(5),
    supabaseAdmin.from('point_ledger').select('direction, points').eq('merchant_id', merchant.id)
  ]);

  const [{ count: totalOrders }, { count: pendingOrders }] = await Promise.all([
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('merchant_id', merchant.id),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .eq('status', 'pending')
  ]);

  const totalReferralUses = (referralLinks ?? []).reduce((acc, link) => acc + (link.usage_count ?? 0), 0);
  const totalPointsOutstanding = (ledgerEntries ?? []).reduce((acc, entry) => {
    return acc + (entry.direction === 'credit' ? entry.points : -entry.points);
  }, 0);

  return {
    merchant: merchant as Merchant,
    totals: {
      totalOrders: totalOrders ?? 0,
      pendingOrders: pendingOrders ?? 0,
      totalReferralUses,
      totalPointsOutstanding
    },
    recentOrders: (recentOrders ?? []) as Order[],
    topReferrals: (referralLinks ?? []) as ReferralLink[]
  };
}
