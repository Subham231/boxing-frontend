'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck, ArrowLeft, Sparkles, Lock, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import {
  signUpWithEmail,
  sendEmailVerificationOtp,
  verifyEmailVerificationOtp,
  ensureUserProfile,
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
  const [existingAccount, setExistingAccount] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleCreateAccount = async () => {
    setError(null);
    setExistingAccount(false);
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
      const user = await signUpWithEmail(trimmedEmail, password);
      updateData({ email: trimmedEmail });
      const sendResult = await sendEmailVerificationOtp(user);
      if (!sendResult.ok) {
        setError(sendResult.message || 'Could not send the code. Try resending on the next screen.');
      }
      setStep('pending');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
      if (code === 'auth/email-already-in-use') {
        setExistingAccount(true);
        setError('This email is already registered. Log in with the existing password, or reset it.');
        return;
      }
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
      const result = await sendEmailVerificationOtp(user);
      if (!result.ok) {
        setError(result.message || 'Could not resend right now.');
        return;
      }
      setInfo('New code sent — check your inbox (and spam folder, just in case).');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(6).fill(''));
      inputsRef.current[0]?.focus();
    } catch {
      setError('Could not resend right now. Wait a bit and try again.');
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    const next = [...digits];
    if (!clean) {
      next[index] = '';
      setDigits(next);
      return;
    }
    const chars = clean.split('');
    for (let i = 0; i < chars.length && index + i < 6; i++) {
      next[index + i] = chars[i];
    }
    setDigits(next);
    const nextIndex = Math.min(index + chars.length, 5);
    inputsRef.current[nextIndex]?.focus();
    if (next.every((d) => d)) handleCheckVerified(next.join(''));
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleCheckVerified = async (code?: string) => {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    const otp = code ?? digits.join('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError(null);
    setInfo(null);
    setChecking(true);
    try {
      const result = await verifyEmailVerificationOtp(user, otp);
      if (!result.ok) {
        setError(result.message || 'Could not verify that code.');
        setDigits(Array(6).fill(''));
        inputsRef.current[0]?.focus();
        return;
      }

      // Create the private profile row first. Email signup creates the
      // Firebase account before verification, while profile details are
      // intentionally stored only after the verified token is accepted.
      await ensureUserProfile(user);
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
            <>Enter your <span className="text-primary">code</span>.</>
          )}
        </h1>
        <p className="text-white/50 mt-2 text-xs sm:text-sm leading-relaxed font-semibold">
          {step === 'details'
            ? 'Email + password — no SMS, no OTP. We just need to verify it once.'
            : `We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setExistingAccount(false);
                  setError(null);
                }}
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
            <div className="flex justify-center gap-2 py-2">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  disabled={checking}
                  className="h-12 w-9 rounded-lg border border-white/20 bg-white/5 text-center text-xl font-black outline-none focus:border-primary disabled:opacity-50"
                  autoFocus={i === 0}
                />
              ))}
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
        {existingAccount && (
          <button
            type="button"
            onClick={() => window.location.assign('/login')}
            className="btn-primary flex h-11 w-full items-center justify-center gap-2 text-xs"
          >
            LOG IN WITH EMAIL <ChevronRight size={16} />
          </button>
        )}
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        {step === 'details' ? (
          <button onClick={handleCreateAccount} disabled={loading || existingAccount} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'CREATING...' : existingAccount ? 'ACCOUNT EXISTS — LOG IN' : 'CREATE ACCOUNT'} <ChevronRight size={20} />
          </button>
        ) : (
          <button onClick={() => handleCheckVerified()} disabled={checking} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-50">
            {checking ? 'VERIFYING...' : "VERIFY — UNLOCK ALL MERITS"} <ChevronRight size={20} />
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
