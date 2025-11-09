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
    <form onSubmit={handleSubmit} className="glass mx-auto mt-16 max-w-md space-y-5 p-8 text-white">
      <div>
        <h1 className="text-2xl font-semibold">登录 RefChain Console</h1>
        <p className="mt-2 text-sm text-slate-300">使用演示账号体验完整的推荐与积分流程。</p>
      </div>

      <label className="block text-sm font-medium text-slate-200">
        邮箱
        <input
          type="email"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-brand focus:outline-none"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-200">
        密码
        <input
          type="password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-brand focus:outline-none"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:bg-brand/60"
      >
        {loading ? '登录中…' : '登录'}
      </button>
    </form>
  );
}
