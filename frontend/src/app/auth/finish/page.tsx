'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowRight, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import {
  completePasswordlessSignIn,
  ensureUserProfile,
  formatEmailAuthError,
  isPasswordlessSignInLink,
} from '@/lib/firebase-auth';
import { cacheProfileLocally } from '@/lib/profile-client';

function FinishAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'verifying' | 'need_email' | 'success' | 'error'>('verifying');
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const continueParam = searchParams?.get('continue') || '';
  const urlEmail = searchParams?.get('email') || '';

  const processSignIn = async (emailOverride?: string) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const user = await completePasswordlessSignIn(emailOverride || urlEmail);
      setStatus('success');

      // Ensure token is fresh and profile exists in Supabase
      await user.getIdToken(true);
      const { profile, sessionToken } = await ensureUserProfile(user);
      cacheProfileLocally(profile);

      if (sessionToken && typeof window !== 'undefined') {
        localStorage.setItem('sparai_session_token', sessionToken);
      }

      const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>;
      const isCompleted =
        !!onboardingData.onboarding_completed ||
        !!onboardingData.ring_name ||
        (typeof window !== 'undefined' && localStorage.getItem('boxing_onboarding_done') === 'true');

      if (isCompleted && typeof window !== 'undefined') {
        localStorage.setItem('boxing_onboarding_done', 'true');
      }

      // Route fighter to destination
      if (continueParam && continueParam !== '/auth/finish') {
        router.replace(continueParam);
      } else {
        router.replace(isCompleted ? '/dashboard' : '/onboarding');
      }
    } catch (err: any) {
      if (err?.message === 'NO_EMAIL_FOUND') {
        setStatus('need_email');
        setLoading(false);
        return;
      }
      setStatus('error');
      setErrorMsg(formatEmailAuthError(err));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isPasswordlessSignInLink()) {
      setStatus('error');
      setErrorMsg('This link is invalid or has already been used.');
      return;
    }

    void processSignIn();
  }, []);

  const handleManualEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setErrorMsg('Enter a valid email address.');
      return;
    }
    await processSignIn(clean);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white flex items-center justify-center">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center text-center">
        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-primary/10 shadow-[0_0_30px_rgba(226,255,59,0.2)]">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tight">
                Authenticating <span className="text-primary">Fighter...</span>
              </h1>
              <p className="mt-2 text-xs font-semibold text-white/50">
                Verifying your secure sign-in link. One second...
              </p>
            </div>
          </div>
        )}

        {status === 'need_email' && (
          <div className="w-full flex flex-col gap-6">
            <div className="flex items-center justify-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">One quick step</span>
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase leading-none tracking-tight">
                Confirm your <span className="text-primary">email.</span>
              </h1>
              <p className="mt-2 text-xs font-semibold text-white/50 leading-relaxed">
                Because you opened this link on another app or device, please confirm your email address to complete sign-in.
              </p>
            </div>

            <form onSubmit={handleManualEmailSubmit} className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[9px] font-bold text-white/40 uppercase">Email</span>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary text-white"
                  autoFocus
                />
              </div>

              {errorMsg && (
                <p className="text-left text-[11px] font-bold text-red-400">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? 'CONFIRMING...' : 'COMPLETE SIGN IN'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-primary shadow-[0_0_30px_rgba(226,255,59,0.3)]">
              <Sparkles className="h-9 w-9 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tight">
                Access <span className="text-primary">Granted.</span>
              </h1>
              <p className="mt-2 text-xs font-semibold text-white/60">
                Email verified. Entering the ring...
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tight">
                Sign-in Link <span className="text-red-400">Expired</span>
              </h1>
              <p className="mt-2 text-xs font-semibold text-white/60 leading-relaxed">
                {errorMsg || 'This link is no longer valid. Sign-in links can only be used once.'}
              </p>
            </div>

            <button
              onClick={() => router.replace('/login')}
              className="btn-primary flex h-14 w-full items-center justify-center gap-2 mt-4"
            >
              REQUEST NEW LINK <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function FinishAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </main>
      }
    >
      <FinishAuthContent />
    </Suspense>
  );
}
