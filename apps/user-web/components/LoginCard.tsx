'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (payload: { email: string; password: string }) => Promise<void>;
  loading: boolean;
  error?: string;
  mode: 'login' | 'signup';
  onToggleMode: () => void;
}

export default function LoginCard({ onSubmit, loading, error, mode, onToggleMode }: Props) {
  const [email, setEmail] = useState('user@test.com');
  const [password, setPassword] = useState('123456');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ email, password });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card mx-auto mt-20 max-w-xl space-y-7 p-10 text-white shadow-2xl shadow-emerald-500/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Member Portal</p>
          <h1 className="mt-2 text-3xl font-semibold">Track your rewards</h1>
          <p className="mt-2 text-sm text-slate-300">
            {mode === 'login'
              ? 'Sign in to view balances, recent transactions, and referral perks.'
              : 'Create an account to start collecting points from your purchases.'}
          </p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          Web3-ready
        </span>
      </div>
      <label className="block text-sm text-slate-200">
        Email
        <input
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/40"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm text-slate-200">
        Password
        <input
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/40"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error ? <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
      <button
        disabled={loading}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-400/50 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? 'Submitting...' : mode === 'login' ? 'Sign in' : 'Sign up'}
      </button>
      <div className="text-center text-sm text-slate-300">
        {mode === 'login' ? 'No account yet?' : 'Already have an account?'}{' '}
        <button type="button" className="font-semibold text-emerald-200 underline" onClick={onToggleMode}>
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}
