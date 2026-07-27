'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Crown, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

const PLAN_FEATURES = [
  'Live AI Form Analyser (Freestyle & Extreme modes)',
  'Unlimited AI Planner Generation',
  'Full Guru Technique Library',
  'Reflex & Combo Leaderboards',
  'Advanced Analytics & Weekly Recap',
];

export default function SubscriptionGatePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useFirebaseUser();
  const [skipLoading, setSkipLoading] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);

  useEffect(() => {
    // Not signed in at all — send them through onboarding/login properly
    // rather than showing a payment screen with nothing to attach it to.
    if (!userLoading && !user) {
      router.replace('/onboarding');
    }
  }, [user, userLoading, router]);

  const handleUpgrade = () => {
    router.push('/checkout?plan=monthly');
  };

  // ---------------------------------------------------------------------
  // ⚠️ TEMPORARY / TESTING ONLY — remove this handler and the button
  // below once real Razorpay checkout is wired up. See
  // /api/dev/grant-test-subscription for the matching temporary route.
  // ---------------------------------------------------------------------
  const handleSkipForTesting = async () => {
    if (!firebaseAuth.currentUser) return;
    setSkipLoading(true);
    setSkipError(null);
    try {
      const idToken = await firebaseAuth.currentUser.getIdToken();
      const res = await fetch('/api/dev/grant-test-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Could not grant test access.');
      router.replace('/dashboard');
    } catch (e) {
      setSkipError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSkipLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col justify-between px-6 py-10 max-w-md mx-auto">
      <header className="text-center flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter">
          Upgrade to <span className="text-primary">continue</span>.
        </h1>
        <p className="text-white/50 text-sm font-semibold leading-relaxed">
          Your free access has ended. Subscribe to keep training with SparAI — or refer 5 fighters for a free month.
        </p>
      </header>

      <main className="flex-1 flex flex-col justify-center gap-5 py-8">
        <GlassCard className="p-6 border-primary bg-primary/10 shadow-[0_0_25px_rgba(226,255,59,0.15)] relative">
          <div className="absolute -top-2.5 right-5 bg-primary text-black text-[8px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Crown className="w-2.5 h-2.5" /> Basic Plan
          </div>
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-sm font-black uppercase text-primary">Pro Monthly</span>
            <span className="text-2xl font-black text-white">
              ₹829<span className="text-[11px] text-white/40 font-bold">/mo</span>
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {PLAN_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="text-[11px] font-semibold text-white/70">{f}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <p className="text-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
          Referring 5 friends adds a free month automatically — check your referral code in Settings.
        </p>
      </main>

      <footer className="flex flex-col gap-3">
        <NeonButton onClick={handleUpgrade} className="w-full h-16 text-sm">
          UPGRADE NOW
        </NeonButton>

        {/* ⚠️ TEMPORARY — testing-only bypass, remove before launch */}
        <button
          onClick={handleSkipForTesting}
          disabled={skipLoading}
          className="text-[10px] font-black text-white/30 hover:text-white/60 uppercase tracking-widest py-2 disabled:opacity-40"
        >
          {skipLoading ? 'Granting test access...' : 'Skip (Testing Only)'}
        </button>
        {skipError && <p className="text-[10px] font-bold text-red-400 text-center">{skipError}</p>}

        {/* Legal links — required before/around any payment screen */}
        <div className="flex flex-col gap-2.5 mt-2">
          {[
            { label: 'PRIVACY POLICY', href: '/legal/privacy' },
            { label: 'TERMS & CONDITIONS', href: '/legal/terms' },
            { label: 'REFUND & CANCELLATION', href: '/legal/refund' },
            { label: 'CONTACT US', href: '/legal/contact' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-3.5 rounded-2xl border border-white/5 bg-black/30 flex justify-between items-center select-none hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[10px] font-black uppercase text-white/70">
                  {link.label}
                </span>
              </div>
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
