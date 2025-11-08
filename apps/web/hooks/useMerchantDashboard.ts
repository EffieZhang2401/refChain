import useSWR from 'swr';
import type { MerchantDashboard } from '@/types';
import { apiFetch } from '@/lib/api';

export function useMerchantDashboard(token: string | null) {
  return useSWR<MerchantDashboard>(
    token ? (['dashboard', token] as const) : null,
    // SWR 对数组 key 会把元素作为参数依次传入
    (_: string, didToken: string) =>
        apiFetch<MerchantDashboard>('/dashboard/merchant', { token: didToken })
  );
}
