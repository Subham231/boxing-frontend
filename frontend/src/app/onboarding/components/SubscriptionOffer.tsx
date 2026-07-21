'use client';

import React, { useState } from 'react';
import { Check, Crown, Gift } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { firebaseAuth } from '@/lib/firebase';
import ReferralCard from '@/components/reflex/ReferralCard';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    features: ['Daily Grind access', 'Basic Planner', 'Reflex Enhancer'],
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: '$9.99',
    period: '/mo',
    features: ['Everything in Free', 'Unlimited Planner Regeneration', 'Full Guru Library', 'Advanced Analytics'],
    highlight: true,
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: '$79',
    period: '/yr',
    features: ['Everything in Pro Monthly', '2 months free', 'Priority support'],
  },
];

const SubscriptionOffer: React.FC = () => {
  const { nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string>('monthly');
  const uid = firebaseAuth.currentUser?.uid;

  const handleContinue = () => {
    // No payment processor is wired up yet — this just records the user's
    // intent locally. Real billing (Stripe/RevenueCat/etc.) would replace
    // this with an actual checkout call before advancing.
    if (typeof window !== 'undefined') {
      localStorage.setItem('boxing_selected_plan', selected);
    }
    nextStep();
  };

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">22 / 23</div>
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Choose your <span className="text-primary">edge</span>.
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          Unlock the full Tactical Protocol experience — or refer 5 friends and get it for free.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 overflow-y-auto">
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
        {uid && <ReferralCard uid={uid} />}
      </main>

      <footer className="mt-8 flex flex-col gap-4">
        <button onClick={handleContinue} className="btn-primary w-full h-16 flex items-center justify-center gap-2">
          CONTINUE
        </button>
        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
};

export default SubscriptionOffer;
