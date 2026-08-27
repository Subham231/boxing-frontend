'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Ticket } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { firebaseAuth } from '@/lib/firebase';
import { applyReferralCode } from '@/lib/firebase-auth';
import ReferralCard from '@/components/reflex/ReferralCard';

const SubscriptionOffer: React.FC = () => {
  const router = useRouter();
  const { prevStep } = useOnboarding();
  const [referralInput, setReferralInput] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged((user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  const handleContinue = () => {
    router.push('/subscription');
  };

  const handleApplyReferral = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      setReferralError('Sign in first to apply a referral code.');
      return;
    }
    const code = referralInput.trim().toUpperCase();
    if (!code) {
      setReferralError('Enter a referral code.');
      return;
    }
    setReferralError(null);
    setReferralLoading(true);
    try {
      await applyReferralCode(user, code);
      setReferralSuccess(true);
    } catch (e) {
      setReferralError(e instanceof Error ? e.message : 'Could not apply referral code.');
    } finally {
      setReferralLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col justify-between gap-3 py-2 pb-4">
      <header className="text-left mb-1">
        <StepBadge />
        <h1 className="mt-2 text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Choose your <span className="text-primary">edge</span>
        </h1>
        <p className="mt-2 text-white/50 text-sm leading-relaxed font-semibold">
          Use your referral code to unlock the first 30 days, or pick a plan and set up your training stack.
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="relative overflow-hidden rounded-[22px] border border-primary/40 bg-gradient-to-br from-primary/20 via-black/80 to-black/95 p-3 shadow-[0_0_25px_rgba(226,255,59,0.14)]">
          <div className="absolute inset-x-8 top-0 h-16 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-primary">Benefit</span>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-black text-white leading-none">30</span>
                <span className="pb-1 text-sm font-black uppercase text-white/70">Days</span>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-right">
              <Gift className="w-6 h-6 text-primary mx-auto" />
              <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.18em] text-primary">Free</span>
            </div>
          </div>

          <p className="relative mt-2 text-[11px] font-semibold text-white/75 leading-relaxed">
            Your referral code unlocks the first 30 days of full access. After the trial, your plan continues at the standard rate unless you change it.
          </p>
        </div>

        {uid ? (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">Your referral code</span>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-[7px] font-black uppercase tracking-[0.18em] text-primary">
                Active
              </span>
            </div>
            <div className="max-h-[84px] overflow-hidden">
              <ReferralCard uid={uid} />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4 text-[11px] font-semibold text-white/50 text-center">
            Verify your phone first to unlock your referral code.
          </div>
        )}

        <div className="rounded-3xl border border-primary/25 bg-primary/[0.04] p-3">
          <div className="mb-2 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Enter referral code</span>
          </div>

          {referralSuccess ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-primary">
              Referral applied — your 30-day trial is active.
            </div>
          ) : (
            <>
              <input
                type="text"
                value={referralInput}
                onChange={(e) => {
                  setReferralInput(e.target.value.toUpperCase());
                  setReferralError(null);
                }}
                placeholder="Enter a friend’s code"
                maxLength={8}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary placeholder:text-white/25 tracking-[0.25em] uppercase"
              />
              {referralError && <p className="mt-2 text-[10px] font-bold text-red-400">{referralError}</p>}
              <button
                type="button"
                onClick={handleApplyReferral}
                disabled={referralLoading || !referralInput.trim()}
                className="mt-3 w-full h-12 rounded-2xl bg-primary text-black text-[11px] font-black uppercase tracking-[0.22em] disabled:opacity-50"
              >
                {referralLoading ? 'Applying...' : 'Apply Referral'}
              </button>
            </>
          )}
        </div>
      </main>

      <footer className="mt-1 flex flex-col gap-2">
        <button onClick={handleContinue} className="btn-primary w-full h-14 flex items-center justify-center gap-2">
          Get my plan
        </button>

        <div className="bg-black/80 border border-white/10 rounded-2xl py-2 px-4 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-white/50 text-[9px] font-bold uppercase tracking-widest text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <a href="/legal/terms" target="_blank" className="hover:text-primary transition-colors">Terms</a>
          <span className="text-white/20">•</span>
          <a href="/legal/privacy" target="_blank" className="hover:text-primary transition-colors">Privacy Policy</a>
          <span className="text-white/20">•</span>
          <a href="/legal/refund" target="_blank" className="hover:text-primary transition-colors">Refund Policy</a>
          <span className="text-white/20">•</span>
          <a href="/legal/contact" target="_blank" className="hover:text-primary transition-colors">Contact Us</a>
        </div>

        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
};

export default SubscriptionOffer;
