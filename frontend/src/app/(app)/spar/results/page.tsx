'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Swords } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import ResultHero from '@/components/spar/ResultHero';
import { PaidAnalysis, LockedAnalysis } from '@/components/spar/SparAnalysis';

function SparResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('id') || '';
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    // Always fetch fresh from the server: it decides what this account may
    // see, and it includes both fighters' cards for the result screen.
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
        if (data.status !== 'completed') throw new Error('Results are not ready yet.');
        setResult(data);
      } catch (e: any) {
        setError(e.message || 'Could not load results.');
      }
    })();
  }, [matchId, retryKey]);

  const locked = !!result?.isPremiumLocked;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
      <button
        aria-label="Back to sparring"
        onClick={() => router.push('/spar/lobby')}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      {error && (
        <div className="mx-auto mt-20 max-w-[420px] rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-sm font-semibold text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); setResult(null); setRetryKey((k) => k + 1); }}
            className="mt-3 rounded-xl border border-red-300/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Retry
          </button>
        </div>
      )}

      {!result && !error && (
        <p className="pt-24 text-center text-sm font-semibold uppercase tracking-widest text-white/40">Scoring the round…</p>
      )}

      {result && (
        <>
          <ResultHero
            won={!!result.youWon}
            you={result.you ?? null}
            opponent={result.opponent ?? null}
            yourScore={result.yourScore ?? result.yourResult?.score ?? null}
            opponentScore={result.opponentScore ?? result.opponentResult?.score ?? null}
            paidMatch={!!result.isPaidMatch}
          />

          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 pb-28 pt-8">
            {locked ? (
              <LockedAnalysis onUpgrade={() => router.push('/subscription?reason=spar_analysis')} />
            ) : (
              <PaidAnalysis you={result.yourResult || {}} opponent={result.opponentResult || null} />
            )}

            <button
              type="button"
              onClick={() => router.push('/spar/lobby')}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] text-[12px] font-black uppercase tracking-widest text-white transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Swords className="h-4 w-4" /> Back to lobby
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SparResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-xs font-black uppercase tracking-widest text-white/40">
          Loading results…
        </div>
      }
    >
      <SparResultsInner />
    </Suspense>
  );
}
