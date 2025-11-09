'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Merchant, MerchantDashboard, Order, ReferralLink } from '@/types';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingReferral, setCreatingReferral] = useState(false);
  const [orderForm, setOrderForm] = useState({ amount: '199', buyerEmail: 'user@example.com', referralCode: '' });
  const [creatingOrder, setCreatingOrder] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashboardData, orderList, referralList] = await Promise.all([
        apiFetch<MerchantDashboard>(`/dashboard?merchantId=${merchant.id}`, { token }),
        apiFetch<Order[]>(`/orders?merchantId=${merchant.id}`, { token }),
        apiFetch<ReferralLink[]>(`/referrals?merchantId=${merchant.id}`, { token })
      ]);
      setDashboard(dashboardData);
      setOrders(orderList);
      setReferrals(referralList);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [merchant.id, token]);

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
      setError((err as Error).message);
    } finally {
      setCreatingOrder(false);
    }
  };

  const topReferrals = useMemo(() => referrals.slice().sort((a, b) => b.usageCount - a.usageCount), [referrals]);

  if (loading && !dashboard) {
    return <p className="mt-20 text-center text-slate-300">加载数据中…</p>;
  }

  if (error && !dashboard) {
    return (
      <div className="glass mx-auto mt-12 max-w-xl p-8 text-center">
        <p className="text-lg text-red-300">加载失败：{error}</p>
        <button
          className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
          onClick={fetchAll}
        >
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
                <div key={order.id} className="flex items-center justify-between py-4 text-sm">
                  <div>
                    <p className="font-medium">{order.orderCode}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(order.createdAt).toLocaleString()} · {order.status}
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
