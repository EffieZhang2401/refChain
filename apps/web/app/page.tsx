'use client';

import { useEffect, useState } from 'react';
import DashboardView from '@/components/DashboardView';
import type { MerchantDashboard } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export default function HomePage() {
  const [data, setData] = useState<MerchantDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboard() {
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard`);
        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`);
        }
        const payload = (await response.json()) as MerchantDashboard;
        if (isMounted) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen px-4 pb-12">
      {loading && <p className="mt-20 text-center text-slate-300">加载示例数据中…</p>}
      {error && (
        <div className="glass mx-auto mt-12 max-w-xl p-8 text-center text-red-200">
          <p>无法获取数据：{error}</p>
          <p className="mt-2 text-sm text-slate-400">请确认 API (npm run dev:api) 已在本地运行。</p>
        </div>
      )}
      {!loading && !error && data && <DashboardView data={data} />}
    </main>
  );
}
