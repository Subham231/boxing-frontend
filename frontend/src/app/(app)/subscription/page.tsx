'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Crown, Loader2, ShieldCheck, AlertCircle, XCircle } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

const DEV_SKIP_ENABLED = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEV_SKIP === 'true';

interface PlanCard {
  id: 'monthly' | 'monthly_pro' | 'three_month' | 'yearly';
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
}

const PLAN_CARDS: PlanCard[] = [
  {
    id: 'monthly',
    name: 'SparAI Monthly',
    price: '₹629',
    period: '/ month',
    features: ['1 AI Video Analysis / day', '1 Planner Generation / week'],
  },
  {
    id: 'monthly_pro',
    name: 'SparAI Pro',
    price: '₹729',
    period: '/ month',
    features: ['2 AI Video Analyses / day', '2 Planner Generations / week'],
    highlight: true,
  },
  {
    id: 'three_month',
    name: 'SparAI Performance',
    price: '₹1,629',
    period: '/ 3 months',
    features: ['3 AI Video Analyses / day', '3 Planner Generations / week'],
  },
  {
    id: 'yearly',
    name: 'SparAI Elite 👑',
    price: '₹6,290',
    period: '/ year',
    features: [
      'Unlimited AI Video Analyses',
      'Unlimited Planner Generations',
      'Premium Guru skills unlocked',
      'Elite Member badge',
    ],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

      const { subscription, order, isDirectOrder, keyId } = orderData;

      if ((subscription && subscription.isMock) || (order && order.isMock)) {
        const verifyRes = await fetch('/api/subscription/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ planId, isMock: true }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');
        await fetchStatus();
        setProcessingPlan(null);
        return;
      }

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
      };

      if (isDirectOrder && order) {
        options.order_id = order.id;
        options.amount = order.amount;
        options.currency = order.currency || 'INR';
      } else if (subscription) {
        options.subscription_id = subscription.id;
      }

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
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-16 font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptLoaded(true)} />

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
          </div>
        </GlassCard>
      )}

      {!loadingStatus && !status?.active && (
        <GlassCard className="p-5 mb-6 border-red-500/30 bg-red-500/5 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <div className="text-sm font-black text-white uppercase">Subscription Expired or Inactive</div>
            <div className="text-[10px] text-white/60 font-bold uppercase tracking-wide">
              {status?.expiresAt
                ? `Your access expired on ${new Date(status.expiresAt).toLocaleDateString()}. Select a plan below to renew or upgrade your access.`
                : 'No active plan. Select a subscription below to unlock full access.'}
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
                <span className="text-sm font-black uppercase text-white tracking-wider">{plan.name}</span>
              </div>
              <div className="text-right">
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
