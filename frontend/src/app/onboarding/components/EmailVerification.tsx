'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck, ArrowLeft, Sparkles, Lock, RefreshCw, MailCheck, AlertTriangle } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import {
  sendPasswordlessSignInLink,
  refreshEmailVerified,
  ensureUserProfile,
  saveProfileDetails,
  formatEmailAuthError,
  watchAuthState,
  loginWithGoogle,
  formatGoogleAuthError,
  checkGoogleRedirectResult,
} from '@/lib/firebase-auth';
import { firebaseAuth } from '@/lib/firebase';

const RESEND_COOLDOWN_SECONDS = 30;

/** Inline Google "G" logo */
function GoogleLogo({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const EmailVerification: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [step, setStep] = useState<'details' | 'pending'>('details');
  const [email, setEmail] = useState(data.email || '');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  /** Save profile details and advance to next onboarding step. */
  const saveAndAdvance = async (user: import('firebase/auth').User) => {
    await ensureUserProfile(user);
    const avatar = typeof window !== 'undefined' ? localStorage.getItem('boxing_user_avatar') || undefined : undefined;
    await saveProfileDetails(user, {
      displayName: data.ringName,
      age: Number(data.age),
      profession: data.profession,
      promiseWord: data.promiseWord,
      avatarUrl: avatar,
    });
    nextStep();
  };

  // Listen to auth state: if user clicked the magic link in another tab or app,
  // automatically advance them without requiring manual button clicks!
  useEffect(() => {
    const unsubscribe = watchAuthState(async (currentUser) => {
      if (currentUser && currentUser.emailVerified) {
        try {
          await saveAndAdvance(currentUser);
        } catch {
          // ignore — user can tap manual button below
        }
      }
    });
    return () => unsubscribe();
  }, [data, nextStep]);

  // Handle Google redirect result on page load
  useEffect(() => {
    checkGoogleRedirectResult().then(async (user) => {
      if (!user) return;
      try {
        await saveAndAdvance(user);
      } catch {
        // ignore
      }
    });
  }, []);

  const handleGoogleVerify = async () => {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      // Google sign-in always gives a verified email
      updateData({ email: user.email || '' });
      await saveAndAdvance(user);
    } catch (err: any) {
      if (err?.message === 'REDIRECT_STARTED') return;
      setError(formatGoogleAuthError(err));
      setGoogleLoading(false);
    }
  };

  const handleSendLink = async () => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordlessSignInLink(trimmedEmail, '/onboarding');
      updateData({ email: trimmedEmail });
      setStep('pending');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfo(`1-tap sign-in link sent to ${trimmedEmail}`);
    } catch (e) {
      setError(formatEmailAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    await handleSendLink();
  };

  const handleCheckVerified = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      setError('Please open the link sent to your email to verify and sign in.');
      return;
    }
    setError(null);
    setInfo(null);
    setChecking(true);
    try {
      const verified = await refreshEmailVerified(user);
      if (!verified) {
        setError('Not verified yet. Open the link in the email we sent, then try again.');
        return;
      }

      await saveAndAdvance(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-3 sm:mb-5">
        <span className="text-sm font-black italic uppercase tracking-tight text-white block mb-2 sm:mb-3">
          Spar<span className="text-primary">ai</span>
        </span>
        <StepBadge />

        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-cyan-500/10 border border-primary/40 shadow-[0_0_20px_rgba(226,255,59,0.18)] flex items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-primary block leading-none">
                2 COMBAT MERITS WAITING AHEAD
              </span>
              <span className="text-[10px] font-bold text-white/85 leading-tight block mt-0.5">
                Punch Power (PSI) &amp; Reflex Speed unlock right after your email is verified.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 border border-primary/30 text-primary text-[8px] font-black uppercase shrink-0">
            <Lock className="w-2.5 h-2.5" />
            <span>LOCKED</span>
          </div>
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          {step === 'details' ? (
            <>Verify your <span className="text-primary">fighter account</span>.</>
          ) : (
            <>Check your <span className="text-primary">email</span>.</>
          )}
        </h1>
        <p className="text-white/50 mt-2 text-xs sm:text-sm leading-relaxed font-semibold">
          {step === 'details'
            ? 'Verify instantly with Google (recommended) or use a magic email link.'
            : `Open the link we sent to ${email} to unlock your combat merits.`}
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 sm:gap-5 my-auto">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[9px] font-black text-primary uppercase tracking-widest">End-to-End Encrypted</span>
        </div>

        {step === 'details' ? (
          <div className="flex flex-col gap-4">
            {/* Google Sign-In — primary & recommended */}
            <button
              onClick={handleGoogleVerify}
              disabled={googleLoading || loading}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-[#1f1f1f] text-sm font-bold tracking-tight shadow-lg hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {googleLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
              ) : (
                <GoogleLogo />
              )}
              {googleLoading ? 'VERIFYING...' : 'VERIFY WITH GOOGLE'}
            </button>
            <p className="text-[9px] text-center text-white/35 font-semibold -mt-2">
              Fastest — works instantly, even in installed apps
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">or email link</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-white/40 uppercase">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@email.com"
                className="w-full bg-transparent border-b border-white/20 py-2 text-2xl font-bold outline-none focus:border-primary transition-all pb-1 tracking-tight text-white"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-center py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_20px_rgba(226,255,59,0.2)]">
                <MailCheck className="h-7 w-7 text-primary animate-pulse" />
              </div>
            </div>

            {info && <p className="text-[10px] font-bold text-primary text-center">{info}</p>}

            {/* Spam folder guidance */}
            <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mx-auto max-w-xs">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-[10px] font-semibold text-yellow-300/80 leading-relaxed">
                Don&apos;t see it? Check your <strong>Spam</strong> or <strong>Promotions</strong> folder.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { setStep('details'); setError(null); setInfo(null); }}
                className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Change Email
              </button>

              <button
                disabled={cooldown > 0 || loading}
                onClick={handleResend}
                className="text-[10px] font-black uppercase tracking-widest py-1 flex items-center gap-1 disabled:opacity-30 text-primary hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Resend {cooldown > 0 ? `(${cooldown}s)` : ''}
              </button>
            </div>

            {/* Also offer Google as escape hatch on the pending screen */}
            <div className="flex items-center gap-3 mt-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <button
              onClick={handleGoogleVerify}
              disabled={googleLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 text-[11px] font-bold text-white tracking-tight hover:bg-white/15 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {googleLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleLogo className="h-4 w-4" />
              )}
              {googleLoading ? 'VERIFYING...' : 'VERIFY WITH GOOGLE INSTEAD'}
            </button>
          </div>
        )}

      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        {error && (
          <div className="p-2.5 rounded-xl border border-red-500/50 bg-red-500/15 text-xs font-bold text-center leading-relaxed text-red-400">
            {error}
          </div>
        )}
        {step === 'details' ? (
          <button
            onClick={handleSendLink}
            disabled={loading || googleLoading}
            className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'SENDING LINK...' : 'SEND VERIFICATION LINK'} <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleCheckVerified}
            disabled={checking}
            className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {checking ? 'CHECKING...' : "I'VE VERIFIED — UNLOCK ALL MERITS"} <ChevronRight size={20} />
          </button>
        )}

        <div className="flex justify-center items-center px-1">
          <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1">
            Back
          </button>
        </div>
        <p className="text-[9px] text-center text-white/25 font-semibold">
          Email verification is required to unlock your full combat profile.
        </p>
      </footer>
    </div>
  );
};

export default EmailVerification;
