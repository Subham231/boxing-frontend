'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Settings,
  Dumbbell,
  Bolt,
  Video,
  Download,
  ChevronRight,
  Check,
  Plus,
  RefreshCw,
  TrendingUp,
  Flame,
  Award,
  VideoOff
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useMyProfile } from '@/lib/profile-client';
import { useRankState } from '@/lib/rank-client';

interface VisionSession {
  date: string;
  punches: number;
  score: number;
  reflex_tier: string;
  avg_reflex_ms: number;
  flaw: string;
  advice: string;
  raw_data?: {
    drill_data?: Array<{
      command: string;
      velocity_rating: string;
      reflex_time_ms: number;
      extension_speed_ms: number;
      form_notes: string;
    }>;
  };
}

interface DailySession {
  date: string;
  count: number;
}

interface PlannerSession {
  date: string;
  name: string;
  impact: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'daily' | 'ai'>('daily');
  const [playerName, setPlayerName] = useState('FIGHTER');
  const { profile: myProfile } = useMyProfile();
  const { rankState } = useRankState();

  // History State
  const [dailyHistory, setDailyHistory] = useState<DailySession[]>([]);
  const [plannerHistory, setPlannerHistory] = useState<PlannerSession[]>([]);
  const [visionHistory, setVisionHistory] = useState<VisionSession[]>([]);

  // Selected AI details
  const [selectedVisionIdx, setSelectedVisionIdx] = useState<number | null>(null);

  // Sync animation
  const [syncing, setSyncing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  // Supabase is the single source of truth once the profile has loaded —
  // set unconditionally so a stale locally-cached name can't linger.
  useEffect(() => {
    if (myProfile) {
      setPlayerName((myProfile.display_name || 'FIGHTER').toUpperCase());
    }
  }, [myProfile]);

  const loadData = () => {
    // Player Name
    try {
      const data = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
      if (data.ring_name || data.ringName) {
        setPlayerName((data.ring_name || data.ringName).toUpperCase());
      }
    } catch (e) { }

    const today = new Date();
    const tempDaily: DailySession[] = [];
    const tempPlanner: PlannerSession[] = [];

    // Retrieve last 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toDateString();

      // Daily Grind
      try {
        const completed = JSON.parse(localStorage.getItem('workout_progress_' + dateKey) || '[]');
        if (completed.length > 0) {
          tempDaily.push({ date: d.toISOString(), count: completed.length });
        }
      } catch (e) { }

      // Planner Roadmap
      try {
        const completedPlanners = JSON.parse(localStorage.getItem('planner_drills_completed_' + dateKey) || '[]');
        if (completedPlanners.length > 0) {
          completedPlanners.forEach((p: any) => {
            tempPlanner.push({
              date: d.toISOString(),
              name: p.name || 'Strategy Drill',
              impact: p.impact || 'High'
            });
          });
        }
      } catch (e) { }
    }

    setDailyHistory(tempDaily);
    setPlannerHistory(tempPlanner);

    // AI Vision History
    try {
      const vision = JSON.parse(localStorage.getItem('boxing_session_history') || '[]');
      // Sort by date descending
      vision.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setVisionHistory(vision);
      if (vision.length > 0) {
        setSelectedVisionIdx(0);
      } else {
        setSelectedVisionIdx(null);
      }
    } catch (e) { }
  };

  // Re-reads all local session stores and recomputes stats/charts. There is
  // no "syncing" to a server here — session history lives entirely on this
  // device — this just re-scans localStorage in case data changed in
  // another tab/session.
  const handleRefresh = () => {
    setSyncing(true);
    loadData();
    setTimeout(() => setSyncing(false), 400);
  };

  // Matrix Calculations
  const statsMatrix = useMemo(() => {
    const totalSessions = dailyHistory.length + plannerHistory.length + visionHistory.length;
    const challengeGoal = 30;
    const discipline = Math.min(100, Math.round((totalSessions / challengeGoal) * 100));

    let bestReflex = '--';
    const validReflexes = visionHistory
      .map(v => v.avg_reflex_ms)
      .filter(ms => ms && !isNaN(ms));

    if (validReflexes.length > 0) {
      bestReflex = `${(Math.min(...validReflexes) / 1000).toFixed(2)}s`;
    } else if (typeof window !== 'undefined') {
      const rtBestVal = localStorage.getItem('reflex_rt_best');
      if (rtBestVal) {
        bestReflex = `${parseFloat(rtBestVal).toFixed(2)}s`;
      }
    }

    return {
      completed: totalSessions,
      left: Math.max(0, challengeGoal - totalSessions),
      discipline: `${discipline}%`,
      bestReflex
    };
  }, [dailyHistory, plannerHistory, visionHistory]);

