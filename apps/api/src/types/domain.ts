export type ProfileRole = 'merchant_admin' | 'merchant_staff' | 'ambassador' | 'buyer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  wallet_address: string | null;
  magic_user_id: string | null;
  role: ProfileRole;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: string;
  owner_profile_id: string;
  name: string;
  slug: string;
  email: string;
  support_email: string | null;
  wallet_address: string;
  cashback_percentage: number;
  referral_reward_percentage: number;
  token_id: number | null;
  contract_address: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReferralLink {
  id: string;
  code: string;
  merchant_id: string;
  owner_profile_id: string;
  max_uses: number | null;
  usage_count: number;
  expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_code: string;
  merchant_id: string;
  buyer_profile_id: string;
  referral_id: string | null;
  amount: number;
  currency: string;
  cashback_points: number;
  referral_points: number;
  status: string;
  onchain_status: string;
  transaction_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
