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
      <header className="text-left mb-6">
        <StepBadge />
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Choose your <span className="text-primary">edge</span>.
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          Unlock the full Tactical Protocol experience — or refer 5 friends and get it for free.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-hide">
        {PLANS.map((plan) => {
          const active = selected === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              className={`relative text-left p-5 rounded-3xl border transition-all duration-300 ${
                active ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-2.5 right-5 bg-primary text-black text-[8px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" /> Popular
                </div>
              )}
              <div className="flex items-baseline justify-between mb-3">
                <span className={`text-sm font-black uppercase ${active ? 'text-primary' : 'text-white'}`}>{plan.name}</span>
                <span className="text-xl font-black text-white">
                  {plan.price}<span className="text-[10px] text-white/40 font-bold">{plan.period}</span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className={`w-3 h-3 shrink-0 ${active ? 'text-primary' : 'text-white/30'}`} />
                    <span className="text-[11px] font-semibold text-white/70">{f}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}

        <div className="flex items-center gap-2 mt-2">
          <Gift className="w-3.5 h-3.5 text-primary" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Or Earn It Free</span>
        </div>

        <div className="flex border border-white/5 bg-white/[0.02] p-1.5 rounded-full select-none">
          {[
            { id: 'referral' as const, label: 'Have a code' },
            { id: 'share' as const, label: 'Your code' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEarnTab(tab.id)}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all duration-300 ${
                earnTab === tab.id
                  ? 'bg-primary text-black shadow-[0_4px_12px_rgba(226,255,59,0.25)]'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {earnTab === 'referral' ? (
          <div className="p-5 rounded-3xl border border-primary/20 bg-primary/[0.03] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                Enter a friend&apos;s referral code
              </span>
            </div>

            {referralSuccess ? (
              <div className="text-[10px] font-black text-primary uppercase text-center bg-primary/10 border border-primary/20 rounded-xl py-3">
                Referral applied — you&apos;re in.
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
                  placeholder="e.g. TITAN7"
                  maxLength={8}
                  className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary placeholder:text-white/20 tracking-[3px] uppercase"
                />
                {referralError && <p className="text-[10px] font-bold text-red-400">{referralError}</p>}
                <button
                  type="button"
                  onClick={handleApplyReferral}
                  disabled={referralLoading || !referralInput.trim()}
                  className="w-full h-12 rounded-2xl bg-primary text-black text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {referralLoading ? 'Applying...' : 'Apply Code'}
                </button>
              </>
            )}
          </div>
        ) : (
          uid ? <ReferralCard uid={uid} /> : (
            <div className="p-5 rounded-3xl border border-white/10 bg-black/30 text-[11px] font-semibold text-white/50 text-center">
              Verify your phone first to unlock your referral code.
            </div>
          )
        )}
      </main>

      <footer className="mt-8 flex flex-col gap-4">
        <button onClick={handleContinue} className="btn-primary w-full h-16 flex items-center justify-center gap-2">
          CONTINUE
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
