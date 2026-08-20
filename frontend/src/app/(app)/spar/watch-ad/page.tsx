'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Loader2, AlertCircle, Crown } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

/**
 * Free-tier gate: watch a rewarded ad to unlock today's spar.
 * Real unlock must come from AdMob SSV → POST /api/spar/ad-reward.
 * Until the ad network is wired, non-production can use SPAR_AD_DEV_UNLOCK.
 */
export default function SparWatchAdPage() {
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const finishDevUnlock = async () => {
    setError(null);
    setPlaying(true);
    try {
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error('Please log in.');
      // Simulate ad watch UX (3s), then call server unlock (dev only).
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch('/api/spar/ad-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            'Ad unlock unavailable. Configure AD_NETWORK_SSV_SECRET, or set SPAR_AD_DEV_UNLOCK=true for local testing.',
        );
      }
      if (!data.unlocked) {
        throw new Error('Free spar already used today. Come back tomorrow or subscribe.');
      }
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Could not unlock spar.');
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-24 font-sans">
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/spar')}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] font-black text-primary tracking-widest uppercase block">FREE TIER</span>
          <h1 className="text-2xl font-black italic uppercase leading-none">WATCH AD TO CONTINUE</h1>
        </div>
      </header>

      <GlassCard className="p-6 border-primary/20 bg-primary/[0.03] flex flex-col gap-4">
        <p className="text-sm text-white/70 font-semibold leading-relaxed">
          Free fighters get <strong className="text-white">1 live spar per day</strong> after watching a short rewarded ad.
          Subscribers get daily spars based on their plan — no ads.
        </p>

        <div className="aspect-video rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center relative overflow-hidden">
          {playing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Playing rewarded ad…</span>
            </div>
          ) : done ? (
            <div className="text-center px-4">
              <div className="text-primary font-black uppercase text-sm mb-2">Unlocked</div>
              <p className="text-[11px] text-white/50 font-semibold">Today&apos;s free spar is ready.</p>
            </div>
          ) : (
            <div className="text-center px-6">
              <Play className="w-10 h-10 text-primary mx-auto mb-3 fill-primary/20" />
              <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">Rewarded Ad Slot</p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-[11px] text-red-400 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!done ? (
          <NeonButton className="w-full h-14" disabled={playing} onClick={finishDevUnlock}>
            {playing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'WATCH AD & UNLOCK'}
          </NeonButton>
        ) : (
          <NeonButton className="w-full h-14" onClick={() => router.push('/spar/lobby')}>
            CONTINUE TO SPAR
          </NeonButton>
        )}

        <button
          onClick={() => router.push('/subscription')}
          className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-primary"
        >
          <Crown className="w-3.5 h-3.5" /> Skip ads — subscribe
        </button>
      </GlassCard>
    </div>
  );
}