  // Selected Vision detail
  const activeVision = useMemo(() => {
    if (selectedVisionIdx === null || selectedVisionIdx >= visionHistory.length) return null;
    return visionHistory[selectedVisionIdx];
  }, [selectedVisionIdx, visionHistory]);

  // SVG Chart rendering data
  const chartPath = useMemo(() => {
    const days = 14;
    const points: Array<{ score: number; label: string }> = [];
    const today = new Date();

    for (let i = days; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toDateString();

      const dailyMatches = dailyHistory.filter(item => new Date(item.date).toDateString() === dStr);
      const dailyScore = dailyMatches.reduce((acc, curr) => acc + curr.count * 20, 0);

      const visionMatches = visionHistory.filter(item => new Date(item.date).toDateString() === dStr);
      const visionScore = visionMatches.reduce((acc, curr) => acc + curr.punches, 0);

      points.push({ score: dailyScore + visionScore, label: dStr });
    }

    const maxScore = Math.max(...points.map(p => p.score), 100);
    const width = 400;
    const height = 150;
    const padding = 20;

    let pathD = '';
    let finalDot = { x: 0, y: height - padding };

    points.forEach((p, idx) => {
      const x = (idx / days) * width;
      const y = height - padding - (p.score / maxScore) * (height - padding * 2);

      if (idx === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }

      if (idx === points.length - 1) {
        finalDot = { x, y };
      }
    });

    // Reference projected curve
    let projD = `M 0 120 Q 200 80 400 40`;

    return { pathD, projD, finalDot };
  }, [dailyHistory, visionHistory]);

