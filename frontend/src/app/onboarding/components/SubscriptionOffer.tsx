'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Crown, Gift, Ticket } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { firebaseAuth } from '@/lib/firebase';
import { applyReferralCode } from '@/lib/firebase-auth';
import ReferralCard from '@/components/reflex/ReferralCard';

const PLANS = [
  {
    id: 'monthly',
    name: 'SparAI Monthly',
    price: '₹629',
    period: '/mo',
    features: ['1 AI Video Analysis / day', '1 Planner Generation / week'],
  },
  {
    id: 'monthly_pro',
    name: 'SparAI Pro ⭐',
    price: '₹729',
    period: '/mo',
    features: ['2 AI Video Analyses / day', '2 Planner Generations / week'],
    highlight: true,
  },
  {
    id: 'three_month',
    name: 'SparAI Performance',
    price: '₹1,629',
    period: '/ 3 mos',
    features: ['3 AI Video Analyses / day', '3 Planner Generations / week'],
  },
  {
    id: 'yearly',
    name: 'SparAI Elite 👑',
    price: '₹6,290',
    period: '/yr',
    features: ['Unlimited AI Video Analyses', 'Unlimited Planner Generations', 'Premium Guru unlocked', 'Elite Member badge'],
  },
];

type EarnTab = 'referral' | 'share';

const SubscriptionOffer: React.FC = () => {
  const router = useRouter();
  const { nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string>('monthly_pro');
  const [earnTab, setEarnTab] = useState<EarnTab>('referral');
  const [referralInput, setReferralInput] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const uid = firebaseAuth.currentUser?.uid;

  const handleContinue = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('boxing_selected_plan', selected);
    }

    if (selected === 'monthly_pro' || selected === 'yearly') {
      // The legacy /checkout + /api/razorpay/* flow only ever wrote to the
      // old `subscription_until` column and doesn't know about plans, daily/
      // weekly limits, or Elite status — it's superseded by /subscription,
      // which is what actually grants entitlement under the new system.
      router.push('/subscription');
    } else {
      nextStep();
    }
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
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-5">
        <StepBadge />
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Claim Your <span className="text-primary">30-Day Free Trial</span>
        </h1>
        <p className="text-white/50 mt-3 text-sm leading-relaxed font-semibold">
          Use a valid referral code to unlock full SparAI access for 30 days — no charge.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-hide">
        <div className="relative overflow-hidden rounded-[28px] border border-primary/40 bg-gradient-to-br from-primary/20 via-black/80 to-black/95 p-5 shadow-[0_0_25px_rgba(226,255,59,0.14)]">
          <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-primary">Benefit</span>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-black text-white leading-none">30</span>
                <span className="pb-2 text-base font-black uppercase text-white/70">Days</span>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-right">
              <Gift className="w-6 h-6 text-primary mx-auto" />
              <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.18em] text-primary">Free</span>
            </div>
          </div>

          <p className="relative mt-4 text-sm font-semibold text-white/75 leading-relaxed">
            Your referral code unlocks the first 30 days of full access. After the trial, your plan continues at the standard rate unless you change it.
          </p>
        </div>

        {uid ? (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">Your referral code</span>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-[7px] font-black uppercase tracking-[0.18em] text-primary">
                Active
              </span>
            </div>
            <ReferralCard uid={uid} />
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5 text-[11px] font-semibold text-white/50 text-center">
            Verify your phone first to unlock your referral code.
          </div>
        )}

        <div className="rounded-3xl border border-primary/25 bg-primary/[0.04] p-4">
          <div className="mb-3 flex items-center gap-2">
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

      <footer className="mt-8 flex flex-col gap-4">
        <button onClick={handleContinue} className="btn-primary w-full h-16 flex items-center justify-center gap-2">
          Claim My 30-Day Trial
        </button>

        <div className="bg-black/80 border border-white/10 rounded-2xl py-3 px-4 flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-white/50 text-[9px] font-bold uppercase tracking-widest text-center mt-2 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
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
