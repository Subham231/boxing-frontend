'use client';

import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { subscribeWeeklyLeaderboard, getUserWeeklyRank, type ReflexScoreRow } from '@/lib/firebase-reflex';
import { GlassCard } from '@/components/ui/GlassCard';

interface WeeklyLeaderboardProps {
  gameId: 'reaction_tap' | 'combo_flash';
  topN?: number;
  currentUid?: string | null;
  compact?: boolean;
}

export default function WeeklyLeaderboard({ gameId, topN = 5, currentUid, compact = false }: WeeklyLeaderboardProps) {
  const [rows, setRows] = useState<ReflexScoreRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    const unsub = subscribeWeeklyLeaderboard(gameId, topN, setRows);
    return unsub;
  }, [gameId, topN]);

  useEffect(() => {
    if (!currentUid) return;
    getUserWeeklyRank(gameId, currentUid).then(setMyRank);
  }, [gameId, currentUid, rows]);

  const isInTopList = currentUid ? rows.some((r) => r.uid === currentUid) : false;

  return (
    <GlassCard className={`p-5 border-white/5 bg-black/40 ${compact ? 'p-4' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-primary" />
        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">
          Weekly Leaderboard {gameId === 'reaction_tap' ? '— Reaction Tap' : '— Combo Flash'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="text-[10px] text-white/30 font-bold uppercase text-center py-4">No scores yet this week</p>
        )}
        {rows.map((row, i) => {
          const mine = row.uid === currentUid;
          return (
            <div
              key={row.uid}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                mine ? 'bg-primary/10 border-primary/30' : 'bg-white/[0.02] border-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black w-5 text-center ${i === 0 ? 'text-primary' : 'text-white/40'}`}>#{i + 1}</span>
                <span className="text-xs font-bold text-white">{mine ? 'You' : (row.reflex_profiles?.display_name || maskPhone(row.reflex_profiles?.phone || ''))}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-primary block">{formatScore(gameId, row.weekly_score)}</span>
                {!compact && <span className="text-[8px] text-white/30 font-bold uppercase">Best: {formatScore(gameId, row.best_score)}</span>}
              </div>
            </div>
          );
        })}

        {currentUid && myRank && !isInTopList && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-primary/30 bg-primary/10 mt-1">
            <span className="text-xs font-bold text-white">Your Rank</span>
            <span className="text-xs font-black text-primary">#{myRank}</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function maskPhone(phone: string): string {
  if (!phone) return 'Fighter';
  return `••• ${phone.slice(-4)}`;
}

function formatScore(gameId: 'reaction_tap' | 'combo_flash', score: number | null): string {
  if (score == null) return '--';
  return gameId === 'reaction_tap' ? `${score.toFixed(3)}s` : `${Math.round(score)} pts`;
}
