'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldCheck, Phone, Mail, MailCheck } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { sendPasswordlessSignInLink, formatEmailAuthError } from '@/lib/firebase-auth';

function normalisePhone(raw: string): string {
  const clean = raw.replace(/[\s\-()]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.length === 10) return `+91${clean}`;
  return `+${clean}`;
}

function LinkEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useFirebaseUser();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMagicLink, setSentMagicLink] = useState(false);

  useEffect(() => {
    const qEmail = searchParams?.get('email');
    if (qEmail) setEmail(qEmail);
    const qPhone = searchParams?.get('phone');
    if (qPhone) setPhone(qPhone);
  }, [searchParams]);

  const isLoggedIn = !authLoading && !!user;
  const isRecoveryMode = !authLoading && !user;

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </main>
    );
  }

  // ── SUBMIT LINKING / RECOVERY (NO PASSWORD NEEDED) ─────────────────────────
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    let normalisedPhone = '';
    if (isRecoveryMode) {
      const trimmedPhone = phone.trim();
      if (!trimmedPhone) {
        setError('Enter the phone number you used to sign up.');
        return;
      }
      normalisedPhone = normalisePhone(trimmedPhone);
      if (!/^\+[1-9]\d{7,14}$/.test(normalisedPhone)) {
        setError('Please enter a valid phone number (e.g. +91 9876543210).');
        return;
      }
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) {
        const idToken = await user.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const res = await fetch('/api/reflex/link-phone-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...(normalisedPhone ? { phone: normalisedPhone } : {}),
          email: trimmedEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      // Also fire off passwordless login link so user can immediately sign in with 1 tap
      try {
        await sendPasswordlessSignInLink(trimmedEmail, '/dashboard');
      } catch (linkErr) {
        console.warn('Magic link dispatch warning:', linkErr);
      }

      setSentMagicLink(true);
    } catch (submitErr) {
      setError(formatEmailAuthError(submitErr));
    } finally {
      setLoading(false);
    }
  };

  // ── SUCCESS / CHECK INBOX STATE ───────────────────────────────────────────
  if (sentMagicLink) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white flex items-center justify-center">
        <div className="max-w-md w-full flex flex-col gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-primary/10 shadow-[0_0_25px_rgba(226,255,59,0.2)] mx-auto">
            <MailCheck className="h-9 w-9 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase leading-tight tracking-tight">
              Check Your <span className="text-primary">Email.</span>
            </h1>
            <p className="mt-3 text-sm font-semibold text-white/60 leading-relaxed">
              We sent a 1-tap sign-in link to <span className="text-white font-bold">{email.trim()}</span>.
              All your streaks, scores, and subscription are preserved.
            </p>
          </div>
          <button
            onClick={() => router.replace('/login')}
            className="btn-primary flex h-14 w-full items-center justify-center gap-2 mt-2"
          >
            BACK TO LOGIN <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-between">
        <div>
          <span className="text-sm font-black italic uppercase tracking-tight">
            Spar<span className="text-primary">ai</span>
          </span>
          <div className="mt-10 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {isLoggedIn ? 'Update Account Email' : 'Account Recovery'}
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            {isLoggedIn ? (
              <>Add or change <span className="text-primary">email.</span></>
            ) : (
              <>Recover your <span className="text-primary">account.</span></>
            )}
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            {isLoggedIn
              ? 'Your phone number, streaks, drills and subscription stay 100% safe — this updates your login email without passwords.'
              : 'Enter your phone number and email. We will connect your account and send a 1-tap sign-in link.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
          {isRecoveryMode && (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-white/40 uppercase flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Phone Number (used during signup)
              </span>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary text-white"
                autoFocus
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-white/40 uppercase flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> Email Address
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary text-white"
              autoFocus={isLoggedIn}
            />
          </div>

          {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? 'CONNECTING...' : 'CONNECT EMAIL & SEND SIGN-IN LINK'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white text-center py-2"
          >
            {isLoggedIn ? 'Not now' : 'Back to login'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LinkEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </main>
      }
    >
      <LinkEmailContent />
    </Suspense>
  );
}
