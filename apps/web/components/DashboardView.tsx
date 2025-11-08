'use client';

import type { Profile, MerchantDashboard } from '@/types';
import { useEffect } from 'react';
import { useMerchantDashboard } from '@/hooks/useMerchantDashboard';
import { getMagicClient } from '@/lib/magicClient';
import toast from 'react-hot-toast';

interface DashboardViewProps {
  session: {
    token: string;
    profile: Profile;
  };
  onSignOut: () => void;
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export default function DashboardView({ session, onSignOut }: DashboardViewProps) {
  const { data, error, isLoading } = useMerchantDashboard(session.token);
  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  const handleLogout = async () => {
    const magic = getMagicClient();
    await magic.user.logout();
    onSignOut();
  };

  if (isLoading) {
    return <p className="mt-20 text-center text-slate-300">加载仪表盘数据中…</p>;
  }

  if (error) {
    return (
      <div className="glass mx-auto mt-12 max-w-xl p-8 text-center">
        <p className="text-lg text-red-300">加载失败：{error.message}</p>
        <button
          className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
          onClick={handleLogout}
        >
          重新登录
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { merchant, totals, recentOrders, topReferrals } = data;

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-6 text-white">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">当前商户</p>
          <h1 className="text-3xl font-semibold">{merchant.name}</h1>
          <p className="mt-1 text-sm text-slate-300">
            返现 {merchant.cashback_percentage}% ・ 推荐奖励 {merchant.referral_reward_percentage}%
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">{session.profile.email}</span>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            退出
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="总订单" value={numberFormatter.format(totals.totalOrders)} />
        <MetricCard label="待处理订单" value={numberFormatter.format(totals.pendingOrders)} />
        <MetricCard label="推荐使用次数" value={numberFormatter.format(totals.totalReferralUses)} />
        <MetricCard
          label="未上链积分"
          value={numberFormatter.format(totals.totalPointsOutstanding)}
          helper="待同步到Polygon的总积分"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OrdersTable orders={recentOrders} />
        <ReferralList referrals={topReferrals} />
      </div>
    </section>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="glass space-y-2 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
    </div>
  );
}

function OrdersTable({ orders }: { orders: MerchantDashboard['recentOrders'] }) {
  if (!orders.length) {
    return (
      <div className="glass p-6">
        <h2 className="text-lg font-semibold">最新订单</h2>
        <p className="mt-4 text-sm text-slate-300">暂时还没有订单。</p>
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-semibold">最新订单</h2>
        <span className="text-xs uppercase tracking-wide text-slate-400">最近 10 条</span>
      </div>
      <div className="divide-y divide-white/5">
        {orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between px-6 py-4 text-sm">
            <div>
              <p className="font-medium">{order.order_code}</p>
              <p className="text-xs text-slate-400">
                {new Date(order.created_at).toLocaleString()} ・ {order.status}
              </p>
            </div>
            <div className="text-right">
              <p>{formatCurrency(order.amount, order.currency)}</p>
              <p className="text-xs text-slate-400">
                +{numberFormatter.format(order.cashback_points + order.referral_points)} 积分
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferralList({ referrals }: { referrals: MerchantDashboard['topReferrals'] }) {
  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">推荐榜单</h2>
        <span className="text-xs uppercase tracking-wide text-slate-400">Top 5</span>
      </div>
      {!referrals.length ? (
        <p className="mt-4 text-sm text-slate-300">还没有生成推荐链接。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {referrals.map((referral) => (
            <li key={referral.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
              <span className="text-sm font-semibold">{referral.code}</span>
              <span className="text-xs text-slate-400">使用 {referral.usage_count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
