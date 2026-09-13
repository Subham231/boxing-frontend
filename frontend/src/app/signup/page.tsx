'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { signUpWithEmail, checkEmailExists, formatEmailAuthError } from '@/lib/firebase-auth';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
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
        setError('An account already exists for this email. Try logging in instead.');
        return;
      }
      await signUpWithEmail(trimmedEmail, password);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sparai_pending_email', trimmedEmail);
      }
      router.replace('/verify-email');
    } catch (signupError) {
      setError(formatEmailAuthError(signupError));
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Create account</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Become a <span className="text-primary">fighter.</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            Sign up with your email — we&apos;ll send a verification link before you can enter the ring.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-white/40 uppercase">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSignup()}
              placeholder="you@email.com"
              className="w-full border-b border-white/20 bg-transparent px-1 py-3 text-2xl font-bold tracking-tight outline-none focus:border-primary"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-white/40 uppercase">Password</span>
            <div className="flex items-center border-b border-white/20 focus-within:border-primary">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSignup()}
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
            onClick={handleSignup}
            disabled={loading}
            className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'CREATING ACCOUNT...' : 'SEND VERIFICATION EMAIL'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button onClick={() => router.push('/login')} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white">
            Already a fighter? Log in
          </button>
        </section>
      </div>
    </main>
  );
}
