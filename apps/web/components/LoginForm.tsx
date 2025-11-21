'use client';

import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (payload: { email: string; password: string }) => Promise<void>;
  loading: boolean;
  error?: string;
}

export default function LoginForm({ onSubmit, loading, error }: LoginFormProps) {
  const [email, setEmail] = useState('merchant@test.com');
  const [password, setPassword] = useState('123456');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({ email, password });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass mx-auto mt-20 max-w-xl space-y-6 p-10 text-white shadow-2xl shadow-emerald-500/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Merchant Console</p>
          <h1 className="mt-2 text-3xl font-semibold">Sign in to RefChain</h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage referrals, orders, and loyalty in a streamlined web3-inspired workspace.
          </p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          Live demo
        </span>
      </div>

      <label className="block text-sm font-medium text-slate-200">
        Email
        <input
          type="email"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-200">
        Password
        <input
          type="password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-4 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-400/50 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
