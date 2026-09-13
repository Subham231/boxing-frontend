'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { linkEmailPasswordToUser, formatEmailAuthError } from '@/lib/firebase-auth';

/**
 * Lets an existing phone-auth fighter add an email/password credential
 * onto their CURRENT account — same Firebase uid, same Supabase profile
 * row, same subscription/streaks/analytics. Nothing about their existing
 * account is replaced; this only adds a second way to log in and a
 * verified email on file. See linkEmailPasswordToUser in firebase-auth.ts.
 */
export default function LinkEmailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
  }, [user, authLoading, router]);

  const handleLink = async () => {
    if (!user) return;
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
      await linkEmailPasswordToUser(user, trimmedEmail, password);
      router.replace('/verify-email');
    } catch (linkError) {
      setError(formatEmailAuthError(linkError));
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure your account</span>
          </div>
          <h1 className="mt-4 text-4xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Add an <span className="text-primary">email.</span>
          </h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white/55">
            Your phone number, streaks, subscription and history all stay exactly as they are — this just adds an
            email + password login on top of your existing account.
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
              onKeyDown={(event) => event.key === 'Enter' && handleLink()}
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
                onKeyDown={(event) => event.key === 'Enter' && handleLink()}
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
            onClick={handleLink}
            disabled={loading}
            className="btn-primary flex h-14 w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'LINKING...' : 'ADD EMAIL & SEND VERIFICATION'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button onClick={() => router.back()} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
            Not now
          </button>
        </section>
      </div>
    </main>
  );
}
