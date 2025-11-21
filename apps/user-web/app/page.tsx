'use client';

import { useEffect, useState } from 'react';
import LoginCard from '@/components/LoginCard';
import UserDashboard from '@/components/UserDashboard';
import type { LoginResponse } from '@/types';
import { apiFetch } from '@/lib/api';

type Session = {
  token: string;
  profileName: string;
};

const storageKey = 'refchain-user-session';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    if (stored) {
      setSession(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (!session) {
      window.localStorage.removeItem(storageKey);
    } else {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    }
  }, [session]);

  const handleLogout = () => {
    setSession(null);
    setError(null);
    setMode('login');
  };

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      const path = mode === 'login' ? '/user/auth/login' : '/user/auth/signup';
      const resp = await apiFetch<LoginResponse>(path, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setSession({ token: resp.token, profileName: resp.profile.displayName });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <LoginCard
        onSubmit={handleLogin}
        loading={loading}
        error={error ?? undefined}
        mode={mode}
        onToggleMode={() => setMode(mode === 'login' ? 'signup' : 'login')}
      />
    );
  }

  return <UserDashboard token={session.token} profileName={session.profileName} onLogout={handleLogout} />;
}
