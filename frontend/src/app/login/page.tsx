'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Phone, MailCheck, RefreshCw, Sparkles, KeyRound } from 'lucide-react';
import { sendPasswordlessSignInLink, formatEmailAuthError } from '@/lib/firebase-auth';

const RESEND_COOLDOWN = 30;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordlessSignInLink(trimmedEmail, '/dashboard');
      setSentLink(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (err: any) {
      setError(formatEmailAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    await handleSendLink();
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-between">
        <div>
          <span className="text-sm font-black italic uppercase tracking-tight">
            Spar<span className="text-primary">ai</span>
          </span>
          <div className="mt-10 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Passwordless Login</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Welcome <span className="text-primary">back.</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            {sentLink
              ? 'Check your inbox — no password required. Tap the link to enter.'
              : 'Enter your email to receive a secure 1-tap sign-in link.'}
          </p>
        </div>

        {sentLink ? (
          <section className="flex flex-col items-center gap-6 my-auto">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(226,255,59,0.2)]">
              <MailCheck className="h-10 w-10 text-primary animate-pulse" />
            </div>

            <div className="text-center">
              <span className="text-xs uppercase font-black text-white/40 tracking-widest block mb-1">
                Link sent to
              </span>
              <p className="text-xl font-bold text-white tracking-tight">{email.trim()}</p>
              <p className="mt-2 text-xs text-white/50 leading-relaxed max-w-xs mx-auto">
                Open your email app, tap the sign-in button, and you&apos;ll be instantly logged in.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 mt-4">
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 hover:border-primary hover:text-primary disabled:opacity-40"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'SENDING...' : cooldown > 0 ? `RESEND IN ${cooldown}S` : 'RESEND LINK'}
              </button>

              <button
                onClick={() => {
                  setSentLink(false);
                  setError(null);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white py-2"
              >
                Use a different email
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSendLink} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-white/40 uppercase">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@email.com"
                className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary text-white"
                autoFocus
              />
            </div>

            {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? 'SENDING LINK...' : 'SEND SIGN-IN LINK'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => router.push('/onboarding')}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white mt-1 text-center"
            >
              New fighter? Sign up &amp; start training
            </button>

            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => router.push('/login/phone')}
                className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
              >
                <Phone className="h-3.5 w-3.5" />
                Joined before with your phone? Log in with phone
              </button>

              <button
                type="button"
                onClick={() => router.push('/account/link-email')}
                className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Recover phone account / update email
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
