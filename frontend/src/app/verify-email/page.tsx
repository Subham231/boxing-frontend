'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailCheck, RefreshCw, LogOut, ShieldCheck, Phone } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { firebaseAuth } from '@/lib/firebase';
import {
  resendVerificationEmail,
  refreshEmailVerified,
  ensureUserProfile,
  signOutFirebase,
  ProfileRequestError,
  formatEmailAuthError,
} from '@/lib/firebase-auth';
import { cacheProfileLocally } from '@/lib/profile-client';

const RESEND_COOLDOWN_SECONDS = 30;
const AUTO_CHECK_INTERVAL_MS = 4000;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseUser();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Guards so the auto-check and the button can never both run the "finish"
  // step (profile creation + redirect) at the same time.
  const finishing = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const finishAfterVerified = useCallback(async (): Promise<void> => {
    const current = firebaseAuth.currentUser;
    if (!current || finishing.current) return;
    finishing.current = true;
    try {
      const { profile } = await ensureUserProfile(current);
      cacheProfileLocally(profile);
      const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>;
      const onboarded = !!onboardingData.onboarding_completed || !!onboardingData.ring_name;
      if (typeof window !== 'undefined' && onboarded) {
        localStorage.setItem('boxing_onboarding_done', 'true');
      }
      router.replace(onboarded ? '/dashboard' : '/onboarding');
    } catch (e) {
      finishing.current = false;
      if (e instanceof ProfileRequestError) {
        if (e.code === 'EMAIL_NOT_VERIFIED') {
          // Stale ID token edge case — the auto-check will retry shortly.
          setError('Email confirmed — finishing up. If this stays, tap the button again.');
          return;
        }
        if (e.code === 'ACCOUNT_EMAIL_CONFLICT' || e.code === 'ACCOUNT_PHONE_CONFLICT') {
          setError(e.message);
          return;
        }
      }
      // Anything else (network blip, server hiccup): the email IS verified, so
      // let the fighter in — the app layout retries profile creation on every
      // protected route.
      router.replace('/dashboard');
    }
  }, [router]);

  const runCheck = useCallback(
    async (manual: boolean): Promise<void> => {
      const current = firebaseAuth.currentUser;
      if (!current || inFlight.current || finishing.current) return;
      inFlight.current = true;
      if (manual) {
        setError(null);
        setInfo(null);
        setChecking(true);
      }
      try {
        const verified = await refreshEmailVerified(current);
        if (verified) {
          setError(null);
          await finishAfterVerified();
        } else if (manual) {
          setError(
            `Not verified yet for ${current.email || 'this email'}. Open the newest link in that inbox (check Spam / Promotions), then tap again — or resend the email.`,
          );
        }
      } catch (e) {
        if (manual) setError(formatEmailAuthError(e) || 'Could not check verification status. Try again.');
      } finally {
        inFlight.current = false;
        if (manual) setChecking(false);
      }
    },
    [finishAfterVerified],
  );

  // Auto-detect verification: when the fighter comes back to this tab/app, and
  // every few seconds while it is visible — they should not have to guess when
  // to tap the button. The ?verified=1 return link from the email also lands
  // here, so the first check fires immediately.
  useEffect(() => {
    if (authLoading || !user) return;
    void runCheck(false);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void runCheck(false);
    };
    const onFocus = () => void runCheck(false);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void runCheck(false);
    }, AUTO_CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [authLoading, user, runCheck]);

  const handleResend = async () => {
    const current = firebaseAuth.currentUser;
    if (!current || cooldown > 0) return;
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await resendVerificationEmail(current);
      setInfo('Verification email sent again — check your inbox and spam folder. Use only the newest email.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
      setError(
        code === 'auth/too-many-requests'
          ? 'Too many emails requested. Wait a few minutes, then try again.'
          : 'Could not resend right now. Wait a bit and try again.',
      );
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setResending(false);
    }
  };

  const handleUseDifferentEmail = async () => {
    await signOutFirebase();
    router.replace('/signup');
  };

  const handleUsePhone = async () => {
    await signOutFirebase();
    router.replace('/login/phone');
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-between">
        <div>
          <span className="text-sm font-black italic uppercase tracking-tight">Spar<span className="text-primary">ai</span></span>
          <div className="mt-10 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">One step left</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Check your <span className="text-primary">email.</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            We sent a verification link to{' '}
            <span className="text-white">{user?.email || 'your email'}</span>. Open it — this page
            continues on its own once it&apos;s verified. You can also tap &ldquo;I&apos;ve verified&rdquo; below.
          </p>
        </div>

        <section className="flex flex-col items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <MailCheck className="h-10 w-10 text-primary" />
          </div>

          {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}
          {info && <p className="text-center text-[11px] font-bold leading-relaxed text-primary">{info}</p>}

          <div className="flex w-full flex-col gap-4">
            <button
              onClick={() => runCheck(true)}
              disabled={checking}
              className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {checking ? 'CHECKING...' : "I'VE VERIFIED — CONTINUE"}
            </button>

            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
              {resending ? 'SENDING...' : cooldown > 0 ? `RESEND (${cooldown}s)` : 'RESEND VERIFICATION EMAIL'}
            </button>

            <button
              onClick={handleUseDifferentEmail}
              className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Use a different email
            </button>

            <button
              onClick={handleUsePhone}
              className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" />
              Joined before with your phone? Log in with phone
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
