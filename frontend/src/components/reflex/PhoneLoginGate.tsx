'use client';

import React, { useState } from 'react';
import { Phone, ShieldCheck, ArrowRight } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { sendOtp, confirmOtp } from '@/lib/firebase-auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

const RECAPTCHA_CONTAINER_ID = 'reflex-phone-recaptcha';

interface PhoneLoginGateProps {
  onLoggedIn: () => void;
}

export default function PhoneLoginGate({ onLoggedIn }: PhoneLoginGateProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [referral, setReferral] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    const trimmed = phone.trim();
    // Expect E.164 format (+countrycode number). Basic sanity check only —
    // Firebase itself will reject genuinely invalid numbers.
    if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
      setError('Enter your number in international format, e.g. +14155551234');
      return;
    }
    setLoading(true);
    try {
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
    if (!confirmation) return;
    setError(null);
    setLoading(true);
    try {
      await confirmOtp(confirmation, code.trim(), referral.trim() || undefined);
      onLoggedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-6 border-primary/20 bg-black/40 flex flex-col gap-5">
      <div id={RECAPTCHA_CONTAINER_ID} />

      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
          Login required for leaderboard
        </span>
      </div>

      {step === 'phone' ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-white/40 uppercase">Phone Number</span>
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-primary">
              <Phone className="w-4 h-4 text-white/30" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+14155551234"
                className="flex-1 bg-transparent outline-none text-sm font-bold text-white placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-white/40 uppercase">Referral Code (optional)</span>
            <input
              type="text"
              value={referral}
              onChange={(e) => setReferral(e.target.value.toUpperCase())}
              placeholder="e.g. TITAN7"
              maxLength={6}
              className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary placeholder:text-white/20"
            />
          </div>

          {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}

          <NeonButton onClick={handleSendOtp} disabled={loading} className="w-full h-14 disabled:opacity-50">
            {loading ? 'SENDING...' : 'SEND CODE'} <ArrowRight className="w-4 h-4 ml-1 inline" />
          </NeonButton>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-white/40 uppercase">Enter the 6-digit code sent to {phone}</span>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-2xl font-black text-white text-center tracking-[6px] outline-none focus:border-primary placeholder:text-white/20"
            />
          </div>

          {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}

          <NeonButton onClick={handleVerify} disabled={loading || code.length < 6} className="w-full h-14 disabled:opacity-50">
            {loading ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
          </NeonButton>
          <button onClick={() => setStep('phone')} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest">
            Use a different number
          </button>
        </>
      )}
    </GlassCard>
  );
}
