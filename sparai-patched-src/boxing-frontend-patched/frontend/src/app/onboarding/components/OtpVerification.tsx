'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { sendOtp, confirmOtp, checkOtpRateLimit, saveProfileDetails } from '@/lib/firebase-auth';
import { cacheProfileLocally } from '@/lib/profile-client';

const RECAPTCHA_CONTAINER_ID = 'onboarding-phone-recaptcha';

const OtpVerification: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState(data.phone?.startsWith('+') ? data.phone : '+91 ');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { user, isNew, profile } = await confirmOtp(confirmation, trimmedCode);
      updateData({ phone: trimmedPhone });

      const avatar = typeof window !== 'undefined' ? localStorage.getItem('boxing_user_avatar') || undefined : undefined;
      await saveProfileDetails(user, {
        displayName: data.ringName,
        age: Number(data.age),
        profession: data.profession,
        promiseWord: data.promiseWord,
        avatarUrl: avatar,
      }).catch(() => {});

      if (isNew) {
        nextStep();
        return;
      }

      cacheProfileLocally(profile);
      try {
        localStorage.setItem('boxing_onboarding_done', 'true');
        const existingRaw = localStorage.getItem('boxing_onboarding_data');
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        localStorage.setItem(
          'boxing_onboarding_data',
          JSON.stringify({ ...existing, onboarding_completed: true })
        );
      } catch { }
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <div id={RECAPTCHA_CONTAINER_ID} />

      <header className="text-left mb-6">
        <span className="text-sm font-black italic uppercase tracking-tight text-white block mb-3">
          Spar<span className="text-primary">ai</span>
        </span>
        <StepBadge />
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Verify your <span className="text-primary">fight number</span>.
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          {step === 'phone'
            ? "We'll send a one-time code to verify your identity. No passwords, ever."
            : `Enter the 6-digit code sent to ${phone}`}
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[9px] font-black text-primary uppercase tracking-widest">Secure Enclave</span>
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
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-white/40 uppercase">6-Digit Code</span>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-2xl font-black text-white text-center tracking-[6px] outline-none focus:border-primary placeholder:text-white/20"
              autoFocus
            />
            <button
              onClick={() => { setStep('phone'); setCode(''); setError(null); }}
              className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 flex items-center gap-1 self-start mt-1"
            >
              <ArrowLeft className="w-3 h-3" /> Change Number
            </button>
          </div>
        )}

        {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}
      </main>

      <footer className="mt-8 flex flex-col gap-4">
        {step === 'phone' ? (
          <button onClick={handleSendOtp} disabled={loading} className="btn-primary w-full h-16 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'SENDING...' : 'SEND OTP CODE'} <ChevronRight size={20} />
          </button>
        ) : (
          <button onClick={handleVerify} disabled={loading || code.length < 6} className="btn-primary w-full h-16 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'VERIFYING...' : 'VERIFY & CONTINUE'} <ChevronRight size={20} />
          </button>
        )}

        <div className="flex justify-center items-center px-1">
          <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-2">
            Back
          </button>
        </div>
        <p className="text-[9px] text-center text-white/25 font-semibold">
          Phone verification is required to enter the ring.
        </p>
      </footer>
    </div>
  );
};

export default OtpVerification;
