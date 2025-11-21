export interface LoginResponse {
  token: string;
  userId: string;
  profile: {
    id: string;
    displayName: string;
  };
}

export interface PointsRow {
  merchantId: string;
  merchantName: string;
  balance: number;
}

export interface TransactionRow {
  id: string;
  merchantId: string;
  merchantName: string;
  orderId: string | null;
  points: number;
  direction: 'credit' | 'debit';
  source: string;
  createdAt: string;
}

export interface ReferralInfo {
  code: string;
  merchantId: string;
  merchantName: string;
  industry?: string | null;
}

export interface CouponCatalogItem {
  id: string;
  title: string;
  description?: string | null;
  pointsRequired: number;
  expiresAt?: string | null;
  isActive: number;
}

export interface CouponCatalogResponse {
  merchant: { id: string; name: string };
  balance: number;
  catalog: CouponCatalogItem[];
}

export interface CouponRedemptionResponse {
  code: string;
  expiresAt?: string | null;
  merchantId: string;
  catalogId: string;
  pointsSpent: number;
  balanceAfter: number;
}

export interface TokenSummary {
  merchant: { id: string; name: string; tokenId: number | null };
  balance: number;
  web3Ready: boolean;
}

export interface TokenRedemptionResponse {
  txHash: string | null;
  merchantId: string;
  tokenAmount: number;
  balanceAfter: number;
}
