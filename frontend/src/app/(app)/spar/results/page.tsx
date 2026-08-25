'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Swords, Lock, Zap, Flame, Activity, Shield } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

function SparResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('id') || '';
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('spar_result');
      if (raw) {
        setResult(JSON.parse(raw));
        return;
      }
    } catch { /* ignore */ }

    (async () => {
      try {
        const user = firebaseAuth.currentUser;
        if (!user || !matchId) return;
        const token = await user.getIdToken();
        const res = await fetch(`/api/spar/match/${matchId}/result`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load result');
        setResult(data);
      } catch (e: any) {
        setError(e.message || 'Could not load results.');
      }
    })();
  }, [matchId]);

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
          <span className="text-[10px] font-black text-primary tracking-widest uppercase block">MATCH OVER</span>
          <h1 className="text-2xl font-black italic uppercase leading-none">RESULTS</h1>
        </div>
      </header>

      {error && <p className="text-red-400 text-sm font-semibold mb-4">{error}</p>}

      {!result ? (
        <p className="text-white/40 text-sm">Loading…</p>
      ) : result.gated ? (
        <GlassCard className="p-6 border-primary/20 text-center flex flex-col gap-4">
          <Trophy className="w-10 h-10 text-primary mx-auto" />
          <p className="text-sm font-semibold text-white/70">{result.message}</p>
          <NeonButton className="w-full h-14" onClick={() => router.push('/subscription')}>
            SUBSCRIBE TO SEE WINNER
          </NeonButton>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-4">
          <GlassCard className="p-6 border-primary/30 bg-primary/[0.05] text-center">
            <Trophy className="w-10 h-10 text-primary mx-auto mb-3" />
            <div className="text-2xl font-black italic uppercase tracking-tight">
              {result.youWon ? 'YOU WIN' : 'YOU LOSE'}
            </div>
            <div className="text-[10px] text-white/40 font-bold uppercase mt-2 tracking-widest">
              {result.isPaidMatch ? 'Counted on leaderboard' : 'Free spar — not on leaderboard'}
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-white/5 bg-black/40 text-center">
            <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">AI Score</div>
            <div className="text-5xl font-black text-primary tracking-tight">
              {result.yourResult?.score ?? '—'}
            </div>
          </GlassCard>

          {/* Advanced metrics - blurred with subscribe overlay */}
          <GlassCard className="p-6 border-white/5 bg-black/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">ADVANCED METRICS</div>
              <span className="text-[7px] font-black text-primary/70 uppercase">PRO SUITE</span>
            </div>

            {/* Blurred content */}
            <div className="filter blur-[4px] select-none pointer-events-none opacity-30 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">STRIKE ACCURACY</span>
                <span className="text-lg font-black text-white">{result.yourResult?.strikeAccuracy ?? '91.4%'}%</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">KINETIC POWER</span>
                <span className="text-lg font-black text-white">{result.yourResult?.kineticPower ?? '482'} PSI</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">REFLEX SCORE</span>
                <span className="text-lg font-black text-white">{result.yourResult?.reflexScore ?? '87'}/100</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">STAMINA DECAY</span>
                <span className="text-lg font-black text-white">-{result.yourResult?.staminaDecay ?? '4.2'}%</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">COUNTER TIMING</span>
                <span className="text-lg font-black text-white">{result.yourResult?.counterTiming ?? '156'} ms</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[7px] text-white/40 uppercase block">COMBO DENSITY</span>
                <span className="text-lg font-black text-white">{result.yourResult?.comboDensity ?? '4.8'}/seq</span>
              </div>
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/85 to-black/95 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center shadow-[0_0_20px_rgba(226,255,59,0.3)]">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-black uppercase tracking-wide text-white leading-tight">
                FULL BREAKDOWN LOCKED
              </span>
              <p className="text-[10px] font-semibold text-white/60 max-w-[260px] leading-snug">
                Subscribe to unlock your complete combat analytics: strike accuracy, kinetic power, reflex score, stamina decay, counter timing, combo density & AI tactical tips.
              </p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {['ACCURACY','POWER','REFLEXES','STAMINA','TIMING','COMBOS','AI TIPS'].map(t => (
                  <span key={t} className="text-[6px] font-black uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">{t}</span>
                ))}
              </div>
              <NeonButton className="w-full max-w-[260px] h-12 mt-2" onClick={() => router.push('/subscription')}>
                <Shield className="w-3.5 h-3.5 mr-1.5" /> SUBSCRIBE TO UNLOCK
              </NeonButton>
            </div>
          </GlassCard>

          <NeonButton className="w-full h-14" onClick={() => router.push('/spar')}>
            <Swords className="w-4 h-4 mr-2" /> BACK TO LOBBY
          </NeonButton>
        </div>
      )}
    </div>
  );
}

export default function SparResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] text-white/40 flex items-center justify-center text-xs font-black uppercase tracking-widest">
          Loading results…
        </div>
      }
    >
      <SparResultsInner />
    </Suspense>
  );
}
