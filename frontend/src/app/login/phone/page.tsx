'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { checkPhoneExists, checkOtpRateLimit, confirmOtp, sendOtp, saveProfileDetails } from '@/lib/firebase-auth';

const RECAPTCHA_CONTAINER_ID = 'login-phone-recaptcha';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+91 ');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    const normalizedPhone = phone.replace(/\s+/g, '').trim();
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError('Enter your phone number in international format, e.g. +919876543210.');
      return;
    }

    setLoading(true);
    try {
      if (!(await checkPhoneExists(normalizedPhone))) {
        setError('No account was found for this number. Please sign up first.');
        return;
      }
      const rateLimit = await checkOtpRateLimit(normalizedPhone);
      if (!rateLimit.allowed) {
        setError(rateLimit.reason || 'Too many attempts for this number today.');
        return;
      }
      setConfirmation(await sendOtp(normalizedPhone, RECAPTCHA_CONTAINER_ID));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!confirmation) return;
    setError(null);
    setLoading(true);
    try {
      const { user, profile } = await confirmOtp(confirmation, code.trim());
      if (typeof window !== 'undefined') {
        localStorage.setItem('boxing_onboarding_done', 'true');
        localStorage.removeItem('boxing_onboarding_step');
        localStorage.removeItem('boxing_onboarding_screen_order');
      }
      const onboardingData = (profile?.onboarding_data ?? {}) as Record<string, unknown>;
      if (!onboardingData.onboarding_completed) {
        await saveProfileDetails(user, {
          onboardingData: { ...onboardingData, onboarding_completed: true },
        }).catch(() => {});
      }
      router.replace('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-between">
        <div>
          <span className="text-sm font-black italic uppercase tracking-tight">Spar<span className="text-primary">ai</span></span>
          <div className="mt-10 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure login</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Welcome <span className="text-primary">back.</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            Sign in with the phone number already linked to your fighter account.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <div id={RECAPTCHA_CONTAINER_ID} />
          {!confirmation ? (
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+919876543210"
              className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary"
              autoFocus
            />
          ) : (
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-center text-2xl font-black tracking-[6px] outline-none focus:border-primary"
              autoFocus
            />
          )}
          {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}
          <button
            onClick={confirmation ? handleLogin : handleSendOtp}
            disabled={loading || (confirmation ? code.length < 6 : false)}
            className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'PLEASE WAIT...' : confirmation ? 'VERIFY & LOG IN' : 'SEND LOGIN CODE'}
            <ArrowRight className="h-4 w-4" />
          </button>
          {confirmation && (
            <button onClick={() => { setConfirmation(null); setCode(''); setError(null); }} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
              Change number
            </button>
          )}
          <button onClick={() => router.push('/onboarding')} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white">
            New fighter? Sign up
          </button>
          <button onClick={() => router.push('/login')} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
            Log in with email instead
          </button>
        </section>
      </div>
    </main>
  );
}
