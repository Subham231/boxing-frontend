'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailCheck, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import {
  resendVerificationEmail,
  refreshEmailVerified,
  ensureUserProfile,
  saveProfileDetails,
  signOutFirebase,
  ProfileRequestError,
} from '@/lib/firebase-auth';
import { cacheProfileLocally } from '@/lib/profile-client';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseUser();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const finishAfterVerified = async () => {
    if (!user) return;
    try {
      const { profile } = await ensureUserProfile(user);
      cacheProfileLocally(profile);
      const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>;
      if (typeof window !== 'undefined' && onboardingData.onboarding_completed) {
        localStorage.setItem('boxing_onboarding_done', 'true');
      }
      if (!onboardingData.onboarding_completed) {
        saveProfileDetails(user, { onboardingData: { ...onboardingData } }).catch(() => {});
        router.replace('/onboarding');
        return;
      }
      router.replace('/dashboard');
    } catch (e) {
      if (e instanceof ProfileRequestError && e.code === 'EMAIL_NOT_VERIFIED') {
        // Shouldn't normally happen right after a successful verified
        // reload, but guards against a stale/edge-case ID token.
        setError('Still showing as unverified — try refreshing again in a moment.');
        return;
      }
      // Profile creation is best-effort here; the app-level layout also
      // calls ensureUserProfile on every protected route, so a transient
      // failure here isn't fatal — let the fighter into the app and let
      // that retry happen.
      router.replace('/dashboard');
    }
  };

  const handleCheckVerified = async () => {
    if (!user) return;
    setError(null);
    setInfo(null);
    setChecking(true);
    try {
      const verified = await refreshEmailVerified(user);
      if (!verified) {
        setError("Not verified yet. Open the link in the email we sent, then try again.");
        return;
      }
      await finishAfterVerified();
    } catch {
      setError('Could not check verification status. Try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!user || cooldown > 0) return;
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await resendVerificationEmail(user);
      setInfo('Verification email sent again — check your inbox and spam folder.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('Could not resend right now. Wait a bit and try again.');
    } finally {
      setResending(false);
    }
  };

  const handleUseDifferentEmail = async () => {
    await signOutFirebase();
    router.replace('/signup');
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
            <span className="text-white">{user?.email || 'your email'}</span>. Open it, then come back and tap
            &ldquo;I&apos;ve verified&rdquo; below.
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
              onClick={handleCheckVerified}
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
          </div>
        </section>
      </div>
    </main>
  );
}
