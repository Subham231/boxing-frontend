'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Swords } from 'lucide-react';
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
