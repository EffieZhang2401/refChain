export interface Profile {
  id: string;
  email: string;
  wallet_address: string | null;
  role: 'merchant_admin' | 'merchant_staff' | 'ambassador' | 'buyer' | 'admin';
}

export interface MerchantSummary {
  id: string;
  name: string;
  cashback_percentage: number;
  referral_reward_percentage: number;
}

export interface ReferralLink {
  id: string;
  code: string;
  usage_count: number;
  owner_profile_id: string;
}

export interface Order {
  id: string;
  order_code: string;
  amount: number;
  currency: string;
  cashback_points: number;
  referral_points: number;
  status: string;
  created_at: string;
}

export interface MerchantDashboard {
  merchant: MerchantSummary;
  totals: {
    totalOrders: number;
    pendingOrders: number;
    totalReferralUses: number;
    totalPointsOutstanding: number;
  };
  recentOrders: Order[];
  topReferrals: ReferralLink[];
}