  const handleExportHUD = () => {
    if (navigator.vibrate) navigator.vibrate(50);

    const report = `🥊 SPARAI COMBAT HUD\n` +
      `----------------------------\n` +
      `FIGHTER: ${playerName.toUpperCase()}\n` +
      `DATE: ${new Date().toLocaleDateString()}\n\n` +
      `PERFORMANCE MATRIX:\n` +
      `🔥 Sessions Completed: ${statsMatrix.completed}\n` +
      `⚡ Discipline Rating: ${statsMatrix.discipline}\n` +
      `⏱️ Best Reflex Speed: ${statsMatrix.bestReflex}\n` +
      `🎯 Sessions Remaining: ${statsMatrix.left}\n\n` +
      `STATUS: PRO TIER READY\n` +
      `----------------------------\n` +
      `#ZephyrAI #BoxingGuru #CombatTelemetry`;

    navigator.clipboard.writeText(report).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }).catch(() => {
      alert("Biometric report copied fallback: \n" + report);
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading Analytics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 anim-fade-in relative pb-16">
      {/* Telemetry Display */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80 uppercase">MODULE: ANALYTICS CORE</span>
        <span className="opacity-40 uppercase">DATA_SYNC_ONLINE</span>
      </div>

      {/* Page Header */}
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] overflow-hidden bg-black/40 flex items-center justify-center">
            {myProfile?.avatar_url ? (
              <img
                src={myProfile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-black text-primary">{playerName.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">
              PERFORMANCE TELEMETRY
            </div>
            <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
              {mode === 'daily' ? 'THE PROOF' : 'AI CORE'}
            </h1>
          </div>
        </div>

        <button
          onClick={() => router.push('/settings')}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Mode Selector Tabs */}
      <div className="flex border border-white/5 bg-white/[0.02] p-1.5 rounded-full select-none">
        <button
          onClick={() => setMode('daily')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-full transition-all duration-300 ${mode === 'daily'
              ? 'bg-primary text-black shadow-[0_4px_12px_rgba(226,255,59,0.25)]'
              : 'text-white/40 hover:text-white'
            }`}
        >
          Daily Protocol
        </button>
        <button
          onClick={() => setMode('ai')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-full transition-all duration-300 ${mode === 'ai'
              ? 'bg-primary text-black shadow-[0_4px_12px_rgba(226,255,59,0.25)]'
              : 'text-white/40 hover:text-white'
            }`}
        >
          AI Biometrics
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'daily' ? (
          <motion.div
            key="daily-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            {/* Chart Output Card */}
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] font-black text-primary uppercase tracking-[2px]">
                  POWER OUTPUT INDEX
                </span>
                <div className="flex gap-4 font-mono text-[7px] text-white/40 font-bold uppercase">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-0.5 bg-primary" />
                    <span>ATHLETE</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-0.5 border-b border-dashed border-white/30" />
                    <span>AI PROJECTION</span>
                  </div>
                </div>
              </div>

              {/* Chart SVG */}
              <GlassCard className="p-5 border-white/5 bg-black/45 relative overflow-hidden flex flex-col justify-between">
                <svg className="w-full h-36 overflow-visible" viewBox="0 0 400 150">
                  {/* Projection dashed path */}
                  <path
                    d={chartPath.projD}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1.5"
                    strokeDasharray="4"
                  />
                  {/* Actual Athlete path */}
                  {chartPath.pathD && (
                    <motion.path
                      d={chartPath.pathD}
                      fill="none"
                      stroke="#E2FF3B"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 6px rgba(226,255,59,0.4))"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  )}
                  {/* Final dot indicator */}
                  {chartPath.pathD && (
                    <circle
                      cx={chartPath.finalDot.x}
                      cy={chartPath.finalDot.y}
                      r="5"
                      fill="#fff"
                      stroke="#E2FF3B"
                      strokeWidth="2.5"
                    />
                  )}
                </svg>

                <div className="flex justify-between mt-3 font-mono text-[8px] font-black text-white/30 tracking-widest">
                  <span>14D AGO</span>
                  <span>7D AGO</span>
                  <span>TODAY</span>
                </div>
              </GlassCard>
            </div>

            {/* Matrix Stats */}
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] font-black tracking-[2px] text-white uppercase">
                  TRIPLE THREAT MATRIX
                </span>
                <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[6px] font-black rounded uppercase tracking-wider">
                  IN-PEAK FORM
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { value: statsMatrix.completed, label: 'Sessions Completed' },
                  { value: statsMatrix.discipline, label: 'Discipline' },
                  { value: statsMatrix.bestReflex, label: 'Best Reflex' },
                  { value: statsMatrix.left, label: 'Sessions Left' }
                ].map((item, idx) => (
                  <GlassCard key={idx} className="p-4 text-center border-white/5 bg-black/40">
                    <div className="text-2xl font-black italic text-white leading-none mb-1">
                      {item.value}
                    </div>
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">
                      {item.label}
                    </span>
                  </GlassCard>
                ))}
              </div>
            </div>

            {/* Streak History — authoritative, from Supabase (video-analysis sessions only) */}
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] font-black tracking-[2px] text-white uppercase">
                  STREAK HISTORY
                </span>
                <Flame className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { value: rankState?.current_streak ?? 0, label: 'Current Streak' },
                  { value: rankState?.longest_streak ?? 0, label: 'Longest Streak' },
                ].map((item, idx) => (
                  <GlassCard key={idx} className="p-4 text-center border-white/5 bg-black/40">
                    <div className="text-2xl font-black italic text-white leading-none mb-1">
                      {item.value}
                    </div>
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">
                      {item.label}
                    </span>
                  </GlassCard>
                ))}
              </div>
            </div>


            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] font-black tracking-[2px] text-white uppercase">
                  SESSION HISTORY
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1 bg-transparent border border-primary text-primary hover:bg-primary hover:text-black transition-all text-[8px] font-black uppercase rounded-full shadow-[0_0_10px_rgba(226,255,59,0.15)] disabled:opacity-40"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Refreshing...' : 'REFRESH'}</span>
                </button>
              </div>

              {/* 1. Daily Grind list */}
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-wider">
                  DAILY GRIND DRILLS
                </span>
                {dailyHistory.length > 0 ? (
                  dailyHistory.map((item, idx) => {
                    const d = new Date(item.date);
                    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                    const day = d.getDate();
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-black/40"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/50">
                            <Dumbbell className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-white leading-none">
                              Daily Session
                            </h4>
                            <span className="text-[8px] font-black text-white/40 block mt-1 uppercase">
                              {month} {day} • COMPLETED
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-white italic leading-none">
                            {item.count}
                          </span>
                          <span className="text-[6px] font-black text-white/30 block mt-0.5 uppercase tracking-wide">
                            DRILLS
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 border border-dashed border-white/5 rounded-2xl text-[8px] font-black text-white/20 uppercase tracking-widest">
                    No drills logged
                  </div>
                )}
              </div>

              {/* 2. Planner Protocol list */}
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black text-primary/70 uppercase tracking-wider">
                  ROADMAP PROTOCOLS
                </span>
                {plannerHistory.length > 0 ? (
                  plannerHistory.map((item, idx) => {
                    const d = new Date(item.date);
                    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                    const day = d.getDate();
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 to-black/40"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary">
                            <Bolt className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-primary leading-none">
                              {item.name}
                            </h4>
                            <span className="text-[8px] font-black text-white/40 block mt-1 uppercase">
                              {month} {day} • ROADMAP
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-primary uppercase">
                            {item.impact}
                          </span>
                          <span className="text-[6px] font-black text-white/30 block mt-0.5 uppercase tracking-wide">
                            IMPACT
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 border border-dashed border-primary/5 rounded-2xl text-[8px] font-black text-primary/20 uppercase tracking-widest">
                    No strategies deployed
                  </div>
                )}
              </div>

              {/* 3. Vision Session list */}
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black text-red-500/70 uppercase tracking-wider">
                  AI VISION SESSIONS
                </span>
                {visionHistory.length > 0 ? (
                  visionHistory.map((item, idx) => {
                    const d = new Date(item.date);
                    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                    const day = d.getDate();
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedVisionIdx(idx);
                          setMode('ai');
                        }}
                        className="p-4 rounded-2xl border border-red-500/10 bg-black/45 hover:border-red-500/30 cursor-pointer transition-all flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center text-red-500">
                              <Video className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase text-white leading-none">
                                AI Vision Drill
                              </h4>
                              <span className="text-[8px] font-black text-white/40 block mt-1 uppercase">
                                {month} {day} • VISION CORE
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <span className="text-lg font-black text-white italic leading-none">
                                {item.punches}
                              </span>
                              <span className="text-[6px] font-black text-white/30 block mt-0.5 uppercase tracking-wide">
                                HITS
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20" />
                          </div>
                        </div>
                        <div className="text-[9px] font-bold text-white/50 leading-relaxed border-t border-white/5 pt-2 flex gap-1 items-start">
                          <span className="text-red-500 font-extrabold flex-shrink-0 uppercase">// AI FLAW:</span>
                          <span className="italic uppercase">{item.flaw}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 border border-dashed border-red-500/5 rounded-2xl text-[8px] font-black text-red-500/30 uppercase tracking-widest">
                    No vision sessions logged
                  </div>
                )}
              </div>
            </div>

            {/* Export HUD Button */}
            <NeonButton
              onClick={handleExportHUD}
              className="w-full h-16 mt-4 flex items-center justify-center gap-2.5 font-black uppercase text-sm tracking-wider"
            >
              {copySuccess ? (
                <>
                  <Check className="w-5 h-5 stroke-[3]" /> COPIED TO CLIPBOARD
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" /> EXPORT ATHLETE HUD
                </>
              )}
            </NeonButton>
          </motion.div>
        ) : (
          <motion.div
            key="ai-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            {activeVision ? (
              <div className="flex flex-col gap-6">
                {/* Header title */}
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] font-black text-white uppercase tracking-[2px]">
                    LATEST BIOMETRIC SCAN
                  </span>
                  <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[8px] font-black rounded uppercase tracking-wider">
                    {(() => {
                      const d = new Date(activeVision.date);
                      return `${d.toLocaleString('default', { month: 'short' }).toUpperCase()} ${d.getDate()}`;
                    })()}
                  </span>
                </div>

                {/* AI scoring card */}
                <div className="flex flex-col gap-4">
                  <GlassCard className="p-6 border-primary/20 bg-primary/[0.01]">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center text-2xl font-black text-white mx-auto mb-2 relative">
                          {activeVision.score}
                        </div>
                        <span className="text-[7px] font-black text-white/40 uppercase tracking-widest block">
                          POSTURE SCORE
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full border-4 border-white/5 flex items-center justify-center text-sm font-black text-primary mx-auto mb-2 uppercase">
                          {activeVision.reflex_tier}
                        </div>
                        <span className="text-[7px] font-black text-white/40 uppercase tracking-widest block">
                          REFLEX TIER
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 p-3.5 bg-black/60 border border-red-500/10 rounded-2xl text-center flex flex-col gap-1">
                      <span className="text-[7px] font-black text-red-500 tracking-widest uppercase">
                        PRIMARY TECHNICAL FLAW
                      </span>
                      <span className="text-xs font-black text-white uppercase font-mono tracking-wide">
                        {activeVision.flaw}
                      </span>
                    </div>
                  </GlassCard>

                  {/* Coach advice feedback */}
                  <GlassCard className="p-5 border-white/5 bg-black/45 relative -mt-3.5 rounded-t-none">
                    <span className="text-[7px] font-black text-primary tracking-widest uppercase block mb-1.5">
                      AI COACH FEEDBACK
                    </span>
                    <p className="text-xs font-semibold text-white/60 leading-relaxed italic">
                      &ldquo;{activeVision.advice}&rdquo;
                    </p>
                  </GlassCard>
                </div>

                {/* Precision Breakdown */}
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-black tracking-[2px] text-white uppercase select-none">
                    PRECISION BREAKDOWN
                  </span>

                  <div className="flex flex-col gap-3">
                    {activeVision.raw_data?.drill_data && activeVision.raw_data.drill_data.length > 0 ? (
                      activeVision.raw_data.drill_data.map((hit, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border border-white/5 bg-black/40 flex flex-col gap-3"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-white font-mono tracking-wider">
                              {hit.command}
                            </span>
                            <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[6px] font-black rounded uppercase tracking-wider">
                              {hit.velocity_rating}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="px-3.5 py-2 bg-black/40 rounded-xl flex justify-between items-center text-[9px]">
                              <span className="text-white/40 font-bold uppercase">REFLEX</span>
                              <span className="font-mono text-primary font-black">{hit.reflex_time_ms}ms</span>
                            </div>
                            <div className="px-3.5 py-2 bg-black/40 rounded-xl flex justify-between items-center text-[9px]">
                              <span className="text-white/40 font-bold uppercase">SPEED</span>
                              <span className="font-mono text-primary font-black">{hit.extension_speed_ms}ms</span>
                            </div>
                          </div>

                          <p className="text-[8px] font-bold text-white/40 italic leading-relaxed pl-1">
                            &ldquo;{hit.form_notes}&rdquo;
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-[8px] font-black text-white/20 uppercase tracking-widest">
                        Session logic mapping not available for this record.
                      </div>
                    )}
                  </div>
                </div>

                {/* Session select dropdown overlay */}
                {visionHistory.length > 1 && (
                  <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-4 flex flex-col gap-2">
                    <span className="text-[7px] font-black text-white/30 tracking-wider uppercase text-center block mb-1">
                      SELECT HISTORY SESSION
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                      {visionHistory.map((item, idx) => {
                        const d = new Date(item.date);
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedVisionIdx(idx)}
                            className={`px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-wider flex-shrink-0 transition-all ${selectedVisionIdx === idx
                                ? 'bg-primary border-primary text-black font-black'
                                : 'bg-black/40 border-white/5 text-white/60 hover:text-white'
                              }`}
                          >
                            {d.toLocaleString('default', { month: 'short' }).toUpperCase()} {d.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 px-8 text-white/30 flex flex-col items-center gap-4 select-none">
                <VideoOff className="w-12 h-12 text-white/10" />
                <div>
                  <h3 className="text-sm font-black uppercase text-white/80 tracking-widest leading-none mb-1">
                    No AI Session History
                  </h3>
                  <p className="text-[9px] text-white/30 leading-relaxed uppercase tracking-wider max-w-[280px]">
                    Complete an AI Vision Session to unlock depth-mapping and biomechanical analysis.
                  </p>
                </div>
                <NeonButton
                  onClick={() => router.push('/vision')}
                  className="h-12 px-6 mt-2 text-xs font-black uppercase tracking-wider"
                >
                  START AI VISION
                </NeonButton>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}