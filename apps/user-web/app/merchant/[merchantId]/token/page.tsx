'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { TokenRedemptionResponse, TokenSummary } from '@/types';

const storageKey = 'refchain-user-session';

type Session = {
  token: string;
  profileName: string;
  userId: string;
};

export default function TokenRedemptionPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<TokenSummary | null>(null);
  const [wallet, setWallet] = useState('');
  const [amount, setAmount] = useState('50');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TokenRedemptionResponse | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      router.push('/');
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Session;
      if (!parsed.userId || !parsed.token) throw new Error('invalid');
      setSession(parsed);
    } catch {
      window.localStorage.removeItem(storageKey);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    const load = async (activeSession: Session) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<TokenSummary>(`/user/${activeSession.userId}/merchant/${merchantId}/token`, {
          token: activeSession.token
        });
        setSummary(data);
      } catch (err: any) {
        if (err?.status === 401) {
          router.push('/');
          return;
        }
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    if (session) {
      load(session);
    }
  }, [merchantId, session, router]);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('Please install MetaMask or another EVM wallet.');
      return;
    }
    try {
      setError(null);
      const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts?.length) {
        setWallet(accounts[0]);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRedeem = async () => {
    if (!session || !summary) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!wallet) {
      setError('Connect or enter a wallet address');
      return;
    }
    setRedeeming(true);
    setError(null);
    try {
      const resp = await apiFetch<TokenRedemptionResponse>(`/user/${session.userId}/redeem-token`, {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ merchantId, amount: parsedAmount, wallet })
      });
      setResult(resp);
      setSummary({ ...summary, balance: resp.balanceAfter });
    } catch (err: any) {
      if (err?.status === 401) {
        router.push('/');
        return;
      }
      setError((err as Error).message);
    } finally {
      setRedeeming(false);
    }
  };

  if (!session) {
    return null;
  }

  const insufficient = summary ? Number(amount) > summary.balance : false;
  const disabled =
    redeeming || insufficient || !wallet || !summary?.merchant.tokenId || summary.web3Ready === false;

  return (
    <main className="relative min-h-screen px-4 pb-16 pt-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(124,242,212,0.12),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(122,167,255,0.16),transparent_32%)] blur-3xl" />
      <div className="relative mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Loyalty token</p>
            <h1 className="mt-2 text-3xl font-semibold">{summary?.merchant.name ?? 'Merchant'}</h1>
            <p className="mt-2 text-sm text-slate-300">Redeem points for ERC-1155 tokens.</p>
          </div>
          <Link href="/" className="text-sm text-emerald-200 underline">
            Back to dashboard
          </Link>
        </div>

        {error ? <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

        <div className="glass flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-slate-300">Available points</p>
            <p className="text-3xl font-semibold">{summary?.balance ?? 0} pts</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <button
              onClick={connectWallet}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white transition hover:border-emerald-300 hover:text-emerald-200"
            >
              {wallet ? 'Wallet connected' : 'Connect wallet'}
            </button>
            {wallet ? <span className="text-xs text-emerald-200">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span> : null}
          </div>
        </div>

        <div className="glass space-y-4 p-6">
          <h2 className="text-lg font-semibold">Redeem tokens</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Amount (pts -> tokens)
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Wallet address
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x..."
              />
            </label>
          </div>
          <button
            onClick={handleRedeem}
            disabled={disabled}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-4 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {redeeming
              ? 'Redeeming...'
              : summary?.merchant.tokenId === null
                  ? 'Token not configured'
                  : summary?.web3Ready === false
                    ? 'Web3 not configured'
                    : insufficient
                      ? 'Not enough points'
                      : wallet
                        ? 'Redeem tokens'
                        : 'Connect wallet'}
          </button>
          {summary?.merchant.tokenId === null ? (
            <p className="text-xs text-yellow-200/80">This merchant has not configured a token_id yet.</p>
          ) : null}
          {summary?.web3Ready === false ? (
            <p className="text-xs text-yellow-200/80">Web3 bridge is not configured on the server.</p>
          ) : null}
        </div>

        {result ? (
          <div className="glass space-y-3 border border-emerald-400/30 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">On-chain success</p>
            <h3 className="text-xl font-semibold text-white">Minted {result.tokenAmount} tokens</h3>
            <p className="text-sm text-slate-300">Balance after redemption: {result.balanceAfter} pts</p>
            {result.txHash ? (
              <a
                href={`https://amoy.polygonscan.com/tx/${result.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-emerald-200 underline"
              >
                View on Polygonscan
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
