'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldCheck, Eye, EyeOff, Phone } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { linkEmailPasswordToUser, formatEmailAuthError } from '@/lib/firebase-auth';

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
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill email or phone from search params if present
  useEffect(() => {
    const qEmail = searchParams?.get('email');
    if (qEmail) setEmail(qEmail);
    const qPhone = searchParams?.get('phone');
    if (qPhone) setPhone(qPhone);
  }, [searchParams]);

  // Once we know auth state, decide which mode we're in
  const isLoggedIn = !authLoading && !!user;
  const isRecoveryMode = !authLoading && !user;

  // If just auth is loading, wait
  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </main>
    );
  }

  // ── LOGGED IN MODE ─────────────────────────────────────────────────────────
  const handleLink = async () => {
    if (!user) return;
    setError(null);
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await linkEmailPasswordToUser(user, trimmedEmail, password);
      router.replace('/verify-email');
    } catch (linkError) {
      setError(formatEmailAuthError(linkError));
    } finally {
      setLoading(false);
    }
  };

  // ── RECOVERY MODE (not logged in) ──────────────────────────────────────────
  const handleRecovery = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      setError('Enter the phone number you used to sign up.');
      return;
    }
    const normalisedPhone = normalisePhone(trimmedPhone);
    if (!/^\+[1-9]\d{7,14}$/.test(normalisedPhone)) {
      setError('Please enter a valid phone number (e.g. +91 9876543210).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reflex/link-phone-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalisedPhone, email: trimmedEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setError('No account found with that phone number. Double-check the number and try again.');
        } else if (res.status === 409) {
          setError('This email is already linked to a different account. Try another email or go to login.');
        } else {
          setError(data.error || 'Something went wrong. Please try again.');
        }
        return;
      }
      // Success — now they can log in with email+password, redirect to login
      setSuccess(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── SUCCESS STATE ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white flex items-center justify-center">
        <div className="max-w-md w-full flex flex-col gap-6 text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-3xl font-black italic uppercase leading-tight tracking-tighter">
            Email <span className="text-primary">Linked!</span>
          </h1>
          <p className="text-sm font-semibold text-white/60 leading-relaxed">
            Your account is now secured. All your streaks, scores, and data remain completely safe.
            You can now log in using your new email &amp; password.
          </p>
          <button
            onClick={() => router.replace('/login')}
            className="btn-primary flex h-14 w-full items-center justify-center gap-2"
          >
            GO TO LOGIN <ArrowRight className="h-4 w-4" />
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
              {isLoggedIn ? 'Secure your account' : 'Account recovery'}
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            {isLoggedIn ? (
              <>Add an <span className="text-primary">email.</span></>
            ) : (
              <>Recover your <span className="text-primary">account.</span></>
            )}
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            {isLoggedIn
              ? 'Your phone number, streaks, subscription and history all stay exactly as they are — this just adds an email + password login on top of your existing account.'
              : 'Enter the phone number you signed up with, choose a new email and password. Your streaks, scores and subscription will all be transferred to the email login.'}
          </p>
        </div>

        <section className="flex flex-col gap-4 mt-8">
          {/* Recovery mode only: phone number field */}
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
                onKeyDown={(e) => e.key === 'Enter' && handleRecovery()}
                placeholder="+91 98765 43210"
                className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary"
                autoFocus
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-white/40 uppercase">
              {isLoggedIn ? 'Email' : 'New Email Address'}
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (isLoggedIn ? handleLink() : handleRecovery())}
              placeholder="you@email.com"
              className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary"
              autoFocus={isLoggedIn}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-white/40 uppercase">
              {isLoggedIn ? 'Password' : 'New Password'}
            </span>
            <div className="flex items-center border-b border-white/20 focus-within:border-primary">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (isLoggedIn ? handleLink() : handleRecovery())}
                placeholder="At least 6 characters"
                className="w-full bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="px-1 text-white/40 hover:text-white">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}

          <button
            onClick={isLoggedIn ? handleLink : handleRecovery}
            disabled={loading}
            className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading
              ? (isLoggedIn ? 'LINKING...' : 'RECOVERING...')
              : (isLoggedIn ? 'ADD EMAIL & SEND VERIFICATION' : 'LINK EMAIL TO MY ACCOUNT')}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => router.back()}
            className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
          >
            {isLoggedIn ? 'Not now' : 'Back to login'}
          </button>
        </section>
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
