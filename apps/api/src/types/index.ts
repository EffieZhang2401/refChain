export type UserStatus = 'pending' | 'active' | 'suspended';
export type LoginProvider = 'password' | 'magic_link' | 'wallet';

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  loginProvider: LoginProvider;
  status: UserStatus;
  profileId: string;
}

export type ProfileRole = 'owner' | 'admin' | 'staff' | 'analyst';

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  walletAddress?: string;
  locale: string;
  timezone: string;
}

export type MerchantStatus = 'draft' | 'active' | 'suspended';

export interface Merchant {
  id: string;
  ownerProfileId: string;
  name: string;
  slug: string;
  industry: string;
  supportEmail: string;
  cashbackPercentage: number;
  referralRewardPercentage: number;
  status: MerchantStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MerchantMember {
  id: string;
  merchantId: string;
  profileId: string;
  role: ProfileRole;
  invitedBy?: string;
  invitedAt: string;
  acceptedAt?: string;
  isActive: boolean;
}

export interface ReferralLink {
  id: string;
  code: string;
  merchantId: string;
  ownerProfileId: string;
  ownerName?: string;
  maxUses?: number;
  usageCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type OnChainStatus = 'not_started' | 'pending' | 'synced' | 'failed';

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
  status: OrderStatus;
  onchainStatus: OnChainStatus;
  transactionHash?: string | null;
  createdAt: string;
}

export interface PointLedgerEntry {
  id: string;
  merchantId: string;
  profileId: string;
  orderId?: string;
  points: number;
  direction: 'credit' | 'debit';
  source: string;
  createdAt: string;
}

export interface DashboardTotals {
  totalOrders: number;
  pendingOrders: number;
  totalReferralUses: number;
  totalPointsOutstanding: number;
}

export interface DashboardPayload {
  merchant: Merchant;
  totals: DashboardTotals;
  recentOrders: Order[];
  topReferrals: ReferralLink[];
  refreshedAt: string;
}
