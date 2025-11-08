'use client';

import { useEffect, useState } from 'react';
import LoginCard from '@/components/LoginCard';
import DashboardView from '@/components/DashboardView';
import type { Profile } from '@/types';

type Session = {
  token: string;
  profile: Profile;
};

const storageKey = 'refchain-session';

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    if (stored) {
      setSession(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (session) {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }, [session]);

  return (
    <main className="min-h-screen px-4 pb-12">
      {session ? (
        <DashboardView session={session} onSignOut={() => setSession(null)} />
      ) : (
        <LoginCard onAuthenticated={setSession} />
      )}
    </main>
  );
}
