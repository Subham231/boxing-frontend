'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowLeft, Swords } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { getRankInfoByLevel } from '@/components/ui/RankBadge';
import { GlassCard } from '@/components/ui/GlassCard';

interface LeaderboardItem {
  uid?: string;
  name: string;
  avatar_url?: string | null;
  score: number;
  display_val: string;
  rank_level?: number;
  matches_played?: number;
  win_rate?: number;
  avg_score?: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user } = useFirebaseUser();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'streak' | 'spar' | 'reflex' | 'combo'>('streak');
  const [sparPeriod, setSparPeriod] = useState<'weekly' | 'monthly'>('weekly');

  const [reflexRankings, setReflexRankings] = useState<LeaderboardItem[]>([]);
  const [streakRankings, setStreakRankings] = useState<LeaderboardItem[]>([]);
  const [comboRankings, setComboRankings] = useState<LeaderboardItem[]>([]);
  const [sparRankings, setSparRankings] = useState<LeaderboardItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const loadSparRankings = useCallback(async (period: 'weekly' | 'monthly') => {
    try {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`/api/spar/leaderboard?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.rows) {
        setSparRankings(
          data.rows.map((r: any) => ({
            uid: r.uid,
            name: r.display_name,
            avatar_url: r.avatar_url || null,
            score: r.wins,
            display_val: `${r.wins}W (${r.win_rate}%)`,
            matches_played: r.matches_played,
            win_rate: r.win_rate,
            avg_score: r.avg_score,
          })),
        );
      }
    } catch (e) {
      console.error('Failed to load spar rankings:', e);
    }
  }, [user]);

  const loadAllRankings = useCallback(async () => {
    if (!supabase) {
      setErrored(true);
      setLoading(false);
      return;
    }

    try {
      // 1. Reflex rankings
      const { data: rtScores } = await supabase
        .from('reflex_scores')
        .select('uid, weekly_score')
        .eq('game_id', 'reaction_tap')
        .not('weekly_score', 'is', null)
        .order('weekly_score', { ascending: true })
        .limit(50);

      const { data: cfScores } = await supabase
        .from('reflex_scores')
        .select('uid, weekly_score')
        .eq('game_id', 'combo_flash')
        .not('weekly_score', 'is', null)
        .order('weekly_score', { ascending: false })
        .limit(50);

      const scoreUids = [...(rtScores || []), ...(cfScores || [])].map((r: any) => r.uid);
      const { data: scoreProfiles } = scoreUids.length
        ? await supabase.from('reflex_public_profiles').select('uid, display_name').in('uid', scoreUids)
        : { data: [] as any[] };
      const nameByUid = new Map<string, string>(
        (scoreProfiles || []).map((p: any) => [p.uid, (p.display_name || 'FIGHTER').toUpperCase()]),
      );

      setReflexRankings(
        (rtScores || []).map((d: any) => ({
          name: nameByUid.get(d.uid) || 'FIGHTER',
          score: d.weekly_score,
          display_val: `${d.weekly_score}s`,
        })),
      );

      // 2. Combo rankings
      setComboRankings(
        (cfScores || []).map((d: any) => ({
          name: nameByUid.get(d.uid) || 'FIGHTER',
          score: d.weekly_score,
          display_val: `${d.weekly_score} pts`,
        })),
      );

      // 3. Streak rankings
      const { data: streakRows } = await supabase
        .from('user_streaks')
        .select('uid, current_streak, longest_streak, rank_level')
        .order('current_streak', { ascending: false })
        .limit(50);

      if (streakRows && streakRows.length > 0) {
        const uids = streakRows.map((r: any) => r.uid);
        const { data: profiles } = await supabase
          .from('reflex_public_profiles')
          .select('uid, display_name, avatar_url')
          .in('uid', uids);
        const profileByUid = new Map<string, { display_name?: string; avatar_url?: string }>(
          (profiles || []).map((p: any) => [p.uid, p]),
        );

        setStreakRankings(
          streakRows.map((r: any) => {
            const p = profileByUid.get(r.uid);
            return {
              uid: r.uid,
              name: (p?.display_name || 'FIGHTER').toUpperCase(),
              avatar_url: p?.avatar_url || null,
              score: r.current_streak,
              display_val: `${r.current_streak} days`,
              rank_level: r.rank_level,
            };
          }),
        );
      } else {
        setStreakRankings([]);
      }

      setErrored(false);
    } catch (e) {
      console.error('Failed to load leaderboard data:', e);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadAllRankings();
    loadSparRankings(sparPeriod);

    if (!supabase) return;
    const channel = supabase
      .channel('leaderboard-user-streaks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_streaks' }, () => {
        loadAllRankings();
      })
      .subscribe();

    const interval = setInterval(loadAllRankings, 30000);

    return () => {
      supabase?.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadAllRankings, loadSparRankings, sparPeriod]);

  useEffect(() => {
    if (activeTab === 'spar') {
      loadSparRankings(sparPeriod);
    }
  }, [activeTab, sparPeriod, loadSparRankings]);

  const activeRankings = React.useMemo(() => {
    if (activeTab === 'spar') return sparRankings;
    if (activeTab === 'reflex') return reflexRankings;
    if (activeTab === 'combo') return comboRankings;
    return streakRankings;
  }, [activeTab, sparRankings, reflexRankings, comboRankings, streakRankings]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading Arena...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 anim-fade-in relative pb-16">
      {/* Telemetry Display */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80 uppercase">MODULE: GLOBAL LEADERBOARD</span>
        <span className="opacity-40 uppercase">{errored ? 'SYNC_STATUS_OFFLINE' : 'SYNC_STATUS_LIVE'}</span>
      </div>

      {/* Page Header */}
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] overflow-hidden bg-black/40 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">
              GLOBAL RANKINGS
            </div>
            <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
              FIGHTER BOARD
            </h1>
          </div>
        </div>

        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </header>

      {/* Segmented control tabs */}
      <div className="flex border border-white/5 bg-white/[0.02] p-1.5 rounded-full select-none gap-1">
        {[
          { id: 'streak', label: 'Streak' },
          { id: 'spar', label: 'Spar 1v1' },
          { id: 'reflex', label: 'Reflex' },
          { id: 'combo', label: 'Combo' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-full transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-primary text-black shadow-[0_4px_12px_rgba(226,255,59,0.25)]'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Panel */}
      <div className="border border-white/5 bg-black/35 rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-white/[0.02] px-5 py-4 border-b border-white/5 flex justify-between items-center select-none">
          <div className="flex items-center gap-2">
            {activeTab === 'spar' ? <Swords className="w-4 h-4 text-primary" /> : <Trophy className="w-4 h-4 text-primary" />}
            <span className="text-[10px] font-black text-white tracking-widest uppercase">
              {activeTab === 'spar' && `Sparring ${sparPeriod.toUpperCase()} (Wins & Win Rate)`}
              {activeTab === 'reflex' && 'Reaction Tap (Avg Time)'}
              {activeTab === 'streak' && 'Continuous training streaks'}
              {activeTab === 'combo' && 'Combo Flash (Avg Score)'}
            </span>
          </div>

          {activeTab === 'spar' ? (
            <div className="flex items-center bg-black/70 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setSparPeriod('weekly')}
                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                  sparPeriod === 'weekly' ? 'bg-primary text-black' : 'text-white/40'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setSparPeriod('monthly')}
                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                  sparPeriod === 'monthly' ? 'bg-primary text-black' : 'text-white/40'
                }`}
              >
                Monthly
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${errored ? 'bg-red-500' : 'bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]'}`} />
              <span className="text-[8px] font-bold text-white/40 uppercase">{errored ? 'OFFLINE' : 'LIVE'}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col max-h-[50vh] overflow-y-auto min-h-[220px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-[10px] font-bold text-white/30 uppercase tracking-[2px]">
              Syncing with AI Core...
            </div>
          ) : errored ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-[10px] font-bold text-white/30 uppercase tracking-[2px] gap-2">
              <span>Couldn&apos;t reach the leaderboard.</span>
              <button onClick={loadAllRankings} className="text-primary underline">Retry</button>
            </div>
          ) : activeRankings.length > 0 ? (
            activeRankings.map((row, idx) => {
              const rank = idx + 1;
              const isMe = row.uid ? row.uid === user?.uid : false;
              const rankTier = activeTab === 'streak' && row.rank_level !== undefined ? getRankInfoByLevel(row.rank_level) : null;

              return (
                <div
                  key={row.uid || `${row.name}-${idx}`}
                  className={`flex justify-between items-center px-5 py-3.5 border-b border-white/[0.02] last:border-0 transition-all duration-150 ${
                    isMe ? 'bg-primary/10 border-l-4 border-primary pl-4' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`text-xs font-black w-6 text-center ${
                      rank === 1
                        ? 'text-yellow-400 font-black text-sm drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                        : rank === 2
                          ? 'text-zinc-300 font-bold'
                          : rank === 3
                            ? 'text-amber-600'
                            : 'text-white/20'
                    }`}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </span>
                    {(activeTab === 'streak' || activeTab === 'spar') && (
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                        {row.avatar_url ? (
                          <img src={row.avatar_url} alt={row.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-black text-white/60">{row.name.charAt(0)}</span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white/80 uppercase tracking-wide">
                          {row.name}
                        </span>
                        {rankTier && (
                          <span className="px-2 py-0.5 text-[7px] font-black rounded uppercase flex items-center gap-1 bg-primary/10 text-primary border border-primary/20">
                            {rankTier.name}
                          </span>
                        )}
                      </div>
                      {activeTab === 'spar' && row.matches_played !== undefined && (
                        <span className="text-[8px] text-white/40 font-bold uppercase">
                          {row.matches_played} Matches · {row.avg_score} Avg Score
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-primary font-black text-xs">
                    {row.display_val}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-[10px] font-bold text-white/30 uppercase tracking-[2px]">
              No entries yet this {sparPeriod}. Be the first on the board.
            </div>
          )}
        </div>
      </div>

      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest text-center select-none">
        {activeTab === 'spar' && (sparPeriod === 'weekly' ? 'Weekly Sparring League. Resets every Monday 12:00 AM.' : 'Monthly Sparring Championship. Resets 1st of every month.')}
        {activeTab === 'reflex' && 'Lower is better. Fastest reaction times globally.'}
        {activeTab === 'streak' && 'Daily discipline. Longest active training streaks, live from every fighter\'s account.'}
        {activeTab === 'combo' && 'Memory and speed. Cumulative combo points per level.'}
      </p>
    </div>
  );
}

