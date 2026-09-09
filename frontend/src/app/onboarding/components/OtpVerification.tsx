'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck, ArrowLeft, Sparkles, Clock, Lock, RefreshCw } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { sendOtp, confirmOtp, checkPhoneExists, checkOtpRateLimit, saveProfileDetails } from '@/lib/firebase-auth';

const RECAPTCHA_CONTAINER_ID = 'onboarding-phone-recaptcha';

const OtpVerification: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState(data.phone?.startsWith('+') ? data.phone : '+91 ');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(90);

  // 90-second countdown timer to make users patient during carrier SMS delivery
  useEffect(() => {
    if (step !== 'otp') return;
    setSecondsLeft(90);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleSendOtp = async () => {
    setError(null);
    const trimmed = phone.replace(/\s+/g, '').trim();
    if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
      setError('Enter your number in international format, e.g. +919876543210');
      return;
    }

    setLoading(true);
    try {
      const limitCheck = await checkOtpRateLimit(trimmed);
      if (!limitCheck.allowed) {
        setError(limitCheck.reason || 'Too many attempts for this number today.');
        return;
      }
      const result = await sendOtp(trimmed, RECAPTCHA_CONTAINER_ID);
      setConfirmation(result);
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    const trimmedPhone = phone.replace(/\s+/g, '').trim();
    const trimmedCode = code.trim();

    if (!confirmation) return;
    setLoading(true);
    try {
      if (await checkPhoneExists(trimmedPhone)) {
        setError('You already have an account. Please use the separate login page.');
        return;
      }
      const { user, isNew } = await confirmOtp(confirmation, trimmedCode);
      if (!isNew) {
        setError('You already have an account. Please use the separate login page.');
        return;
      }
      updateData({ phone: trimmedPhone });

      const avatar = typeof window !== 'undefined' ? localStorage.getItem('boxing_user_avatar') || undefined : undefined;
      const savedProfile = await saveProfileDetails(user, {
        phone: trimmedPhone,
        displayName: data.ringName,
        age: Number(data.age),
        profession: data.profession,
        promiseWord: data.promiseWord,
        avatarUrl: avatar,
      });
      if (!savedProfile) {
        setError('Your account was created, but saving your profile details failed. Please try again.');
        return;
      }

      nextStep();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <div id={RECAPTCHA_CONTAINER_ID} />

      <header className="text-left mb-3 sm:mb-5">
        <span className="text-sm font-black italic uppercase tracking-tight text-white block mb-2 sm:mb-3">
          Spar<span className="text-primary">ai</span>
        </span>
        <StepBadge />

        {/* Animated 2 Merits Waiting Ahead Banner */}
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
                Punch Power (PSI) & Reflex Speed unlock right after code confirmation.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 border border-primary/30 text-primary text-[8px] font-black uppercase shrink-0">
            <Lock className="w-2.5 h-2.5" />
            <span>LOCKED</span>
          </div>
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Verify your <span className="text-primary">fight number</span>.
        </h1>
        <p className="text-white/50 mt-2 text-xs sm:text-sm leading-relaxed font-semibold">
          {step === 'phone'
            ? "We'll send a one-time code to verify your fighter identity. No passwords, ever."
            : `Enter the 6-digit code sent to ${phone}`}
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 sm:gap-5 my-auto">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[9px] font-black text-primary uppercase tracking-widest">End-to-End Encrypted</span>
        </div>

        {step === 'phone' ? (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-white/40 uppercase">Phone Number</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-full bg-transparent border-b border-white/20 py-2 text-2xl font-bold outline-none focus:border-primary transition-all pb-1 tracking-tight"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-bold text-white/40 uppercase">6-Digit Code</span>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-2xl font-black text-white text-center tracking-[6px] outline-none focus:border-primary placeholder:text-white/20 shadow-[0_0_20px_rgba(226,255,59,0.1)]"
              autoFocus
            />

            {/* 90-Second Patient Countdown Timer Display */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
                  Carrier Dispatch Window
                </span>
              </div>
              <span className={`text-xs font-black font-mono tracking-wider ${secondsLeft > 0 ? 'text-primary' : 'text-white/40'}`}>
                {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
              </span>
            </div>

            <p className="text-[9px] text-white/45 font-medium leading-relaxed">
              Please remain patient while telecom carriers deliver your high-priority SMS code.
            </p>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { setStep('phone'); setCode(''); setError(null); }}
                className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Change Number
              </button>

              <button
                disabled={secondsLeft > 0 || loading}
                onClick={handleSendOtp}
                className="text-[10px] font-black uppercase tracking-widest py-1 flex items-center gap-1 disabled:opacity-30 text-primary hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Resend Code {secondsLeft > 0 ? `(${secondsLeft}s)` : ''}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        {step === 'phone' ? (
          <button onClick={handleSendOtp} disabled={loading} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'SENDING...' : 'SEND OTP CODE'} <ChevronRight size={20} />
          </button>
        ) : (
          <button onClick={handleVerify} disabled={loading || code.length < 6} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'VERIFYING...' : 'VERIFY & UNLOCK ALL MERITS'} <ChevronRight size={20} />
          </button>
        )}

        <div className="flex justify-center items-center px-1">
          <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1">
            Back
          </button>
        </div>
        <p className="text-[9px] text-center text-white/25 font-semibold">
          Phone verification is required to unlock your full combat profile.
        </p>
      </footer>
    </div>
  );
};

export default OtpVerification;
