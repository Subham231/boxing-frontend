'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, MailCheck } from 'lucide-react';
import { sendResetPasswordEmail, formatEmailAuthError } from '@/lib/firebase-auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await sendResetPasswordEmail(trimmed);
      // Always show the same success state regardless of whether the email
      // exists — this avoids leaking which addresses have accounts.
      setSent(true);
    } catch (e) {
      // Firebase (as of recent SDK versions) doesn't throw auth/user-not-found
      // for password reset by default, but handle it defensively anyway.
      setError(formatEmailAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-between">
        <div>
          <span className="text-sm font-black italic uppercase tracking-tight">Spar<span className="text-primary">ai</span></span>
          <div className="mt-10 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Reset password</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Forgot your <span className="text-primary">password?</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            {sent
              ? "If that email has an account, we've sent a reset link to it."
              : "Enter your email and we'll send you a link to reset it."}
          </p>
        </div>

        {sent ? (
          <section className="flex flex-col items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <MailCheck className="h-10 w-10 text-primary" />
            </div>
            <button onClick={() => router.push('/login')} className="btn-primary flex h-14 w-full items-center justify-center gap-2">
              BACK TO LOGIN
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
                onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                placeholder="you@email.com"
                className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary"
                autoFocus
              />
            </div>

            {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}

            <button
              onClick={handleSend}
              disabled={loading}
              className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'SENDING...' : 'SEND RESET LINK'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <button onClick={() => router.push('/login')} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
              Back to login
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
