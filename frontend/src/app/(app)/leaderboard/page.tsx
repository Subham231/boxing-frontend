'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  ArrowLeft, 
  Flame, 
  Zap, 
  Target, 
  Sparkles,
  Users
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StreakManager } from '@/lib/streak-manager';
import { GlassCard } from '@/components/ui/GlassCard';

interface LeaderboardItem {
  name: string;
  score: number;
  display_val: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'reflex' | 'streak' | 'combo'>('reflex');
  const [playerName, setPlayerName] = useState('FIGHTER');

  // Rankings state
  const [reflexRankings, setReflexRankings] = useState<LeaderboardItem[]>([]);
  const [streakRankings, setStreakRankings] = useState<LeaderboardItem[]>([]);
  const [comboRankings, setComboRankings] = useState<LeaderboardItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Fetch playerName
    try {
      const data = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
      if (data.ring_name || data.ringName) {
        setPlayerName((data.ring_name || data.ringName).toUpperCase());
      }
    } catch (e) {}

    loadAllRankings();
  }, []);

  const loadAllRankings = async () => {
    setLoading(true);
    setError(false);

    try {
      if (supabase) {
        // 1. Reflex rankings (lower average reaction is better)
        const { data: rtData } = await supabase
          .from('leaderboard_reflex_reaction_tap')
          .select('player_name, score, display_score')
          .order('score', { ascending: true })
          .limit(50);
        
        if (rtData) {
          setReflexRankings(rtData.map((d: any) => ({
            name: d.player_name,
            score: d.score,
            display_val: `${d.display_score}s`
          })));
        }

        // 2. Combo rankings (higher average score is better)
        const { data: cfData } = await supabase
          .from('leaderboard_reflex_combo_flash')
          .select('player_name, score, display_score')
          .order('score', { ascending: false })
          .limit(50);

        if (cfData) {
          setComboRankings(cfData.map((d: any) => ({
            name: d.player_name,
            score: d.score,
            display_val: `${d.display_score} pts`
          })));
        }

        // 3. Streak rankings (higher streak is better)
        const { data: stData } = await supabase
          .from('leaderboard_streaks')
          .select('player_name, score, display_score')
          .order('score', { ascending: false })
          .limit(50);

        if (stData) {
          setStreakRankings(stData.map((d: any) => ({
            name: d.player_name,
            score: d.score,
            display_val: `${d.display_score} days`
          })));
        } else {
          // Fallback mock streaks
          loadMockRankings();
        }
      } else {
        loadMockRankings();
      }
    } catch (e) {
      console.warn('Failed to load online rankings, loading fallbacks:', e);
      loadMockRankings();
    } finally {
      setLoading(false);
    }
  };

  const loadMockRankings = () => {
    // Mock reflex
    setReflexRankings([
      { name: 'TITAN_X', score: 0.172, display_val: '0.172s' },
      { name: 'KRONOS_AI', score: 0.185, display_val: '0.185s' },
      { name: 'VIKTOR', score: 0.208, display_val: '0.208s' },
      { name: 'VULCAN', score: 0.245, display_val: '0.245s' },
      { name: 'GUEST_049', score: 0.285, display_val: '0.285s' }
    ]);

    // Mock combo
    setComboRankings([
      { name: 'KRONOS_AI', score: 75, display_val: '75 pts' },
      { name: 'TITAN_X', score: 68, display_val: '68 pts' },
      { name: 'VULCAN', score: 55, display_val: '55 pts' },
      { name: 'VIKTOR', score: 48, display_val: '48 pts' },
      { name: 'GUEST_049', score: 32, display_val: '32 pts' }
    ]);

    // Mock streak
    setStreakRankings([
      { name: 'VIKTOR', score: 28, display_val: '28 days' },
      { name: 'TITAN_X', score: 18, display_val: '18 days' },
      { name: 'VULCAN', score: 12, display_val: '12 days' },
      { name: 'KRONOS_AI', score: 9, display_val: '9 days' },
      { name: 'GUEST_049', score: 5, display_val: '5 days' }
    ]);
  };

  const activeRankings = React.useMemo(() => {
    if (activeTab === 'reflex') return reflexRankings;
    if (activeTab === 'combo') return comboRankings;
    return streakRankings;
  }, [activeTab, reflexRankings, comboRankings, streakRankings]);

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
        <span className="opacity-40 uppercase">SYNC_STATUS_LIVE</span>
      </div>

      {/* Page Header */}
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] overflow-hidden bg-black/40">
            <img 
              src="https://i.pravatar.cc/150?u=leader" 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
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
      <div className="flex border border-white/5 bg-white/[0.02] p-1.5 rounded-full select-none">
        {[
          { id: 'reflex', label: 'Reflex' },
          { id: 'streak', label: 'Streak' },
          { id: 'combo', label: 'Combo' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all duration-300 ${
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
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black text-white tracking-widest uppercase">
              {activeTab === 'reflex' && 'Reaction Tap (Avg Time)'}
              {activeTab === 'streak' && 'Continuous training streaks'}
              {activeTab === 'combo' && 'Combo Flash (Avg Score)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]" />
            <span className="text-[8px] font-bold text-white/40 uppercase">LIVE</span>
          </div>
        </div>

        <div className="flex flex-col max-h-[50vh] overflow-y-auto min-h-[220px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-[10px] font-bold text-white/30 uppercase tracking-[2px]">
              Syncing with AI Core...
            </div>
          ) : activeRankings.length > 0 ? (
            activeRankings.map((row, idx) => {
              const rank = idx + 1;
              const isMe = row.name.toUpperCase() === playerName.toUpperCase();
              
              // Get fighter badges if it's a streak board
              const streakVal = activeTab === 'streak' ? row.score : 0;
              const rankLabel = activeTab === 'streak' ? StreakManager.getRank(streakVal) : null;

              return (
                <div 
                  key={idx}
                  className={`flex justify-between items-center px-5 py-3.5 border-b border-white/[0.02] last:border-0 transition-all duration-150 ${
                    isMe ? 'bg-primary/10 border-l-4 border-primary pl-4' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white/80 uppercase tracking-wide">
                        {row.name}
                      </span>
                      {rankLabel && (
                        <span className={`px-2 py-0.5 text-[7px] font-black rounded uppercase flex items-center gap-1 ${
                          rankLabel.class === 'rank-gold' 
                            ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' 
                            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                        }`}>
                          {rankLabel.name}
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
              No entries found.
            </div>
          )}
        </div>
      </div>

      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest text-center select-none">
        {activeTab === 'reflex' && 'Lower is better. Fastest reaction times globally.'}
        {activeTab === 'streak' && 'Daily discipline. Longest active training streaks.'}
        {activeTab === 'combo' && 'Memory and speed. Cumulative combo points per level.'}
      </p>
    </div>
  );
}
