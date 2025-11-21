'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { PointsRow, TransactionRow, ReferralInfo } from '@/types';

interface Props {
  token: string;
  profileName: string;
  onLogout: () => void;
}

export default function UserDashboard({ token, profileName, onLogout }: Props) {
  const [points, setPoints] = useState<PointsRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, t] = await Promise.all([
          apiFetch<PointsRow[]>('/user/points', { token }),
          apiFetch<TransactionRow[]>('/user/transactions', { token })
        ]);
        setPoints(p);
        setTransactions(t);
      } catch (err: any) {
        if (err?.status === 401) {
          onLogout();
          return;
        }
        setError((err as Error).message);
      }
    })();
  }, [token, onLogout]);

  const handleFetchReferral = async () => {
    try {
      setError(null);
      if (!referralCode) return;
      const info = await apiFetch<ReferralInfo>(`/user/referrals/${referralCode}/info`);
      setReferralInfo(info);
    } catch (err: any) {
      if (err?.status === 401) {
        onLogout();
        return;
      }
      setError((err as Error).message);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6 p-6 text-white">
      <header className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-400">Signed in as</p>
          <h1 className="text-2xl font-semibold">{profileName}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <button
            onClick={onLogout}
            className="rounded-lg border border-white/20 px-3 py-2 text-white hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </header>

      {error ? <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {points.map((row) => (
          <div key={row.merchantId} className="card p-4">
            <p className="text-sm text-slate-400">{row.merchantName}</p>
            <p className="text-2xl font-semibold">{row.balance} pts</p>
          </div>
        ))}
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Check referral</h2>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            placeholder="Enter referral code"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
          />
          <button
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
            onClick={handleFetchReferral}
          >
            Lookup
          </button>
        </div>
        {referralInfo ? (
          <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-200">
            <p>Code: {referralInfo.code}</p>
            <p>Merchant: {referralInfo.merchantName}</p>
            {referralInfo.industry ? <p>Industry: {referralInfo.industry}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-lg font-semibold">Recent transactions</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-300">No transactions yet.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                <div>
                  <p className="font-semibold">{tx.merchantName}</p>
                  <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={tx.direction === 'credit' ? 'text-emerald-300' : 'text-red-300'}>
                    {tx.direction === 'credit' ? '+' : '-'}
                    {tx.points} pts
                  </p>
                  <p className="text-xs text-slate-400">{tx.source}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
