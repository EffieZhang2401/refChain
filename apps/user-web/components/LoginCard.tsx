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
    <form onSubmit={handleSubmit} className="card mx-auto mt-16 max-w-md space-y-6 p-8 text-white">
      <div>
        <h1 className="text-2xl font-semibold">User Portal</h1>
        <p className="mt-2 text-sm text-slate-300">
          {mode === 'login' ? 'Sign in to view your points and referrals.' : 'Create an account to start collecting points.'}
        </p>
      </div>
      <label className="block text-sm text-slate-200">
        Email
        <input
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm text-slate-200">
        Password
        <input
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        disabled={loading}
        className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/80 disabled:cursor-wait disabled:bg-brand/60"
      >
        {loading ? 'Submitting...' : mode === 'login' ? 'Sign in' : 'Sign up'}
      </button>
      <div className="text-center text-sm text-slate-300">
        {mode === 'login' ? 'No account yet?' : 'Already have an account?'}{' '}
        <button type="button" className="text-brand font-semibold underline" onClick={onToggleMode}>
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}
