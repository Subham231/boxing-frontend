'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck, ArrowLeft, Sparkles, Lock, RefreshCw, MailCheck, Eye, EyeOff } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import {
  signUpWithEmail,
  checkEmailExists,
  resendVerificationEmail,
  refreshEmailVerified,
  saveProfileDetails,
  formatEmailAuthError,
} from '@/lib/firebase-auth';
import { firebaseAuth } from '@/lib/firebase';

const RESEND_COOLDOWN_SECONDS = 30;

const EmailVerification: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [step, setStep] = useState<'details' | 'pending'>('details');
  const [email, setEmail] = useState(data.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleCreateAccount = async () => {
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
      if (await checkEmailExists(trimmedEmail)) {
        setError('You already have an account. Please use the separate login page.');
        return;
      }
      await signUpWithEmail(trimmedEmail, password);
      updateData({ email: trimmedEmail });
      setStep('pending');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setError(formatEmailAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const user = firebaseAuth.currentUser;
    if (!user || cooldown > 0) return;
    setError(null);
    setInfo(null);
    try {
      await resendVerificationEmail(user);
      setInfo('Verification email sent again — check your inbox and spam folder.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('Could not resend right now. Wait a bit and try again.');
    }
  };

  const handleCheckVerified = async () => {
    const user = firebaseAuth.currentUser;
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

      const avatar = typeof window !== 'undefined' ? localStorage.getItem('boxing_user_avatar') || undefined : undefined;
      const savedProfile = await saveProfileDetails(user, {
        displayName: data.ringName,
        age: Number(data.age),
        profession: data.profession,
        promiseWord: data.promiseWord,
        avatarUrl: avatar,
      });
      if (!savedProfile) {
        setError('Your account was verified, but saving your profile details failed. Please try again.');
        return;
      }

      nextStep();
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
                Punch Power (PSI) & Reflex Speed unlock right after your email is verified.
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
            <>Create your <span className="text-primary">fighter account</span>.</>
          ) : (
            <>Check your <span className="text-primary">email</span>.</>
          )}
        </h1>
        <p className="text-white/50 mt-2 text-xs sm:text-sm leading-relaxed font-semibold">
          {step === 'details'
            ? 'Email + password — no SMS, no OTP. We just need to verify it once.'
            : `Open the link we sent to ${email}, then come back and tap the button below.`}
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 sm:gap-5 my-auto">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[9px] font-black text-primary uppercase tracking-widest">End-to-End Encrypted</span>
        </div>

        {step === 'details' ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-white/40 uppercase">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full bg-transparent border-b border-white/20 py-2 text-2xl font-bold outline-none focus:border-primary transition-all pb-1 tracking-tight"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-white/40 uppercase">Password</span>
              <div className="flex items-center border-b border-white/20 focus-within:border-primary">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-transparent py-2 text-2xl font-bold outline-none pb-1 tracking-tight"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="px-1 text-white/40 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-center py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <MailCheck className="h-7 w-7 text-primary" />
              </div>
            </div>

            {info && <p className="text-[10px] font-bold text-primary text-center">{info}</p>}

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { setStep('details'); setError(null); setInfo(null); }}
                className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Change Email
              </button>

              <button
                disabled={cooldown > 0}
                onClick={handleResend}
                className="text-[10px] font-black uppercase tracking-widest py-1 flex items-center gap-1 disabled:opacity-30 text-primary hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Resend {cooldown > 0 ? `(${cooldown}s)` : ''}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        {step === 'details' ? (
          <button onClick={handleCreateAccount} disabled={loading} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'CREATING...' : 'CREATE ACCOUNT'} <ChevronRight size={20} />
          </button>
        ) : (
          <button onClick={handleCheckVerified} disabled={checking} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-50">
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
