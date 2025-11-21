export interface LoginResponse {
  token: string;
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
