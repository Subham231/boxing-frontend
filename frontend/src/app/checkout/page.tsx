'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { Check, ShieldCheck, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [planId, setPlanId] = useState<string>('monthly');
  const [uid, setUid] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // 1. Get plan selection from localStorage or URL param
    if (typeof window !== 'undefined') {
      const selected = searchParams.get('plan') || localStorage.getItem('boxing_selected_plan') || 'monthly';
      setPlanId(selected);
    }

    // 2. Fetch authenticated Firebase user
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        setUid(user.uid);
      } else {
        // Fallback for demo/testing mode if no Firebase session is active
        const demoUid = 'demo_user_123';
        console.warn(`No active Firebase session. Defaulting to local demo UID: ${demoUid}`);
        setUid(demoUid);
      }
    });

    return () => unsubscribe();
  }, [searchParams]);

  const planDetails = {
    monthly: {
      name: 'Pro Monthly Plan',
      price: '₹829',
      period: '/ month',
      description: 'Full tactical boxing roadmap, unrestricted analytics, and real-time form advisor.',
    },
    yearly: {
      name: 'Pro Yearly Plan',
      price: '₹6,500',
      period: '/ year',
      description: 'All monthly benefits, priority headmaster assistance, and 2 months completely free.',
    },
  }[planId as 'monthly' | 'yearly'] || {
    name: 'Pro Monthly Plan',
    price: '₹829',
    period: '/ month',
    description: 'Full tactical boxing roadmap, unrestricted analytics, and real-time form advisor.',
  };

  const handleCheckout = async () => {
    if (!agreed) {
      setError('You must read and agree to all policies and terms before making a payment.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Create order on Next.js backend
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, uid }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Failed to initialize payment order');
      }

      const { order } = await res.json();

      // 2. Trigger Razorpay Checkout flow
      if (order.isMock) {
        // For development/mock scenario without API keys
        console.log('Razorpay Sandbox Order created:', order);
        setVerifying(true);
        const verifyRes = await fetch('/api/razorpay/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            planId,
            isMock: true,
          }),
        });

        if (!verifyRes.ok) {
          throw new Error('Mock payment verification failed');
        }

        router.push('/onboarding?step=23'); // Go to the final onboarding step
        return;
      }

      // Production / Live Razorpay Checkout
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: 'SparAI',
          description: `Subscription: ${planDetails.name}`,
          image: '/favicon.ico',
          order_id: order.id,
          handler: async function (response: any) {
            setLoading(false);
            setVerifying(true);
            try {
              const verifyRes = await fetch('/api/razorpay/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  uid,
                  planId,
                }),
              });

              if (!verifyRes.ok) {
                throw new Error('Payment verification failed. Please contact support.');
              }

              // Route back to onboarding completion
              router.push('/onboarding?step=23');
            } catch (err: any) {
              setError(err.message || 'Verification failed');
              setVerifying(false);
            }
          },
          prefill: {
            name: 'Fighter',
            email: 'sk.ish24@gmail.com',
          },
          theme: {
            color: '#E2FF3B',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Razorpay SDK failed to load. Please refresh the page.');
      }
    } catch (err: any) {
      setError(err.message || 'Payment system error. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 font-sans relative flex flex-col justify-center items-center">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-black text-primary tracking-widest uppercase block">SPARAI PROTOCOL</span>
            <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">SECURE CHECKOUT</h1>
          </div>
        </header>

        {verifying ? (
          <GlassCard className="p-8 text-center border-primary/20 bg-primary/[0.02] flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <h3 className="text-sm font-black uppercase text-white tracking-wider">
              VERIFYING PROTOCOL ACCESS
            </h3>
            <p className="text-[11px] text-white/50 leading-relaxed font-semibold">
              Validating transaction and allocating computational tokens to your neural profile...
            </p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Selected Plan Details */}
            <GlassCard className="p-6 border-primary/20 bg-black/40 flex flex-col gap-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-black uppercase text-primary tracking-wider">{planDetails.name}</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">{planDetails.price}</span>
                  <span className="text-[10px] text-white/40 font-bold block">{planDetails.period}</span>
                </div>
              </div>
              <p className="text-white/60 text-xs font-semibold leading-relaxed border-t border-white/5 pt-4">
                {planDetails.description}
              </p>
            </GlassCard>

            {/* Error Notification */}
            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-red-400 leading-tight">{error}</p>
              </div>
            )}

            {/* Compliance Checkboxes & Policy Information */}
            <GlassCard className="p-5 border-white/5 bg-black/30 flex flex-col gap-4">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Compliance & Agreements</span>
              
              <div className="flex items-start gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setAgreed(!agreed)}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                    agreed ? 'bg-primary border-primary text-black' : 'border-white/20 bg-black/20 hover:border-white/40'
                  }`}
                >
                  {agreed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <div className="text-[11px] font-semibold text-white/60 leading-relaxed">
                  I read and explicitly agree to the following policies of SparAI:
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2 text-primary font-black uppercase tracking-wider text-[9px]">
                    <a href="/legal/terms" target="_blank" className="hover:underline flex items-center gap-0.5">
                      Terms of Service
                    </a>
                    <span className="text-white/20">•</span>
                    <a href="/legal/privacy" target="_blank" className="hover:underline flex items-center gap-0.5">
                      Privacy Policy
                    </a>
                    <span className="text-white/20">•</span>
                    <a href="/legal/refund" target="_blank" className="hover:underline flex items-center gap-0.5">
                      Refund & Cancellation
                    </a>
                    <span className="text-white/20">•</span>
                    <a href="/legal/contact" target="_blank" className="hover:underline flex items-center gap-0.5">
                      Contact Us
                    </a>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Checkout Actions */}
            <NeonButton
              onClick={handleCheckout}
              disabled={loading || !scriptLoaded}
              className="w-full h-16 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  INITIATING PAYMENTS...
                </>
              ) : (
                'SECURE PAYMENT VIA RAZORPAY'
              )}
            </NeonButton>

            {/* Footer / Safety lock */}
            <footer className="flex items-center justify-center gap-2 text-white/30 text-[9px] uppercase font-bold tracking-wider">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Payments protected with 256-bit SSL encryption by Razorpay</span>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
