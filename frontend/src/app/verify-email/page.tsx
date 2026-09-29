'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailCheck, RefreshCw, LogOut } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import {
  ensureUserProfile,
  refreshEmailVerified,
  sendFirebaseEmailVerification,
  signOutFirebase,
} from '@/lib/firebase-auth';
import { cacheProfileLocally } from '@/lib/profile-client';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseUser();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const sentInitialLink = useRef(false);
  const finishing = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const finishIfVerified = async () => {
    if (!user || finishing.current) return;
    finishing.current = true;
    setError(null);
    try {
      if (!(await refreshEmailVerified(user))) {
        setInfo('Once you open the link, return here and continue.');
        finishing.current = false;
        return;
      }
      const { profile, sessionToken } = await ensureUserProfile(user);
      cacheProfileLocally(profile);
      if (sessionToken) localStorage.setItem('sparai_session_token', sessionToken);
      const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>;
      const complete = !!onboardingData.onboarding_completed || !!onboardingData.ring_name;
      router.replace(complete ? '/dashboard' : '/onboarding');
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : 'Could not finish signup. Please try again.');
      finishing.current = false;
    }
  };

  const sendVerificationLink = async (isResend: boolean) => {
    if (!user?.email || sending || (isResend && cooldown > 0)) return;
    setSending(true);
    setError(null);
    setInfo(null);
    try {
      await sendFirebaseEmailVerification(user, '/onboarding');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfo(`A one-click verification link was sent to ${user.email}.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send the verification link.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    void refreshEmailVerified(user)
      .then((verified) => {
        if (cancelled) return;
        if (verified) {
          void finishIfVerified();
        } else if (!sentInitialLink.current) {
          sentInitialLink.current = true;
          void sendVerificationLink(false);
        }
      })
      .catch((refreshError: unknown) => {
        if (!cancelled) {
          setError(refreshError instanceof Error ? refreshError.message : 'Could not check email verification.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const handleSignOut = async () => {
    await signOutFirebase();
    router.replace('/login');
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-between">
        <div>
          <span className="text-sm font-black italic uppercase tracking-tight">
            Spar<span className="text-primary">ai</span>
          </span>
          <div className="mt-10 flex items-center gap-2 text-primary">
            <MailCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">One step left</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Verify your <span className="text-primary">email.</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            Open the secure link sent to <span className="text-white">{user?.email || 'your email'}</span>. No code or
            password is needed.
          </p>
        </div>

        <section className="flex flex-col items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(226,255,59,0.2)]">
            <MailCheck className="h-10 w-10 animate-pulse text-primary" />
          </div>
          {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}
          {info && <p className="text-center text-[11px] font-bold leading-relaxed text-primary">{info}</p>}

          <div className="flex w-full flex-col gap-4">
            <button
              onClick={() => void finishIfVerified()}
              disabled={finishing.current}
              className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              I&apos;VE VERIFIED — CONTINUE
            </button>
            <button
              onClick={() => void sendVerificationLink(true)}
              disabled={sending || cooldown > 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
              {sending ? 'SENDING LINK...' : cooldown > 0 ? `RESEND (${cooldown}s)` : 'RESEND LINK'}
            </button>
            <button
              onClick={() => void handleSignOut()}
              className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
