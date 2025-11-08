export interface MerchantSummary {
  id: string;
  name: string;
  cashback_percentage: number;
  referral_reward_percentage: number;
  industry: string;
}

export interface OrderSummary {
  id: string;
  order_code: string;
  amount: number;
  currency: string;
  cashback_points: number;
  referral_points: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface ReferralSummary {
  id: string;
  code: string;
  usage_count: number;
  owner: string;
}

export interface DashboardTotals {
  totalOrders: number;
  pendingOrders: number;
  totalReferralUses: number;
  totalPointsOutstanding: number;
}

export interface DashboardPayload {
  merchant: MerchantSummary;
  totals: DashboardTotals;
  recentOrders: OrderSummary[];
  topReferrals: ReferralSummary[];
  refreshedAt: string;
}

export interface DatabaseSchema {
  dashboard: DashboardPayload;
}
