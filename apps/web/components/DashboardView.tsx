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

const numberFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(amount);

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
  }, [fetchDashboardData, fetchPointsStatus]);

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
      setError('请输入正确的订单金额');
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
      setError('请先安装 MetaMask 或其它兼容钱包扩展');
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
    return <p className="mt-20 text-center text-slate-300">加载数据中…</p>;
  }

  if (error && !dashboard) {
    return (
      <div className="glass mx-auto mt-12 max-w-xl p-8 text-center">
        <p className="text-lg text-red-300">加载失败：{error}</p>
        <button className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white" onClick={fetchAll}>
          重试
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-6 text-white">
      <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">当前商户</p>
          <h1 className="text-3xl font-semibold">{dashboard.merchant.name}</h1>
          <p className="mt-1 text-sm text-slate-300">
            行业：{dashboard.merchant.industry} · 返现 {dashboard.merchant.cashbackPercentage}% · 推荐奖励{' '}
            {dashboard.merchant.referralRewardPercentage}%
          </p>
        </div>
        <div className="text-right text-sm text-slate-300">
          <p>{profileName}</p>
          <p className="text-xs">上次刷新：{new Date(dashboard.refreshedAt).toLocaleString()}</p>
          <button
            onClick={onLogout}
            className="mt-3 inline-flex rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            退出
          </button>
        </div>
      </header>

      {error ? <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="总订单" value={numberFormatter.format(dashboard.totals.totalOrders)} />
        <MetricCard label="待处理订单" value={numberFormatter.format(dashboard.totals.pendingOrders)} />
        <MetricCard label="推荐使用次数" value={numberFormatter.format(dashboard.totals.totalReferralUses)} />
        <MetricCard label="未结算积分" value={numberFormatter.format(dashboard.totals.totalPointsOutstanding)} />
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
            <h2 className="text-lg font-semibold">最新订单</h2>
            <button className="text-sm text-slate-300" onClick={fetchAll}>
              刷新
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="mt-6 text-sm text-slate-300">暂无订单</p>
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
                      链上：{order.onchainStatus}
                      {order.transactionHash ? (
                        <a
                          className="ml-2 underline"
                          href={`https://amoy.polygonscan.com/tx/${order.transactionHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          查看
                        </a>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{formatCurrency(order.amount, order.currency)}</p>
                    <p className="text-xs text-slate-400">
                      +{numberFormatter.format(order.cashbackPoints + order.referralPoints)} 积分
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
              <h2 className="text-lg font-semibold">推荐链接</h2>
              <button
                onClick={handleCreateReferral}
                disabled={creatingReferral}
                className="rounded-lg bg-brand px-3 py-1 text-sm font-semibold text-white disabled:cursor-wait disabled:bg-brand/60"
              >
                {creatingReferral ? '生成中…' : '生成'}
              </button>
            </div>
            {referrals.length === 0 ? (
              <p className="mt-4 text-sm text-slate-300">暂无推荐链接</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {topReferrals.map((referral) => (
                  <li key={referral.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-2">
                    <span className="font-semibold">{referral.code}</span>
                    <span className="text-xs text-slate-400">使用 {referral.usageCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="space-y-3" onSubmit={handleOrderSubmit}>
            <h2 className="text-lg font-semibold">模拟新订单</h2>
            <label className="text-sm text-slate-300">
              买家邮箱
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                value={orderForm.buyerEmail}
                onChange={(event) => setOrderForm((prev) => ({ ...prev, buyerEmail: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              订单金额 (USD)
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                value={orderForm.amount}
                onChange={(event) => setOrderForm((prev) => ({ ...prev, amount: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              推荐码（可选）
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
              {creatingOrder ? '提交中…' : '创建订单'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass space-y-2 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
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
          <p className="text-sm text-slate-400">钱包连接</p>
          <p className="text-lg font-semibold">{connected ? status!.walletAddress : 'Wallet not connected'}</p>
          {chainId ? <p className="text-xs text-slate-400">Chain ID: {parseInt(chainId, 16)}</p> : null}
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10" onClick={onRefresh}>
            刷新
          </button>
          <button
            onClick={onConnect}
            disabled={loading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:bg-brand/60"
          >
            {loading ? '连接中…' : connected ? '重新连接' : 'Connect Wallet'}
          </button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-slate-400">本地积分</p>
          <p className="text-2xl font-semibold">{status ? numberFormatter.format(status.localPoints) : '—'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-slate-400">链上积分 (Polygon Amoy)</p>
          <p className="text-2xl font-semibold">
            {status && status.onchainBalance !== null ? numberFormatter.format(status.onchainBalance) : '未配置'}
          </p>
          {status ? (
            <p className="mt-1 text-xs text-slate-400">
              同步状态：{status.status === 'synced' ? '已同步' : status.status === 'pending' ? '待同步' : '未配置'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
