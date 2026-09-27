'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Phone, MailCheck, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import {
  sendPasswordlessSignInLink,
  formatEmailAuthError,
  loginWithGoogle,
  formatGoogleAuthError,
  ensureUserProfile,
  checkGoogleRedirectResult,
} from '@/lib/firebase-auth';
import { cacheProfileLocally } from '@/lib/profile-client';

const RESEND_COOLDOWN = 30;

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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Google redirect result on page load (fallback for popup-blocked)
  useEffect(() => {
    checkGoogleRedirectResult().then(async (user) => {
      if (!user) return;
      try {
        const { profile, sessionToken } = await ensureUserProfile(user);
        cacheProfileLocally(profile);
        if (sessionToken && typeof window !== 'undefined') {
          localStorage.setItem('sparai_session_token', sessionToken);
        }
        const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>;
        const isCompleted =
          !!onboardingData.onboarding_completed ||
          !!onboardingData.ring_name ||
          localStorage.getItem('boxing_onboarding_done') === 'true';
        if (isCompleted) localStorage.setItem('boxing_onboarding_done', 'true');
        router.replace(isCompleted ? '/dashboard' : '/onboarding');
      } catch {
        router.replace('/onboarding');
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      const { profile, isNew, sessionToken } = await ensureUserProfile(user);
      cacheProfileLocally(profile);
      if (sessionToken && typeof window !== 'undefined') {
        localStorage.setItem('sparai_session_token', sessionToken);
      }
      const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>;
      const isCompleted =
        !isNew &&
        (!!onboardingData.onboarding_completed ||
          !!onboardingData.ring_name ||
          localStorage.getItem('boxing_onboarding_done') === 'true');
      if (isCompleted) localStorage.setItem('boxing_onboarding_done', 'true');
      router.replace(isCompleted ? '/dashboard' : '/onboarding');
    } catch (err: any) {
      if (err?.message === 'REDIRECT_STARTED') return;
      setError(formatGoogleAuthError(err));
      setGoogleLoading(false);
    }
  };

  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordlessSignInLink(trimmedEmail, '/onboarding');
      setSentLink(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (err: any) {
      setError(formatEmailAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    await handleSignup();
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-between">
        <div>
          <span className="text-sm font-black italic uppercase tracking-tight">
            Spar<span className="text-primary">ai</span>
          </span>
          <div className="mt-10 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Quick Signup</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Become a <span className="text-primary">fighter.</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            {sentLink
              ? 'Check your email — tap the sign-in link to start training immediately.'
              : 'Sign up instantly with Google, or use your email. No passwords needed.'}
          </p>
        </div>

        {sentLink ? (
          <section className="flex flex-col items-center gap-6 my-auto">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(226,255,59,0.2)]">
              <MailCheck className="h-10 w-10 text-primary animate-pulse" />
            </div>

            <div className="text-center">
              <span className="text-xs uppercase font-black text-white/40 tracking-widest block mb-1">
                Verification link sent to
              </span>
              <p className="text-xl font-bold text-white tracking-tight">{email.trim()}</p>
              <p className="mt-2 text-xs text-white/50 leading-relaxed max-w-xs mx-auto">
                Open your email app and tap the link to activate your fighter profile.
              </p>
            </div>

            {/* Spam folder guidance */}
            <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 max-w-xs">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-[10px] font-semibold text-yellow-300/80 leading-relaxed">
                Don&apos;t see it? Check your <strong>Spam</strong> or <strong>Promotions</strong> folder.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 mt-4">
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 hover:border-primary hover:text-primary disabled:opacity-40"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'SENDING...' : cooldown > 0 ? `RESEND IN ${cooldown}S` : 'RESEND VERIFICATION LINK'}
              </button>

              <button
                onClick={() => {
                  setSentLink(false);
                  setError(null);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white py-2"
              >
                Use a different email
              </button>
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Google Sign-In — primary action */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-[#1f1f1f] text-sm font-bold tracking-tight shadow-lg hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {googleLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
              ) : (
                <GoogleLogo />
              )}
              {googleLoading ? 'SIGNING UP...' : 'CONTINUE WITH GOOGLE'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">or use email link</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Email magic link form */}
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-white/40 uppercase">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@email.com"
                  className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary text-white"
                />
              </div>

              {error && <p className="text-center text-[11px] font-bold leading-relaxed text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? 'SENDING LINK...' : 'SEND VERIFICATION LINK'}
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white text-center py-1"
              >
                Already a fighter? Log in
              </button>

              <button
                type="button"
                onClick={() => router.push('/login/phone')}
                className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white mt-2"
              >
                <Phone className="h-3.5 w-3.5" />
                Joined before with your phone? Log in with phone
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
