'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Crown, Loader2, ShieldCheck, AlertCircle, XCircle, Zap, Swords, Video, Sparkles, X, Gift } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

const DEV_SKIP_ENABLED = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEV_SKIP === 'true';

interface PlanCard {
  id: 'monthly' | 'monthly_pro' | 'three_month' | 'yearly';
  name: string;
  price: string;
  originalPrice?: string;
  discountTag?: string;
  period: string;
  features: string[];
  highlight?: boolean;
}

const PLAN_CARDS: PlanCard[] = [
  {
    id: 'monthly',
    name: 'SparAI Monthly',
    price: '₹629',
    originalPrice: '₹1,299',
    discountTag: '51% OFF',
    period: '/ month',
    features: ['1 AI Video Analysis / day', '1 Planner Generation / week', '1 Live Spar / day'],
  },
  {
    id: 'monthly_pro',
    name: 'SparAI Pro',
    price: '₹729',
    originalPrice: '₹1,599',
    discountTag: '54% OFF',
    period: '/ month',
    features: ['2 AI Video Analyses / day', '2 Planner Generations / week', '2 Live Spars / day'],
    highlight: true,
  },
  {
    id: 'three_month',
    name: 'SparAI Performance',
    price: '₹1,629',
    originalPrice: '₹3,999',
    discountTag: '59% OFF',
    period: '/ 3 months',
    features: ['3 AI Video Analyses / day', '3 Planner Generations / week', '3 Live Spars / day'],
  },
  {
    id: 'yearly',
    name: 'SparAI Elite 👑',
    price: '₹6,290',
    originalPrice: '₹15,499',
    discountTag: '60% OFF',
    period: '/ year',
    features: [
      'Unlimited AI Video Analyses',
      'Unlimited Planner Generations',
      'Unlimited Live Spars',
      'Premium Guru skills unlocked',
      'Elite Member badge',
    ],
  },
];

function SubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showSparPopup, setShowSparPopup] = useState(false);

  useEffect(() => {
    // Show free sparring pop-up upon arriving at subscription page
    const hasSeenSparPopup = sessionStorage.getItem('spar_sub_page_popup_shown');
    if (!hasSeenSparPopup) {
      const timer = setTimeout(() => {
        setShowSparPopup(true);
        sessionStorage.setItem('spar_sub_page_popup_shown', 'true');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const fetchStatus = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      setLoadingStatus(false);
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/subscription/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error('Failed to load subscription status:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged(() => fetchStatus());
    return () => unsub();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setError(null);
    setMessage(null);
    const user = firebaseAuth.currentUser;
    if (!user) {
      setError('Please log in to subscribe.');
      return;
    }
    setProcessingPlan(planId);
    try {
      const token = await user.getIdToken();
      const orderRes = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create subscription');

      const { subscription, keyId } = orderData;

      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please refresh the page.');
      }

      const options: any = {
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        name: 'SparAI',
        description: `Subscription: ${PLAN_CARDS.find((p) => p.id === planId)?.name}`,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id || null,
                razorpay_order_id: response.razorpay_order_id || null,
                razorpay_signature: response.razorpay_signature,
                planId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');
            await fetchStatus();
            setMessage('Subscription activated successfully!');
          } catch (err: any) {
            setError(err.message || 'Payment verification failed. Please contact support.');
          } finally {
            setProcessingPlan(null);
          }
        },
        modal: { ondismiss: () => setProcessingPlan(null) },
        theme: { color: '#E2FF3B' },
        subscription_id: subscription?.id,
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment system error. Try again.');
      setProcessingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    setError(null);
    setMessage(null);
    const user = firebaseAuth.currentUser;
    if (!user) return;
    setCancelling(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel subscription');
      setMessage('Subscription auto-renewal cancelled. Your access remains active until the end of your current period.');
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Could not cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const handleDevSkip = async (planId: string) => {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    setProcessingPlan(planId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/subscription/dev-skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Dev skip failed');
      await fetchStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-6 pb-16 font-sans relative">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptLoaded(true)} />

      {/* Free Sparring Session Waiting Pop-Up Modal */}
      <AnimatePresence>
        {showSparPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSparPopup(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-gradient-to-b from-[#1c2214] via-[#0f120c] to-[#080a06] border-2 border-primary/60 rounded-[32px] p-5 sm:p-6 shadow-[0_0_50px_rgba(226,255,59,0.35)] z-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-44 h-44 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-44 h-44 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

              <button
                onClick={() => setShowSparPopup(false)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all z-20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-[9px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(226,255,59,0.3)]">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  FREE SESSION READY
                </div>
              </div>

              <div className="mb-4">
                <h2 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] text-white tracking-wide">
                  YOUR FREE <span className="text-primary drop-shadow-[0_0_12px_rgba(226,255,59,0.8)]">SPARRING ROUND</span> IS WAITING!
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-white/70 mt-2 leading-relaxed">
                  No subscription needed to get into the action right now. Step directly into the ring, test your reaction and combinations!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-white uppercase">100% Free Live Match</div>
                  <div className="text-[9px] text-primary font-bold uppercase tracking-wider">Zero Payment Required Today</div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <NeonButton
                  onClick={() => {
                    setShowSparPopup(false);
                    router.push('/spar');
                  }}
                  className="w-full h-14 text-sm font-black italic tracking-widest text-black uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(226,255,59,0.4)]"
                >
                  ENTER FREE SPARRING ARENA <Swords className="w-4 h-4 ml-1" />
                </NeonButton>

                <button
                  onClick={() => setShowSparPopup(false)}
                  className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest text-center py-1 mt-1"
                >
                  I'll Explore Plans First
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] font-black text-primary tracking-widest uppercase block">SPARAI PROTOCOL</span>
          <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">SUBSCRIPTION</h1>
        </div>
      </header>

      {!loadingStatus && status?.active && (
        <GlassCard className="p-5 mb-6 border-primary/30 bg-primary/5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-primary shrink-0" />
              <div>
                <div className="text-sm font-black text-white uppercase">{status.planName} — Active</div>
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wide">
                  Expires {status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : '—'} · Analysis{' '}
                  {status.dailyAnalysisLimit < 0 ? 'Unlimited' : `${status.dailyAnalysisUsed}/${status.dailyAnalysisLimit} today`} · Planner{' '}
                  {status.weeklyPlannerLimit < 0 ? 'Unlimited' : `${status.weeklyPlannerUsed}/${status.weeklyPlannerLimit} this week`}
                </div>
              </div>
            </div>
            {status.plan !== 'referral_reward' && (
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="text-[9px] font-black text-white/40 hover:text-red-400 uppercase tracking-widest flex items-center gap-1"
              >
                {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                Stop renewal
              </button>
            )}
          </div>
        </GlassCard>
      )}

      {!loadingStatus && !status?.active && status?.wasSubscribed && status?.expiresAt ? (
        <GlassCard className="p-5 mb-6 border-red-500/30 bg-red-500/5 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <div className="text-sm font-black text-white uppercase">Subscription Expired</div>
            <div className="text-[10px] text-white/60 font-bold uppercase tracking-wide">
              Your access expired on {new Date(status.expiresAt).toLocaleDateString()}. Select a plan below to renew or upgrade your access.
            </div>
          </div>
        </GlassCard>
      ) : !loadingStatus && !status?.active ? (
        <GlassCard className="p-5 mb-6 border-primary/30 bg-primary/5 flex items-center gap-3.5 shadow-[0_0_20px_rgba(226,255,59,0.08)]">
          <Crown className="w-6 h-6 text-primary shrink-0 drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]" />
          <div>
            <div className="text-sm font-black text-white uppercase tracking-wide">Unlock Full SparAI Protocol</div>
            <div className="text-[10px] text-white/60 font-bold uppercase tracking-wide mt-0.5">
              Select a subscription plan below to unlock AI Video Analysis, Custom Workouts, Guru & Tactical Training.
            </div>
          </div>
        </GlassCard>
      ) : null}

      {/* Limit Reached Notification Banner */}
      {reason && (
        <GlassCard className="p-4 mb-6 border-amber-500/40 bg-amber-500/10 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-xs font-black text-amber-400 uppercase tracking-wide">
              {reason === 'analysis_limit' && 'Daily AI Video Analysis Limit Reached'}
              {reason === 'planner_limit' && 'Weekly Planner Generation Limit Reached'}
              {reason === 'spar_limit' && 'Daily Sparring Limit Reached'}
              {!['analysis_limit', 'planner_limit', 'spar_limit'].includes(reason) && 'Subscription Required'}
            </div>
            <div className="text-[10px] text-white/70 font-semibold mt-0.5">
              {reason === 'analysis_limit' &&
                'You have reached your daily AI Video Analysis allowance. Upgrade your plan below for higher daily limits or unlimited sessions.'}
              {reason === 'planner_limit' &&
                'You have used your weekly workout protocol generations. Upgrade your plan below to generate more custom protocols.'}
              {reason === 'spar_limit' &&
                'You have completed your daily sparring allowance. Upgrade your plan below for more matches.'}
              {!['analysis_limit', 'planner_limit', 'spar_limit'].includes(reason) &&
                'Select a plan below to unlock this feature.'}
            </div>
          </div>
        </GlassCard>
      )}

      {error && (
        <div className="flex items-start gap-2 p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-red-400 leading-tight">{error}</p>
        </div>
      )}

      {message && (
        <div className="flex items-start gap-2 p-4 mb-6 bg-primary/10 border border-primary/20 rounded-2xl">
          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-primary leading-tight">{message}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {PLAN_CARDS.map((plan) => (
          <GlassCard
            key={plan.id}
            className={`p-5 flex flex-col gap-4 ${
              plan.highlight ? 'border-primary/40 bg-primary/[0.03]' : 'border-white/5 bg-black/40'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {plan.highlight && <Crown className="w-4 h-4 text-primary" />}
                <div>
                  <span className="text-sm font-black uppercase text-white tracking-wider block">{plan.name}</span>
                  {plan.discountTag && (
                    <span className="text-[8px] font-black text-black bg-primary px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mt-0.5">
                      {plan.discountTag}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {plan.originalPrice && (
                  <span className="text-xs font-bold text-red-400/80 line-through block">
                    {plan.originalPrice}
                  </span>
                )}
                <span className="text-xl font-black text-white">{plan.price}</span>
                <span className="text-[9px] text-white/40 font-bold block">{plan.period}</span>
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px] text-white/60 font-semibold">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <NeonButton
              onClick={() => handleSubscribe(plan.id)}
              disabled={processingPlan !== null || (!scriptLoaded && !DEV_SKIP_ENABLED)}
              className="w-full h-12 text-[11px] flex items-center justify-center gap-2"
            >
              {processingPlan === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : status?.plan === plan.id ? 'RENEW' : 'SUBSCRIBE'}
            </NeonButton>

            {DEV_SKIP_ENABLED && (
              <button
                onClick={() => handleDevSkip(plan.id)}
                disabled={processingPlan !== null}
                className="text-[9px] font-black text-white/25 hover:text-white/60 uppercase tracking-widest py-1"
              >
                ⚙ Skip Payment (Dev Only — {plan.name})
              </button>
            )}
          </GlassCard>
        ))}
      </div>

      <footer className="flex items-center justify-center gap-2 text-white/30 text-[9px] uppercase font-bold tracking-wider mt-8">
        <ShieldCheck className="w-4 h-4 text-green-500" />
        <span>Payments protected with 256-bit SSL encryption by Razorpay</span>
      </footer>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}
