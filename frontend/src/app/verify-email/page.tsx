'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, RefreshCw, LogOut } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import {
  sendEmailVerificationOtp,
  verifyEmailVerificationOtp,
  ensureUserProfile,
  saveProfileDetails,
  signOutFirebase,
  ProfileRequestError,
} from '@/lib/firebase-auth';
import { cacheProfileLocally } from '@/lib/profile-client';

const RESEND_COOLDOWN_SECONDS = 45;
const CODE_LENGTH = 6;

// A 6-digit code typed back into the same page beats a "click the link in
// your email" flow on two counts:
//  1. Deliverability — the code goes out through a real transactional email
//     API (see lib/server/email-otp.ts), not Firebase's own shared mailer,
//     which is what Gmail was silently dropping/spam-filtering.
//  2. Installed PWA — there's no external link to open, so there's no
//     "opens in the system browser and loses the app context" problem.
//     Everything happens on this one screen, browser tab or installed app
//     alike.
export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseUser();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // If the fighter lands here directly (e.g. refresh) with no code sent
    // yet this session, send the first one automatically.
    if (!autoSentRef.current) {
      autoSentRef.current = true;
      sendEmailVerificationOtp(user).then((res) => {
        if (!res.ok) setError(res.message || 'Could not send the code.');
        else setCooldown(RESEND_COOLDOWN_SECONDS);
      });
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
        setError('Still showing as unverified — try again in a moment.');
        return;
      }
      // Profile creation is best-effort here; the app-level layout also
      // calls ensureUserProfile on every protected route.
      router.replace('/dashboard');
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    // Supports pasting the whole code into one box.
    const chars = clean.split('');
    const next = [...digits];
    for (let i = 0; i < chars.length && index + i < CODE_LENGTH; i++) {
      next[index + i] = chars[i];
    }
    setDigits(next);
    const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
    inputsRef.current[nextIndex]?.focus();
    if (next.every((d) => d)) handleVerify(next.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    if (!user) return;
    const otp = code ?? digits.join('');
    if (otp.length !== CODE_LENGTH) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError(null);
    setInfo(null);
    setVerifying(true);
    try {
      const result = await verifyEmailVerificationOtp(user, otp);
      if (!result.ok) {
        setError(result.message || 'Could not verify that code.');
        setDigits(Array(CODE_LENGTH).fill(''));
        inputsRef.current[0]?.focus();
        return;
      }
      await finishAfterVerified();
    } catch {
      setError('Could not verify that code. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!user || cooldown > 0) return;
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const result = await sendEmailVerificationOtp(user);
      if (!result.ok) {
        setError(result.message || 'Could not resend right now.');
        return;
      }
      setInfo('New code sent — check your inbox (and spam folder, just in case).');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
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
            Enter your <span className="text-primary">code.</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            We sent a 6-digit code to <span className="text-white">{user?.email || 'your email'}</span>. It expires in
            10 minutes.
          </p>
        </div>

        <section className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={CODE_LENGTH}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={verifying}
                className="h-14 w-11 rounded-xl border border-white/20 bg-white/5 text-center text-2xl font-black outline-none focus:border-primary disabled:opacity-50"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}
          {info && <p className="text-center text-[11px] font-bold leading-relaxed text-primary">{info}</p>}

          <div className="flex w-full flex-col gap-4">
            <button
              onClick={() => handleVerify()}
              disabled={verifying}
              className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
            </button>

            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
              {resending ? 'SENDING...' : cooldown > 0 ? `RESEND (${cooldown}s)` : 'RESEND CODE'}
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
