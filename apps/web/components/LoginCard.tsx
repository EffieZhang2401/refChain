"use client";

import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { getMagicClient } from "@/lib/magicClient";
import { apiFetch } from "@/lib/api";
import type { Profile } from "@/types";

interface LoginCardProps {
  onAuthenticated: (payload: { token: string; profile: Profile }) => void;
}

export default function LoginCard({ onAuthenticated }: LoginCardProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const magic = getMagicClient();
      await magic.auth.loginWithMagicLink({ email });
      const didToken = await magic.user.getIdToken();
      const profile = await apiFetch<Profile>("/auth/profile", {
        token: didToken,
      });
      onAuthenticated({ token: didToken, profile });
      toast.success("登录成功，正在加载数据");
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleLogin}
      className="glass mx-auto mt-16 max-w-md p-8 text-white"
    >
      <h1 className="text-2xl font-semibold">登录 RefChain</h1>
      <p className="mt-2 text-sm text-slate-300">
        使用 Magic.link 邮件登录，自动关联您的商户钱包。
      </p>
      <label className="mt-6 block text-sm font-medium text-slate-200">
        工作邮箱
        <input
          type="email"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-brand focus:outline-none"
          placeholder="you@merchant.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/60"
      >
        {loading ? "请稍候…" : "Magic.link 登录"}
      </button>
    </form>
  );
}
