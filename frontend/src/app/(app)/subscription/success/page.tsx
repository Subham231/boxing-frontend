'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

// Poll delays after returning from Polar checkout — per spec section 35:
// immediate, 1s, 2s, 4s, then a couple more spaced-out tries before giving
// up and telling the person it's still processing rather than looping
// forever. This never claims "active" until /api/subscription/status
// (which itself live-syncs against Polar) actually says so.
const POLL_DELAYS_MS = [0, 1000, 2000, 4000, 6000, 8000];

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');

  const [phase, setPhase] = useState<'confirming' | 'active' | 'timeout'>('confirming');
  const [statusData, setStatusData] = useState<any>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    let attempt = 0;

    const poll = async () => {
      if (cancelledRef.current) return;
      const user = firebaseAuth.currentUser;
      if (!user) {
        // Auth state may not have hydrated yet on a fresh redirect — retry
        // rather than failing immediately.
        if (attempt < POLL_DELAYS_MS.length) {
          attempt += 1;
          setTimeout(poll, POLL_DELAYS_MS[attempt] ?? 8000);
        } else {
          setPhase('timeout');
        }
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStatusData(data);
        if (data?.active) {
          setPhase('active');
          return;
        }
      } catch (e) {
        console.error('[subscription/success] status poll failed', e);
      }

      if (attempt < POLL_DELAYS_MS.length - 1) {
        attempt += 1;
        setTimeout(poll, POLL_DELAYS_MS[attempt]);
      } else {
        setPhase('timeout');
      }
    };

    poll();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <GlassCard className="max-w-md w-full p-8 flex flex-col items-center text-center gap-4">
        {phase === 'confirming' && (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <h1 className="text-lg font-black uppercase tracking-wide">Confirming your subscription...</h1>
            <p className="text-xs text-white/60 font-semibold">
              We're finalizing your payment with Polar. This usually takes a few seconds — please don't close this page.
            </p>
          </>
        )}
        {phase === 'active' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-primary" />
            <h1 className="text-lg font-black uppercase tracking-wide">Subscription active</h1>
            <p className="text-xs text-white/60 font-semibold">
              {statusData?.planName ? `${statusData.planName} is now active on your account.` : 'Your plan is now active.'}
            </p>
            <NeonButton onClick={() => router.push('/subscription')} className="w-full h-12 text-[11px] mt-2">
              GO TO SUBSCRIPTION
            </NeonButton>
          </>
        )}
        {phase === 'timeout' && (
          <>
            <AlertCircle className="w-10 h-10 text-amber-400" />
            <h1 className="text-lg font-black uppercase tracking-wide">Still processing</h1>
            <p className="text-xs text-white/60 font-semibold">
              Your payment may still be confirming on Polar's side. If your plan doesn't show as active within a couple of
              minutes, please contact support with your plan name{planId ? ` (${planId})` : ''}.
            </p>
            <NeonButton onClick={() => router.push('/subscription')} className="w-full h-12 text-[11px] mt-2">
              CHECK SUBSCRIPTION PAGE
            </NeonButton>
          </>
        )}
      </GlassCard>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
