'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Swords, Trophy, Play, AlertCircle } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

type SparStatus = {
  mode: 'paid' | 'free';
  canSpar: boolean;
  needsAd: boolean;
  remaining: number;
  sparDailyLimit: number;
  sparDailyUsed: number;
  freeSparAvailable: boolean;
  freeSparUnlocked: boolean;
  planName: string | null;
};

type LeaderRow = { uid: string; display_name: string; wins: number; losses: number };

/** Matchmaking + leaderboard — reached after rules intro / ad unlock. */
export default function SparLobbyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SparStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(async () => {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Please log in.');
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const [sRes, lRes] = await Promise.all([
        fetch('/api/spar/status', { headers }),
        fetch('/api/spar/leaderboard', { headers }),
      ]);
      const sData = await sRes.json();
      const lData = await lRes.json();
      if (sRes.ok) setStatus(sData);
      setLeaderboard(lData.rows || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load spar status.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged(() => refresh());
    return () => unsub();
  }, [refresh]);

  const startSearch = async () => {
    setError(null);
    if (!status) return;

    if (status.mode === 'free' && status.needsAd) {
      router.push('/spar/watch-ad');
      return;
    }
    if (!status.canSpar && status.mode === 'paid') {
      setError('Daily spar limit reached. Come back tomorrow or upgrade.');
      return;
    }
    if (status.mode === 'free' && !status.freeSparUnlocked) {
      router.push('/spar/watch-ad');
      return;
    }

    setSearching(true);
    try {
      const headers = await authHeaders();
      const joinRes = await fetch('/api/spar/queue/join', { method: 'POST', headers });
      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        if (joinData.needsAd || joinData.reason === 'needs_ad') {
          router.push('/spar/watch-ad');
          return;
        }
        throw new Error(joinData.error || 'Could not join queue.');
      }

      if (joinData.status === 'matched') {
        sessionStorage.setItem('spar_match', JSON.stringify(joinData));
        router.push(`/spar/match?id=${joinData.matchId}`);
        return;
      }

      const started = Date.now();
      while (Date.now() - started < 90000) {
        await new Promise((r) => setTimeout(r, 1500));
        const stRes = await fetch('/api/spar/queue/status', { headers });
        const stData = await stRes.json();
        if (stData.status === 'matched') {
          sessionStorage.setItem('spar_match', JSON.stringify(stData));
          router.push(`/spar/match?id=${stData.matchId}`);
          return;
        }
      }
      await fetch('/api/spar/queue/leave', { method: 'POST', headers });
      throw new Error('No opponent found. Try again.');
    } catch (e: any) {
      setError(e.message || 'Matchmaking failed.');
      setSearching(false);
      refresh();
    }
  };

  const cancelSearch = async () => {
    try {
      const headers = await authHeaders();
      await fetch('/api/spar/queue/leave', { method: 'POST', headers });
    } catch {
      /* ignore */
    }
    setSearching(false);
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
          <span className="text-[10px] font-black text-primary tracking-widest uppercase block">LIVE 1V1</span>
          <h1 className="text-2xl font-black italic uppercase leading-none">FIND OPPONENT</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <GlassCard className="p-5 border-primary/20 bg-primary/[0.03] flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-primary" />
              <div>
                <div className="text-sm font-black uppercase">
                  {status?.mode === 'paid' ? status.planName : 'Free Spar (Ad-gated)'}
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wide">
                  {status?.mode === 'paid'
                    ? status.sparDailyLimit < 0
                      ? 'Unlimited spars today'
                      : `${status.sparDailyUsed}/${status.sparDailyLimit} used today`
                    : status?.freeSparAvailable
                      ? status.freeSparUnlocked
                        ? 'Ad unlocked — ready to spar'
                        : 'Watch an ad to unlock 1 free spar today'
                      : 'Free spar used — come back tomorrow or subscribe'}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-[11px] text-red-400 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {searching ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 py-4 text-primary font-black uppercase text-xs tracking-widest">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching for opponent…
                </div>
                <button
                  onClick={cancelSearch}
                  className="text-[10px] font-black uppercase text-white/40 hover:text-white tracking-widest"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <NeonButton className="w-full h-14" onClick={startSearch}>
                {status?.needsAd ? (
                  <>
                    WATCH AD TO SPAR <Play className="w-4 h-4 ml-1 fill-black" />
                  </>
                ) : (
                  <>
                    FIND OPPONENT <Swords className="w-4 h-4 ml-1" />
                  </>
                )}
              </NeonButton>
            )}

            {status?.mode === 'free' && !status.freeSparAvailable && (
              <Link
                href="/subscription"
                className="text-center text-[10px] font-black text-primary uppercase tracking-widest"
              >
                Subscribe for more daily spars →
              </Link>
            )}
          </GlassCard>

          <GlassCard className="p-5 border-white/5 bg-black/40">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                Spar Leaderboard (Paid Matches)
              </span>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-[11px] text-white/40 font-semibold">No paid match results yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {leaderboard.slice(0, 10).map((row, i) => (
                  <div key={row.uid} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white/80">
                      <span className="text-white/30 mr-2">#{i + 1}</span>
                      {row.display_name}
                    </span>
                    <span className="font-black text-primary">
                      {row.wins}W · {row.losses}L
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
