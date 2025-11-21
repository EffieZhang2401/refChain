'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { CouponCatalogResponse, CouponRedemptionResponse } from '@/types';

const storageKey = 'refchain-user-session';

type Session = {
  token: string;
  profileName: string;
  userId: string;
};

export default function MerchantCouponsPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [catalog, setCatalog] = useState<CouponCatalogResponse | null>(null);
  const [redeemed, setRedeemed] = useState<CouponRedemptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      router.push('/');
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Session;
      if (!parsed.userId || !parsed.token) throw new Error('invalid');
      setSession(parsed);
    } catch {
      window.localStorage.removeItem(storageKey);
      router.push('/');
    }
  }, [router]);

  const fetchCatalog = useMemo(
    () => async (activeSession: Session) => {
      setLoading(true);
      setError(null);
      setRedeemed(null);
      try {
        const data = await apiFetch<CouponCatalogResponse>(
          `/user/${activeSession.userId}/merchant/${merchantId}/coupons/catalog`,
          { token: activeSession.token }
        );
        setCatalog(data);
      } catch (err: any) {
        if (err?.status === 401) {
          router.push('/');
          return;
        }
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [merchantId, router]
  );

  useEffect(() => {
    if (session) {
      fetchCatalog(session);
    }
  }, [session, fetchCatalog]);

  const handleRedeem = async (catalogId: string) => {
    if (!session) return;
    setRedeemingId(catalogId);
    setError(null);
    try {
      const resp = await apiFetch<CouponRedemptionResponse>(`/user/${session.userId}/redeem-coupon`, {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ merchantId, catalogId })
      });
      setRedeemed(resp);
      await fetchCatalog(session);
    } catch (err: any) {
      if (err?.status === 401) {
        router.push('/');
        return;
      }
      setError((err as Error).message);
    } finally {
      setRedeemingId(null);
    }
  };

  if (!session) {
    return null;
  }

  const balance = catalog?.balance ?? 0;

  return (
    <main className="relative min-h-screen px-4 pb-16 pt-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(124,242,212,0.12),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(122,167,255,0.16),transparent_32%)] blur-3xl" />
      <div className="relative mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Coupons</p>
            <h1 className="mt-2 text-3xl font-semibold">{catalog?.merchant.name ?? 'Merchant'}</h1>
            <p className="mt-2 text-sm text-slate-300">Redeem your loyalty points for merchant coupons.</p>
          </div>
          <Link href="/" className="text-sm text-emerald-200 underline">
            Back to dashboard
          </Link>
        </div>

        <div className="glass flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-slate-300">Available balance</p>
            <p className="text-3xl font-semibold">{balance} pts</p>
          </div>
          <button
            onClick={() => fetchCatalog(session)}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white transition hover:border-emerald-300 hover:text-emerald-200"
          >
            Refresh
          </button>
        </div>

        {error ? <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

        <div className="glass space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Redeemable coupons</h2>
            {loading ? <span className="text-xs text-slate-400">Loading...</span> : null}
          </div>
          {catalog && catalog.catalog.length === 0 ? (
            <p className="text-sm text-slate-300">No coupons available right now.</p>
          ) : (
            <div className="space-y-4">
              {catalog?.catalog.map((item) => {
                const disabled = balance < item.pointsRequired || Boolean(redeemingId);
                const insufficient = balance < item.pointsRequired;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/90 p-5 shadow-lg shadow-black/20 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-2xl font-semibold text-white">{item.title}</p>
                      {item.description ? <p className="text-sm text-slate-300">{item.description}</p> : null}
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                        {item.pointsRequired} pts to redeem
                      </p>
                      {item.expiresAt ? (
                        <p className="text-xs text-slate-500">Valid until {item.expiresAt}</p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => handleRedeem(item.id)}
                      disabled={disabled}
                      className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {redeemingId === item.id ? 'Redeeming...' : insufficient ? 'Not enough points' : 'Redeem'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {redeemed ? (
          <div className="glass space-y-3 border border-emerald-400/30 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Redeemed</p>
            <h3 className="text-2xl font-semibold text-white">{redeemed.code}</h3>
            <p className="text-sm text-slate-300">Balance after redemption: {redeemed.balanceAfter} pts</p>
            {redeemed.expiresAt ? <p className="text-xs text-slate-400">Valid until {redeemed.expiresAt}</p> : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
