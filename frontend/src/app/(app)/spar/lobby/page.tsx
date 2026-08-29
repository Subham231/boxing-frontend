'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

type LeaderRow = {
  uid: string;
  display_name: string;
  avatar_url?: string | null;
  wins: number;
  losses: number;
  matches_played: number;
  win_rate: number;
  avg_score: number;
};

/** Matchmaking + leaderboard — reached after rules intro / ad unlock. */
export default function SparLobbyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SparStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchGenerationRef = useRef(0);

  const authHeaders = useCallback(async () => {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Please log in.');
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  const loadLeaderboard = useCallback(async (period: 'weekly' | 'monthly') => {
    setLoadingLeaderboard(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/spar/leaderboard?period=${period}`, { headers });
      const data = await res.json();
      setLeaderboard(data.rows || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [authHeaders]);

  const refresh = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const sRes = await fetch('/api/spar/status', { headers });
      const sData = await sRes.json();
      if (sRes.ok) setStatus(sData);
      await loadLeaderboard(leaderboardPeriod);
    } catch (e: any) {
      setError(e.message || 'Failed to load spar status.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, leaderboardPeriod, loadLeaderboard]);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged(() => refresh());
    return () => unsub();
  }, [refresh]);

  useEffect(() => {
    loadLeaderboard(leaderboardPeriod);
  }, [leaderboardPeriod, loadLeaderboard]);

  const startSearch = async () => {
    const generation = ++searchGenerationRef.current;
    setError(null);

    setSearching(true);
    try {
      const headers = await authHeaders();
      const joinRes = await fetch('/api/spar/queue/join', { method: 'POST', headers });
      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        throw new Error(joinData.error || 'Could not join queue.');
      }

      if (joinData.status === 'matched') {
        sessionStorage.setItem('spar_match', JSON.stringify(joinData));
        router.push(`/spar/match?id=${joinData.matchId}`);
        return;
      }

      const started = Date.now();
      while (Date.now() - started < 90000 && generation === searchGenerationRef.current) {
        await new Promise((r) => setTimeout(r, 1500));
        if (generation !== searchGenerationRef.current) return;
        const stRes = await fetch('/api/spar/queue/status', { headers });
        const stData = await stRes.json();
        if (generation !== searchGenerationRef.current) return;
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
    searchGenerationRef.current += 1;
    try {
      const headers = await authHeaders();
      await fetch('/api/spar/queue/leave', { method: 'POST', headers });
    } catch {
      /* ignore */
    }
    setSearching(false);
  };

  useEffect(() => () => {
    searchGenerationRef.current += 1;
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-24 font-sans">
      <header className="flex items-center gap-4 mb-6">
        <button
          aria-label="Back to sparring"
          onClick={() => router.push('/spar')}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all"
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
                  {status?.mode === 'paid' ? status.planName : 'Free Spar (Daily)'}
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-wide">
                  {status?.mode === 'paid'
                    ? status.sparDailyLimit < 0
                      ? 'Unlimited spars today'
                      : `${status.sparDailyUsed}/${status.sparDailyLimit} used today`
                    : status?.freeSparAvailable
                      ? '1 free spar available today'
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
                  type="button"
                  onClick={cancelSearch}
                  className="text-[10px] font-black uppercase text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-3 py-2 tracking-widest"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <NeonButton className="w-full h-14" onClick={startSearch}>
                {(
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

          {/* Weekly & Monthly Sparring Leaderboard */}
          <GlassCard className="p-5 border-white/10 bg-black/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">
                  Spar Leaderboard
                </span>
              </div>

              {/* Period Toggle */}
              <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setLeaderboardPeriod('weekly')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    leaderboardPeriod === 'weekly'
                      ? 'bg-primary text-black shadow-[0_0_10px_rgba(226,255,59,0.5)]'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardPeriod('monthly')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    leaderboardPeriod === 'monthly'
                      ? 'bg-primary text-black shadow-[0_0_10px_rgba(226,255,59,0.5)]'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="text-[9px] text-white/40 font-bold uppercase tracking-wider mb-3">
              {leaderboardPeriod === 'weekly'
                ? '⚡ Resets every Monday · Ranked by Wins, Win Rate & Combat Score'
                : '🏆 Resets 1st of every month · Ranked by Wins, Win Rate & Combat Score'}
            </div>

            {loadingLeaderboard ? (
              <div className="flex justify-center py-6 text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-6 text-white/30 text-[11px] font-semibold">
                No matches recorded this {leaderboardPeriod === 'weekly' ? 'week' : 'month'} yet. Be the first to spar!
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {leaderboard.slice(0, 15).map((row, i) => (
                  <div
                    key={row.uid || i}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      i === 0
                        ? 'border-primary/40 bg-gradient-to-r from-primary/10 via-black/40 to-transparent'
                        : i === 1
                          ? 'border-amber-400/30 bg-amber-400/[0.04]'
                          : i === 2
                            ? 'border-orange-500/20 bg-orange-500/[0.03]'
                            : 'border-white/5 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          i === 0
                            ? 'bg-primary text-black font-black shadow-[0_0_8px_rgba(226,255,59,0.6)]'
                            : i === 1
                              ? 'bg-amber-400 text-black'
                              : i === 2
                                ? 'bg-orange-500 text-black'
                                : 'text-white/40 border border-white/10'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white uppercase tracking-tight">
                          {row.display_name}
                        </div>
                        <div className="text-[9px] text-white/40 font-bold uppercase">
                          {row.matches_played} Matches · {row.wins}W - {row.losses}L
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-primary">{row.win_rate}% WR</span>
                        <span className="text-[8px] font-black text-white/40 uppercase">
                          {row.avg_score} Avg Score
                        </span>
                      </div>
                    </div>
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
