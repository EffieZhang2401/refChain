'use client';

import { useEffect, useMemo, useState } from 'react';
import LoginForm from '@/components/LoginForm';
import DashboardView from '@/components/DashboardView';
import type { LoginResponse, Merchant } from '@/types';
import { apiFetch } from '@/lib/api';

type Session = {
  token: string;
  profileName: string;
  merchants: Merchant[];
  merchantId: string;
};

const storageKey = 'refchain-session';

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
  }, []);

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }, [session]);

  const selectedMerchant = useMemo(() => {
    if (!session) return null;
    return session.merchants.find((merchant) => merchant.id === session.merchantId) ?? session.merchants[0];
  }, [session]);

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setLoginError(null);
    setLoginLoading(true);
    try {
      const response = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!response.merchants.length) {
        throw new Error('该账号尚未绑定商户');
      }
      setSession({
        token: response.token,
        profileName: response.profile.displayName,
        merchants: response.merchants,
        merchantId: response.merchants[0].id
      });
    } catch (error) {
      setLoginError((error as Error).message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
  };

  return (
    <main className="min-h-screen px-4 pb-12">
      {session && selectedMerchant ? (
        <DashboardView
          token={session.token}
          merchant={selectedMerchant}
          profileName={session.profileName}
          onLogout={handleLogout}
        />
      ) : (
        <LoginForm onSubmit={handleLogin} loading={loginLoading} error={loginError ?? undefined} />
      )}
    </main>
  );
}
