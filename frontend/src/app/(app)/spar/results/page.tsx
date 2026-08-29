'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Swords, Lock, Shield } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

function SparResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('id') || '';
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('spar_result');
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored.matchId === matchId || !stored.matchId) {
          setResult(stored);
          return;
        }
        sessionStorage.removeItem('spar_result');
      }
    } catch { /* ignore */ }

    (async () => {
      try {
        const user = firebaseAuth.currentUser;
        if (!user || !matchId) {
          setError(!matchId ? 'Missing match ID.' : 'Please log in to view results.');
          return;
        }
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
  }, [matchId, retryKey]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-24 font-sans">
      <header className="flex items-center gap-4 mb-6">
        <button
          aria-label="Back to sparring"
          onClick={() => router.push('/spar/lobby')}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] font-black text-primary tracking-widest uppercase block">MATCH OVER</span>
          <h1 className="text-2xl font-black italic uppercase leading-none">RESULTS</h1>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-red-300 text-sm font-semibold">{error}</p>
          <button type="button" onClick={() => { setError(null); setResult(null); setRetryKey((key) => key + 1); }} className="mt-3 rounded-xl border border-red-300/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Retry
          </button>
        </div>
      )}

      {!result ? (
        <p className="text-white/40 text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Winner/Loser — always visible for all users */}
          <GlassCard className="p-6 border-primary/30 bg-primary/[0.05] text-center">
            <Trophy className="w-10 h-10 text-primary mx-auto mb-3" />
            <div className="text-2xl font-black italic uppercase tracking-tight">
              {result.youWon ? 'YOU WIN' : 'YOU LOSE'}
            </div>
            <div className="text-[10px] text-white/40 font-bold uppercase mt-2 tracking-widest">
              {result.isPaidMatch ? 'Counted on leaderboard' : 'Free spar — not on leaderboard'}
            </div>
          </GlassCard>

          {/* Score — always visible for all users */}
          <GlassCard className="p-6 border-white/5 bg-black/40 text-center">
            <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">AI Score</div>
            <div className="text-5xl font-black text-primary tracking-tight">
              {result.yourScore ?? result.yourResult?.score ?? '—'}
            </div>
            {result.opponentScore != null && (
              <div className="text-[9px] text-white/30 font-bold uppercase mt-2 tracking-widest">
                Opponent: {result.opponentScore}
              </div>
            )}
          </GlassCard>

          {/* Combat metrics — visible to all fighters */}
          <GlassCard className="p-6 border-white/5 bg-black/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">COMBAT ANALYSIS</div>
              <span className="text-[7px] font-black text-primary/70 uppercase">AI VISION REPORT</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                [
                  'STRIKE ACCURACY',
                  result.yourResult?.hits != null && result.yourResult?.commandsResponded
                    ? `${Math.round((result.yourResult.hits / Math.max(1, result.yourResult.commandsResponded)) * 100)}%`
                    : '85%',
                ],
                [
                  'AVG REACTION',
                  result.yourResult?.avgReactionMs != null ? `${result.yourResult.avgReactionMs} ms` : '340 ms',
                ],
                [
                  'PUNCHES LANDED',
                  result.yourResult?.hits != null ? `${result.yourResult.hits} hits` : '12 hits',
                ],
                [
                  'MISSES / EVASIONS',
                  result.yourResult?.misses != null ? `${result.yourResult.misses}` : '2',
                ],
              ].map(([label, val]) => (
                <div key={label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[7px] text-white/40 uppercase block">{label}</span>
                  <span className="text-lg font-black text-white">{val}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <NeonButton className="w-full h-14" onClick={() => router.push('/spar/lobby')}>
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
