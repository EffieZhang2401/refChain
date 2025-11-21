'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Merchant, MerchantDashboard, Order, PointsSyncStatus, ReferralLink } from '@/types';
import { apiFetch } from '@/lib/api';

interface DashboardViewProps {
  token: string;
  merchant: Merchant;
  profileName: string;
  onLogout: () => void;
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export default function DashboardView({ token, merchant, profileName, onLogout }: DashboardViewProps) {
  const [dashboard, setDashboard] = useState<MerchantDashboard | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [referrals, setReferrals] = useState<ReferralLink[]>([]);
  const [pointsStatus, setPointsStatus] = useState<PointsSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingReferral, setCreatingReferral] = useState(false);
  const [orderForm, setOrderForm] = useState({ amount: '199', buyerEmail: 'user@example.com', referralCode: '' });
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    const [dashboardData, orderList, referralList] = await Promise.all([
      apiFetch<MerchantDashboard>(`/dashboard?merchantId=${merchant.id}`, { token }),
      apiFetch<Order[]>(`/orders?merchantId=${merchant.id}`, { token }),
      apiFetch<ReferralLink[]>(`/referrals?merchantId=${merchant.id}`, { token })
    ]);
    setDashboard(dashboardData);
    setOrders(orderList);
    setReferrals(referralList);
  }, [merchant.id, token]);

  const fetchPointsStatus = useCallback(async () => {
    const data = await apiFetch<PointsSyncStatus>(`/points/onchain/${merchant.id}`, { token });
    setPointsStatus(data);
  }, [merchant.id, token]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchDashboardData(), fetchPointsStatus()]);
    } catch (err) {
      if ((err as any)?.status === 401) {
        onLogout();
        return;
      }
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboardData, fetchPointsStatus, onLogout]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreateReferral = async () => {
    try {
      setCreatingReferral(true);
      await apiFetch<ReferralLink>('/referrals', {
        method: 'POST',
        token,
        body: JSON.stringify({ merchantId: merchant.id })
      });
      await fetchAll();
    } catch (err) {
      if ((err as any)?.status === 401) {
        onLogout();
        return;
      }
      setError((err as Error).message);
    } finally {
      setCreatingReferral(false);
    }
  };

  const handleOrderSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(orderForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid order amount');
      return;
    }
    try {
      setCreatingOrder(true);
      await apiFetch<Order>('/orders', {
        method: 'POST',
        token,
        body: JSON.stringify({
          merchantId: merchant.id,
          amount,
          currency: 'USD',
          buyerEmail: orderForm.buyerEmail,
          referralCode: orderForm.referralCode || undefined
        })
      });
      setOrderForm({ amount: '199', buyerEmail: orderForm.buyerEmail, referralCode: '' });
      await fetchAll();
    } catch (err) {
      if ((err as any)?.status === 401) {
        onLogout();
        return;
      }
      setError((err as Error).message);
    } finally {
      setCreatingOrder(false);
    }
  };

  const topReferrals = useMemo(() => referrals.slice().sort((a, b) => b.usageCount - a.usageCount), [referrals]);

  const handleConnectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('Please install MetaMask or another EVM wallet extension');
      return;
    }
    try {
      setConnectingWallet(true);
      const ethereum = (window as any).ethereum;
      const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
      const selected = accounts[0];
      const networkChainId: string = await ethereum.request({ method: 'eth_chainId' });
      setChainId(networkChainId);
      await apiFetch(`/merchants/${merchant.id}/wallet`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ walletAddress: selected })
      });
      await fetchPointsStatus();
    } catch (err) {
      if ((err as any)?.status === 401) {
        onLogout();
        return;
      }
      setError((err as Error).message);
    } finally {
      setConnectingWallet(false);
    }
  };

  if (loading && !dashboard) {
    return <p className="mt-20 text-center text-slate-300">Loading data...</p>;
  }

  if (error && !dashboard) {
    return (
      <div className="glass mx-auto mt-12 max-w-xl p-8 text-center">
        <p className="text-lg text-red-300">Failed to load: {error}</p>
        <button className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white" onClick={fetchAll}>
          Retry
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-6 text-white">
      <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-transparent to-blue-500/10" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Current merchant</p>
          <h1 className="text-3xl font-semibold">{dashboard.merchant.name}</h1>
          <p className="mt-1 text-sm text-slate-300">
            Industry: {dashboard.merchant.industry} · Cashback {dashboard.merchant.cashbackPercentage}% · Referral reward{' '}
            {dashboard.merchant.referralRewardPercentage}%
          </p>
        </div>
        <div className="text-right text-sm text-slate-300">
          <p>{profileName}</p>
          <p className="text-xs">Last refresh: {new Date(dashboard.refreshedAt).toLocaleString()}</p>
          <button
            onClick={onLogout}
            className="mt-3 inline-flex rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
        </div>
      </header>

      {error ? <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total orders" value={numberFormatter.format(dashboard.totals.totalOrders)} />
        <MetricCard label="Pending orders" value={numberFormatter.format(dashboard.totals.pendingOrders)} />
        <MetricCard label="Referral uses" value={numberFormatter.format(dashboard.totals.totalReferralUses)} />
        <MetricCard label="Outstanding points" value={numberFormatter.format(dashboard.totals.totalPointsOutstanding)} />
      </div>

      <WalletPanel
        status={pointsStatus}
        chainId={chainId}
        onConnect={handleConnectWallet}
        loading={connectingWallet}
        onRefresh={fetchPointsStatus}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass p-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-lg font-semibold">Latest orders</h2>
            <button className="text-sm text-slate-300" onClick={fetchAll}>
              Refresh
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="mt-6 text-sm text-slate-300">No orders yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-1 py-4 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{order.orderCode}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(order.createdAt).toLocaleString()} · {order.status}
                    </p>
                    <p className="text-xs text-slate-400">
                      On-chain: {order.onchainStatus}
                      {order.transactionHash ? (
                        <a
                          className="ml-2 underline"
                          href={`https://amoy.polygonscan.com/tx/${order.transactionHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{formatCurrency(order.amount, order.currency)}</p>
                    <p className="text-xs text-slate-400">
                      +{numberFormatter.format(order.cashbackPoints + order.referralPoints)} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass space-y-6 p-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Referral links</h2>
              <button
                onClick={handleCreateReferral}
                disabled={creatingReferral}
                className="rounded-lg bg-brand px-3 py-1 text-sm font-semibold text-white disabled:cursor-wait disabled:bg-brand/60"
              >
                {creatingReferral ? 'Generating…' : 'Generate'}
              </button>
            </div>
            {referrals.length === 0 ? (
              <p className="mt-4 text-sm text-slate-300">No referral links yet.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {topReferrals.map((referral) => (
                  <li key={referral.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-2">
                    <span className="font-semibold">{referral.code}</span>
                    <span className="text-xs text-slate-400">Uses {referral.usageCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="space-y-3" onSubmit={handleOrderSubmit}>
            <h2 className="text-lg font-semibold">Create mock order</h2>
            <label className="text-sm text-slate-300">
              Buyer email
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                value={orderForm.buyerEmail}
                onChange={(event) => setOrderForm((prev) => ({ ...prev, buyerEmail: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Order amount (USD)
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                value={orderForm.amount}
                onChange={(event) => setOrderForm((prev) => ({ ...prev, amount: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Referral code (optional)
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                value={orderForm.referralCode}
                onChange={(event) => setOrderForm((prev) => ({ ...prev, referralCode: event.target.value }))}
              />
            </label>
            <button
              type="submit"
              disabled={creatingOrder}
              className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:bg-brand/60"
            >
              {creatingOrder ? 'Submitting…' : 'Create order'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass relative overflow-hidden space-y-2 p-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-blue-500/10" />
      <p className="relative text-sm text-slate-300">{label}</p>
      <p className="relative text-3xl font-semibold text-white">{value}</p>
      <div className="relative h-1 w-14 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />
    </div>
  );
}

function WalletPanel({
  status,
  chainId,
  onConnect,
  loading,
  onRefresh
}: {
  status: PointsSyncStatus | null;
  chainId: string | null;
  onConnect: () => void;
  loading: boolean;
  onRefresh: () => void;
}) {
  const connected = Boolean(status?.walletAddress);
  return (
    <div className="glass p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-400">Wallet connection</p>
          <p className="text-lg font-semibold">{connected ? status!.walletAddress : 'Wallet not connected'}</p>
          {chainId ? <p className="text-xs text-slate-400">Chain ID: {parseInt(chainId, 16)}</p> : null}
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10" onClick={onRefresh}>
            Refresh
          </button>
          <button
            onClick={onConnect}
            disabled={loading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:bg-brand/60"
          >
            {loading ? 'Connecting…' : connected ? 'Re-connect' : 'Connect Wallet'}
          </button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-slate-400">Local points</p>
          <p className="text-2xl font-semibold">{status ? numberFormatter.format(status.localPoints) : '--'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-slate-400">On-chain points (Polygon Amoy)</p>
          <p className="text-2xl font-semibold">
            {status && status.onchainBalance !== null ? numberFormatter.format(status.onchainBalance) : 'Not configured'}
          </p>
          {status ? (
            <p className="mt-1 text-xs text-slate-400">
              Sync status: {status.status === 'synced' ? 'Synced' : status.status === 'pending' ? 'Pending' : 'Not configured'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
