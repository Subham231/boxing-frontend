'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { sendPasswordResetOtp, verifyPasswordResetOtp } from '@/lib/firebase-auth';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 45;

// Two steps, both same-page: enter email -> we send a 6-digit code (real
// transactional email API, see lib/server/email-otp.ts) -> enter the code
// + a new password. No clicked link, so this works identically in a
// browser tab or an installed PWA, and doesn't depend on Firebase's own
// mailer (which is what was failing to reach Gmail inboxes).
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSendCode = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const result = await sendPasswordResetOtp(trimmed);
      if (!result.ok) {
        setError(result.message || 'Could not send the code.');
        return;
      }
      setStep('code');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('Could not send the code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const result = await sendPasswordResetOtp(email.trim());
      if (!result.ok) {
        setError(result.message || 'Could not resend right now.');
        return;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setLoading(false);
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
    for (let i = 0; i < chars.length && index + i < CODE_LENGTH; i++) {
      next[index + i] = chars[i];
    }
    setDigits(next);
    inputsRef.current[Math.min(index + chars.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleReset = async () => {
    setError(null);
    const otp = digits.join('');
    if (otp.length !== CODE_LENGTH) {
      setError('Enter the 6-digit code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyPasswordResetOtp(email.trim(), otp, newPassword);
      if (!result.ok) {
        setError(result.message || 'Could not reset your password.');
        return;
      }
      setDone(true);
    } catch {
      setError('Could not reset your password. Try again.');
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Reset password</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Forgot your <span className="text-primary">password?</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            {done
              ? 'Your password has been reset.'
              : step === 'email'
                ? "Enter your email and we'll send you a 6-digit code."
                : `Enter the code we sent to ${email.trim()} and choose a new password.`}
          </p>
        </div>

        {done ? (
          <section className="flex flex-col items-center gap-6">
            <button onClick={() => router.push('/login')} className="btn-primary flex h-14 w-full items-center justify-center gap-2">
              BACK TO LOGIN
            </button>
          </section>
        ) : step === 'email' ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-white/40 uppercase">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSendCode()}
                placeholder="you@email.com"
                className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary"
                autoFocus
              />
            </div>

            {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}

            <button
              onClick={handleSendCode}
              disabled={loading}
              className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'SENDING...' : 'SEND CODE'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <button onClick={() => router.push('/login')} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
              Back to login
            </button>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            <div className="flex justify-center gap-2">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={CODE_LENGTH}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  disabled={loading}
                  className="h-14 w-11 rounded-xl border border-white/20 bg-white/5 text-center text-2xl font-black outline-none focus:border-primary disabled:opacity-50"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-white/40 uppercase">New password</span>
              <div className="flex items-center border-b border-white/20 focus-within:border-primary">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleReset()}
                  placeholder="At least 6 characters"
                  className="w-full bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="px-1 text-white/40 hover:text-white">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}

            <button
              onClick={handleReset}
              disabled={loading}
              className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'RESETTING...' : 'RESET PASSWORD'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
