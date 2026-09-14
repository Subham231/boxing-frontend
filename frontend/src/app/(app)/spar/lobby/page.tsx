'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Swords, Trophy, AlertCircle, Video, Mic, Wifi } from 'lucide-react';
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
  queueOnline: number;
  estimatedWaitSeconds: number;
  rankLabel: string;
  mmr: number | null;
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
    const timer = window.setInterval(() => refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    loadLeaderboard(leaderboardPeriod);
  }, [leaderboardPeriod, loadLeaderboard]);

  const currentUserUid = firebaseAuth.currentUser?.uid;
  const currentRank = currentUserUid
    ? leaderboard.findIndex((row) => row.uid === currentUserUid) + 1
    : 0;

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
    <div className="min-h-screen bg-[#0d0d0d] px-4 pb-24 pt-3 font-sans text-white">
      <header className="mx-auto mb-5 flex w-full max-w-[500px] items-center gap-3">
        <button
          aria-label="Back to sparring"
          onClick={() => router.push('/spar')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#242424] text-white/80 transition hover:text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <span className="block text-[12px] font-black uppercase tracking-wider text-primary">LIVE 1V1</span>
          <h1 className="text-[21px] font-black italic uppercase leading-none">FIND OPPONENT</h1>
        </div>
        <span className="rounded-full border border-[#37372f] bg-[#242424] px-3 py-2 text-[11px] font-black uppercase text-[#d0d0b8]">
          <span className="mr-1 text-primary">●</span> {status?.rankLabel || 'UNRANKED'} {status?.mmr ? `• ${status.mmr} MMR` : ''}
        </span>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[500px] flex-col gap-5">
          <GlassCard className="rounded-3xl border-[#35352e] bg-[#1c1c1c] p-7">
            <div className="flex items-center gap-5">
              <div className="flex h-[70px] w-[70px] items-center justify-center rounded-2xl border border-[#3b4130] bg-[#292b29]">
                <Swords className="h-9 w-9 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-[22px] font-black uppercase leading-tight">{status?.mode === 'paid' ? status.planName : 'Free Spar'}</div>
                <div className="mt-1 text-[16px] font-black uppercase tracking-wide text-[#d0d0b8]">
                  {status?.mode === 'paid' ? (status.sparDailyLimit < 0 ? 'Unlimited spars today' : `${status.sparDailyLimit - status.sparDailyUsed} spars remaining`) : '1 free spar available today'}
                </div>
              </div>
              <span className="rounded-md border border-primary/60 bg-primary/10 px-3 py-2 text-[14px] font-black uppercase text-primary">{status?.mode === 'paid' ? 'ACTIVE' : 'FREE'}</span>
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
              <NeonButton className="mt-7 h-16 w-full text-[18px]" onClick={startSearch}>
                {(
                  <>
                    FIND OPPONENT <Swords className="w-4 h-4 ml-1" />
                  </>
                )}
              </NeonButton>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4 text-[13px] font-black uppercase tracking-wide text-[#d0d0b8]">
              <span><span className="mr-2 text-primary">●</span>{status?.queueOnline || 0} FIGHTERS SEARCHING</span>
              <span>EST. WAIT: ~{status?.estimatedWaitSeconds || 12}s</span>
            </div>

            {status?.mode === 'free' && !status.freeSparAvailable && (
              <Link
                href="/subscription"
                className="text-center text-[10px] font-black text-primary uppercase tracking-widest"
              >
                Subscribe for more daily spars →
              </Link>
            )}
          </GlassCard>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: Video, label: 'CAMERA', value: 'Ready (1080p)' },
              { icon: Mic, label: 'AUDIO', value: 'Active Mic' },
              { icon: Wifi, label: 'LATENCY', value: '24ms (Ranked)' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-[#35352e] bg-[#191919] px-3 py-4">
                <div className="flex items-center gap-1 text-[10px] font-black uppercase text-[#d0d0b8]"><Icon className="h-4 w-4 text-primary" />{label}</div>
                <div className="mt-3 whitespace-nowrap text-[12px] font-bold text-white">{value}</div>
              </div>
            ))}
          </div>

          {/* Weekly & Monthly Sparring Leaderboard */}
          <section className="pb-24">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-7 w-7 text-primary" />
                <span className="text-[22px] font-black uppercase tracking-wide text-[#f1f1ed]">
                  Spar Leaderboard
                </span>
              </div>

              {/* Period Toggle */}
              <div className="flex items-center rounded-xl border border-[#35352e] bg-[#242424] p-1">
                <button
                  type="button"
                  onClick={() => setLeaderboardPeriod('weekly')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    leaderboardPeriod === 'weekly'
                      ? 'bg-primary text-black shadow-[0_0_10px_rgba(226,255,59,0.5)]'
                        : 'text-[#d0d0b8] hover:text-white'
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
                        : 'text-[#d0d0b8] hover:text-white'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="mb-5 text-[14px] font-bold uppercase leading-relaxed tracking-wide text-[#d0d0b8]">
              {leaderboardPeriod === 'weekly'
                ? '⚡ RESETS EVERY MONDAY · RANKED BY WINS, WR & COMBAT SCORE'
                : '🏆 RESETS 1ST OF EVERY MONTH · RANKED BY WINS, WR & COMBAT SCORE'}
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
              <div className="flex flex-col gap-3.5">
                {leaderboard.slice(0, 15).map((row, i) => (
                  <div
                    key={row.uid || i}
                    className={`flex min-h-[105px] items-center justify-between rounded-2xl border px-5 py-4 transition-all ${
                      i === 0
                          ? 'border-primary/70 bg-[#1c1c1c]'
                        : 'border-[#292923] bg-[#1c1c1c]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-14 w-14 items-center justify-center rounded-full text-[17px] font-black ${
                          i === 0
                            ? 'bg-primary text-black font-black shadow-[0_0_8px_rgba(226,255,59,0.6)]'
                            : i === 1
                              ? 'bg-amber-400 text-black'
                              : i === 2
                                ? 'bg-orange-500 text-white'
                                : 'border border-[#35352e] bg-[#292929] text-white/60'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-[17px] font-black uppercase tracking-tight text-[#f1f1ed]">
                          {row.display_name}
                        </div>
                        <div className="text-[13px] font-bold uppercase text-[#d0d0b8]">
                          {row.matches_played} Matches · {row.wins}W - {row.losses}L
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[17px] font-black text-primary">{row.win_rate}% WR</span>
                        <span className="text-[12px] font-black uppercase text-[#d0d0b8]">
                          {row.avg_score} Avg Score
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.08] bg-[#0d0d0d]/95 px-4 pb-3 pt-3 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-[500px] items-center gap-4 rounded-3xl border border-[#35352e] bg-[#1c1c1c] px-5 py-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/60 bg-primary/10 text-[17px] font-black text-primary">#{currentRank || '—'}</span>
              <div className="flex-1">
                <div className="text-[17px] font-black uppercase text-[#f1f1ed]">YOU</div>
                <div className="text-[13px] font-bold uppercase text-[#d0d0b8]">Live rank from Supabase</div>
              </div>
              <div className="text-right"><div className="text-[17px] font-black text-primary">{status?.rankLabel || 'UNRANKED'}</div><div className="text-[12px] font-black text-[#d0d0b8]">{status?.mmr || '—'} MMR</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
