'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MailCheck, ShieldCheck, AlertTriangle } from 'lucide-react';
import { sendPasswordlessSignInLink, formatEmailAuthError } from '@/lib/firebase-auth';

const RESEND_COOLDOWN_SECONDS = 30;

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSignup = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordlessSignInLink(trimmedEmail, '/onboarding');
      setEmail(trimmedEmail);
      setSentLink(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (signupError) {
      setError(formatEmailAuthError(signupError));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    await handleSignup();
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-between">
        <div>
          <span className="text-sm font-black italic uppercase tracking-tight">Spar<span className="text-primary">ai</span></span>
          <div className="mt-10 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Create account</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Become a <span className="text-primary">fighter.</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            {sentLink
              ? 'Your secure, one-click signup link is on its way. Open it to verify your email and continue.'
              : 'Enter your email and we&apos;ll send a secure one-click signup link. No password needed.'}
          </p>
        </div>

        {sentLink ? (
          <section className="flex flex-col items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(226,255,59,0.2)]">
              <MailCheck className="h-10 w-10 animate-pulse text-primary" />
            </div>
            <div className="text-center">
              <span className="mb-1 block text-xs font-black uppercase tracking-widest text-white/40">Link sent to</span>
              <p className="break-all text-xl font-bold tracking-tight text-white">{email}</p>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-white/50">
                Open the email and tap the link. Your account and fighter profile are created only after verification.
              </p>
            </div>
            <div className="flex max-w-xs items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
              <p className="text-left text-[10px] font-semibold leading-relaxed text-yellow-300/80">
                If it doesn&apos;t arrive, check your Spam or Promotions folder.
              </p>
            </div>
            {error && <p className="text-center text-[11px] font-bold text-red-400">{error}</p>}
            <button
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 hover:border-primary hover:text-primary disabled:opacity-40"
            >
              {loading ? 'SENDING...' : cooldown > 0 ? `RESEND LINK (${cooldown}s)` : 'RESEND SIGNUP LINK'}
            </button>
            <button
              onClick={() => { setSentLink(false); setError(null); }}
              className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
            >
              Change email
            </button>
          </section>
        ) : (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-white/40 uppercase">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSignup()}
              placeholder="you@email.com"
              className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary"
              autoFocus
            />
          </div>

          {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}

          <button
            onClick={handleSignup}
            disabled={loading}
            className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'SENDING LINK...' : 'SEND ONE-CLICK SIGNUP LINK'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button onClick={() => router.push('/login')} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white">
            Already a fighter? Log in
          </button>
        </section>
        )}
      </div>
    </main>
  );
}
