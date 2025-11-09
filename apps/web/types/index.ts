export interface Merchant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  supportEmail: string;
  cashbackPercentage: number;
  referralRewardPercentage: number;
  status: 'draft' | 'active' | 'suspended';
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ReferralLink {
  id: string;
  code: string;
  merchantId: string;
  usageCount: number;
  ownerProfileId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderCode: string;
  merchantId: string;
  buyerEmail: string;
  referralId?: string;
  amount: number;
  currency: string;
  cashbackPoints: number;
  referralPoints: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  onchainStatus?: 'not_started' | 'pending' | 'synced' | 'failed';
  createdAt: string;
}

export interface MerchantDashboard {
  merchant: Merchant;
  totals: {
    totalOrders: number;
    pendingOrders: number;
    totalReferralUses: number;
    totalPointsOutstanding: number;
  };
  recentOrders: Order[];
  topReferrals: ReferralLink[];
  refreshedAt: string;
}

export interface LoginResponse {
  token: string;
  profile: {
    id: string;
    displayName: string;
    locale: string;
  };
  merchants: Merchant[];
}
