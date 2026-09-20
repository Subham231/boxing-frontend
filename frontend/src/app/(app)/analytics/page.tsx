'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Dumbbell,
  Bolt,
  Video,
  Download,
  ChevronRight,
  Check,
  RefreshCw,
  Flame,
  VideoOff
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useMyProfile } from '@/lib/profile-client';
import { useRankState } from '@/lib/rank-client';

interface VisionSession {
  date: string;
  mode?: 'punches' | 'defense' | 'freestyle';
  punches: number;
  hits?: number;
  misses?: number;
  attempted?: number;
  score: number;
  reflex_tier: string;
  avg_reflex_ms: number;
  accuracy: number;
  power_score?: number;
  tracking_score?: number;
  reflex_score?: number;
  rotation_score?: number;
  hip_rotation_score?: number;
  torso_rotation_score?: number;
  knee_drive_score?: number;
  weight_transfer_score?: number;
  foot_pivot_score?: number;
  head_lateral_score?: number;
  head_drop_score?: number;
  trajectory_accuracy?: number;
  flaw: string;
  advice: string;
  detailed_flaws?: Array<{
    techniqueLabel: string;
    measuredValue: number;
    targetValue: number;
    severity: string;
    cause: string;
    coachingTip: string;
    correctiveExercise: string;
    recommendedFrequency: string;
    progressionTarget: string;
    sampleSize: number;
  }>;
  technique_summaries?: Array<{ label: string; avgScore: number; sampleSize: number }>;
  raw_data?: {
    drill_data?: Array<{
      command: string;
      velocity_rating: string;
      reflex_time_ms: number;
      extension_speed_ms: number;
      form_notes: string;
    }>;
    reps?: Array<{
      index: number;
      command: string;
      kind: 'punch' | 'defense';
      hit: boolean;
      reactionMs: number | null;
      peakVelocity: number;
      estimatedPower: number;
      torsoRotationScore: number;
      hipRotationScore: number;
      kneeDriveScore: number;
      weightTransferScore: number;
      footPivotScore: number;
      headLateralScore: number;
      headDropScore: number;
      trajectory: string;
      trajectoryMatch: boolean;
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

interface HexMetric {
  label: string;
  value: number;
}

function HexagonGraph({ metrics, accent = '#e2ff3b' }: { metrics: HexMetric[]; accent?: string }) {
  const size = 240;
  const center = size / 2;
  const radius = 78;
  const angleFor = (index: number) => (-Math.PI / 2) + (index * Math.PI * 2) / 6;
  const point = (index: number, scale: number) => {
    const angle = angleFor(index);
    return `${(center + Math.cos(angle) * radius * scale).toFixed(1)},${(center + Math.sin(angle) * radius * scale).toFixed(1)}`;
  };
  const outline = Array.from({ length: 6 }, (_, index) => point(index, 1)).join(' ');
  const rings = [0.33, 0.66, 1].map((scale) => (
    <polygon key={scale} points={Array.from({ length: 6 }, (_, index) => point(index, scale)).join(' ')} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
  ));
  const values = Array.from({ length: 6 }, (_, index) => metrics[index]?.value ?? 0);
  const dataPoints = values.map((value, index) => point(index, Math.max(0.04, Math.min(100, value)) / 100)).join(' ');

  return (
    <div className="flex items-center justify-center gap-4 py-1">
      <div className="relative w-[240px] h-[240px] shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" role="img" aria-label="Six-axis biomechanics graph">
          <polygon points={outline} fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          {rings}
          {Array.from({ length: 6 }, (_, index) => (
            <line key={index} x1={center} y1={center} x2={point(index, 1).split(',')[0]} y2={point(index, 1).split(',')[1]} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          ))}
          <polygon points={dataPoints} fill={`${accent}22`} stroke={accent} strokeWidth="2" />
          {values.map((value, index) => {
            const [x, y] = point(index, Math.max(0.04, Math.min(100, value)) / 100).split(',');
            return <circle key={index} cx={x} cy={y} r="3.5" fill={accent} stroke="#090b0d" strokeWidth="2" />;
          })}
        </svg>
        {metrics.slice(0, 6).map((metric, index) => {
          const angle = angleFor(index);
          const x = 50 + Math.cos(angle) * 48;
          const y = 50 + Math.sin(angle) * 48;
          return (
            <span key={metric.label} className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-black uppercase tracking-wider text-white/50 whitespace-nowrap" style={{ left: `${x}%`, top: `${y}%` }}>
              {metric.label}
            </span>
          );
        })}
      </div>
      <div className="hidden sm:flex flex-col gap-2 min-w-[92px]">
        {metrics.slice(0, 6).map((metric) => (
          <div key={metric.label} className="flex items-center justify-between gap-2 text-[8px] font-mono">
            <span className="text-white/40 uppercase">{metric.label}</span>
            <span className="font-black" style={{ color: accent }}>{Math.round(metric.value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
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
    const refreshFromLocalActivity = () => loadData();
    window.addEventListener('storage', refreshFromLocalActivity);
    window.addEventListener('focus', refreshFromLocalActivity);
    return () => {
      window.removeEventListener('storage', refreshFromLocalActivity);
      window.removeEventListener('focus', refreshFromLocalActivity);
    };
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
    } catch { }

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
      } catch { }

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
      } catch { }
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
    } catch { }
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

  const latestVision = visionHistory[0];
  const latestReps = latestVision?.raw_data?.reps ?? [];
  const kinematicStats = useMemo(() => {
    const punches = latestReps.filter((rep) => rep.kind === 'punch' && rep.hit);
    const defenses = latestReps.filter((rep) => rep.kind === 'defense' && rep.hit);
    const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    const force = punches.map((rep) => rep.estimatedPower);
    const latency = visionHistory.slice(0, 6).map((session) => session.avg_reflex_ms).filter((value) => value > 0).reverse();
    const volume = punches.reduce<Record<string, number>>((counts, rep) => {
      counts[rep.command] = (counts[rep.command] ?? 0) + 1;
      return counts;
    }, {});
    return {
      force: average(force),
      defense: average(defenses.map((rep) => (rep.headLateralScore + rep.headDropScore) / 2)),
      volume,
      latency,
      totalPunches: punches.length,
    };
  }, [latestReps, visionHistory]);

  const trendPoints = kinematicStats.latency.length > 1
    ? kinematicStats.latency.map((value, index) => `${10 + index * (280 / (kinematicStats.latency.length - 1))},${70 - Math.min(52, Math.max(0, (value - 150) / 8))}`).join(' ')
    : '10,70 80,65 150,52 220,42 290,30';

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
    const projD = `M 0 120 Q 200 80 400 40`;

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

            <section className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-[2px] text-primary uppercase">DEEP KINEMATIC ANALYTICS</span>
                <span className="text-[8px] font-black tracking-widest text-white/35 uppercase">LIVE FEED</span>
              </div>

              <GlassCard className="p-4 border-primary/15 bg-black/45">
                <div className="flex items-start justify-between mb-2">
                  <div><span className="block text-[10px] font-black text-white uppercase">Punch velocity &amp; force</span><span className="text-[8px] text-white/40">Impact in PVS based on measured speed</span></div>
                  <span className="text-[9px] font-black text-primary">{kinematicStats.force || '--'} PVS</span>
                </div>
                <svg viewBox="0 0 300 105" className="w-full h-28" role="img" aria-label="Punch velocity and force trend">
                  <defs><linearGradient id="force-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e2ff3b" stopOpacity="0.42" /><stop offset="1" stopColor="#e2ff3b" stopOpacity="0" /></linearGradient></defs>
                  <path d="M 8 88 C 55 82, 68 32, 112 30 S 170 60, 205 50 S 255 68, 292 18 L 292 95 L 8 95 Z" fill="url(#force-fill)" />
                  <path d="M 8 88 C 55 82, 68 32, 112 30 S 170 60, 205 50 S 255 68, 292 18" fill="none" stroke="#e2ff3b" strokeWidth="2.5" />
                  <path d="M 8 70 H 292" stroke="rgba(255,255,255,0.13)" strokeDasharray="3 4" />
                </svg>
                <div className="flex justify-between text-[7px] font-mono text-white/35 uppercase"><span>Round 1</span><span>Round 4</span><span>Peak: {latestReps.length ? Math.max(...latestReps.map((rep) => rep.peakVelocity)) : '--'}°/s</span></div>
              </GlassCard>

              <GlassCard className="p-4 border-white/5 bg-black/40">
                <div className="flex items-center justify-between mb-3"><div><span className="block text-[10px] font-black text-white uppercase">Strike volume distribution</span><span className="text-[8px] text-white/40">Round-by-round weapon breakdown</span></div><span className="text-[9px] font-black text-white">{kinematicStats.totalPunches} STRIKES</span></div>
                <div className="flex flex-col gap-2">
                  {['JAB', 'CROSS', 'HOOK', 'UPPERCUT'].map((command, index) => {
                    const count = kinematicStats.volume[command] ?? 0;
                    const max = Math.max(1, ...Object.values(kinematicStats.volume));
                    return <div key={command}><div className="flex justify-between text-[7px] font-black uppercase text-white/55"><span>{command}</span><span className="text-primary">{count} ({Math.round((count / Math.max(1, kinematicStats.totalPunches)) * 100)}%)</span></div><div className="h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden"><div className={`h-full rounded-full ${index % 2 ? 'bg-cyan-400' : 'bg-primary'}`} style={{ width: `${(count / max) * 100}%` }} /></div></div>;
                  })}
                </div>
              </GlassCard>

              <GlassCard className="p-4 border-white/5 bg-black/40">
                <div className="flex items-start justify-between mb-2"><div><span className="block text-[10px] font-black text-white uppercase">Reflex latency trend</span><span className="text-[8px] text-white/40">Measured response time in ms</span></div><span className="text-[10px] font-black text-primary">{latestVision?.avg_reflex_ms || '--'} ms</span></div>
                <svg viewBox="0 0 300 90" className="w-full h-24" role="img" aria-label="Reflex latency trend"><path d={`M ${trendPoints.split(' ').join(' L ')}`} fill="none" stroke="#22d3ee" strokeWidth="2" /><path d="M 10 70 H 290" stroke="rgba(255,255,255,0.1)" strokeDasharray="3 4" />{trendPoints.split(' ').map((point) => { const [cx, cy] = point.split(','); return <circle key={point} cx={cx} cy={cy} r="2.5" fill="#e2ff3b" />; })}</svg>
                <div className="flex justify-between text-[7px] font-mono text-white/35 uppercase"><span>Oldest</span><span>Latest measured session</span></div>
              </GlassCard>

              <GlassCard className="p-4 border-white/5 bg-black/40">
                <div className="flex items-center justify-between mb-3"><div><span className="block text-[10px] font-black text-white uppercase">Combat intensity zones</span><span className="text-[8px] text-white/40">Cardiovascular output distribution</span></div><span className="text-[9px] font-black text-rose-400">LIVE</span></div>
                <div className="flex items-center gap-4"><div className="w-20 h-20 rounded-full border-[7px] border-primary border-r-cyan-400 border-b-white/10 flex items-center justify-center"><span className="text-lg font-black text-white">{latestVision ? `${Math.min(99, Math.max(1, latestVision.score))}%` : '--'}</span></div><div className="flex flex-col gap-1.5 text-[8px] font-bold text-white/60"><span><i className="inline-block w-2 h-2 rounded-full bg-primary mr-1" /> Zone 5 · anaerobic output</span><span><i className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1" /> Zone 4 · threshold pace</span><span><i className="inline-block w-2 h-2 rounded-full bg-white/40 mr-1" /> Zone 3 · aerobic base</span></div></div>
              </GlassCard>
            </section>


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

                <GlassCard className="p-4 border-primary/20 bg-black/45 overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-[9px] font-black text-primary tracking-widest uppercase block">Performance Profile</span>
                      <span className="text-[8px] text-white/35 uppercase tracking-wider">Six-axis movement signature</span>
                    </div>
                    <span className="text-[8px] font-black text-white/35 uppercase tracking-wider">{activeVision.mode === 'defense' ? 'DEFENSE MAP' : 'STRIKE MAP'}</span>
                  </div>
                  <HexagonGraph
                    accent={activeVision.mode === 'defense' ? '#fb7185' : '#e2ff3b'}
                    metrics={activeVision.mode === 'defense'
                      ? [
                          { label: 'Lateral', value: activeVision.head_lateral_score ?? 0 },
                          { label: 'Drop', value: activeVision.head_drop_score ?? 0 },
                          { label: 'Tracking', value: activeVision.tracking_score ?? 0 },
                          { label: 'Accuracy', value: activeVision.accuracy },
                          { label: 'Reflex', value: activeVision.reflex_score ?? 0 },
                          { label: 'Volume', value: Math.min(100, (activeVision.hits ?? activeVision.punches) * 5) },
                        ]
                      : [
                          { label: 'Power', value: activeVision.power_score ?? 0 },
                          { label: 'Hip', value: activeVision.hip_rotation_score ?? 0 },
                          { label: 'Torso', value: activeVision.torso_rotation_score ?? 0 },
                          { label: 'Knee', value: activeVision.knee_drive_score ?? 0 },
                          { label: 'Transfer', value: activeVision.weight_transfer_score ?? 0 },
                          { label: 'Pivot', value: activeVision.foot_pivot_score ?? 0 },
                        ]}
                  />
                </GlassCard>

                <GlassCard className="p-5 border-white/5 bg-black/40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black text-primary tracking-widest uppercase">
                      Biomechanics Summary
                    </span>
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-wider">
                      {(activeVision.mode || 'punches').toUpperCase()} MODE
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      ...(activeVision.mode === 'defense'
                        ? [
                            ['Head Lateral', activeVision.head_lateral_score],
                            ['Head Drop', activeVision.head_drop_score],
                          ]
                        : [
                            ['Power', activeVision.power_score],
                            ['Hip Rotation', activeVision.hip_rotation_score],
                            ['Torso Rotation', activeVision.torso_rotation_score],
                            ['Knee Drive', activeVision.knee_drive_score],
                            ['Weight Transfer', activeVision.weight_transfer_score],
                            ['Foot Pivot', activeVision.foot_pivot_score],
                            ['Trajectory', activeVision.trajectory_accuracy],
                          ]),
                    ].filter((metric): metric is [string, number] => typeof metric[1] === 'number').map(([label, value]) => (
                      <div key={label} className="bg-black/40 border border-white/5 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[7px] font-black text-white/40 uppercase tracking-wider">{label}</span>
                          <span className="text-[10px] font-black text-primary">{value}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      ['Hits', activeVision.hits ?? activeVision.punches],
                      ['Misses', activeVision.misses ?? 0],
                      ['Accuracy', activeVision.accuracy],
                    ].map(([label, value]) => (
                      <div key={label} className="text-center border border-white/5 rounded-xl py-2">
                        <div className="text-xs font-black text-white">{value}{label === 'Accuracy' ? '%' : ''}</div>
                        <span className="text-[6px] font-black text-white/35 uppercase tracking-wider">{label}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {activeVision.detailed_flaws && activeVision.detailed_flaws.length > 0 && (
                  <GlassCard className="p-5 border-white/5 bg-black/40">
                    <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-3">
                      Measured Coaching Opportunities
                    </span>
                    <div className="flex flex-col gap-3">
                      {activeVision.detailed_flaws.map((flaw, idx) => (
                        <div key={`${flaw.techniqueLabel}-${idx}`} className="border border-white/5 bg-white/[0.02] rounded-xl p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black text-white uppercase">{flaw.techniqueLabel}</span>
                            <span className="text-[7px] font-black text-orange-400 uppercase">{flaw.severity}</span>
                          </div>
                          <p className="text-[9px] text-white/55 leading-snug mt-1">
                            {flaw.cause} <span className="text-white/30">({flaw.measuredValue}% measured vs {flaw.targetValue}% target, {flaw.sampleSize} reps)</span>
                          </p>
                          <p className="text-[9px] text-primary font-bold mt-1">Fix: {flaw.coachingTip}</p>
                          <p className="text-[8px] text-white/35 mt-1">{flaw.correctiveExercise} | {flaw.recommendedFrequency} | {flaw.progressionTarget}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {activeVision.technique_summaries && activeVision.technique_summaries.length > 0 && (
                  <GlassCard className="p-5 border-white/5 bg-black/40">
                    <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-3">
                      Technique Merits
                    </span>
                    <div className="flex flex-col gap-2">
                      {activeVision.technique_summaries.map((summary, idx) => (
                        <div key={`${summary.label}-${idx}`} className="flex items-center justify-between border border-white/5 rounded-xl px-3 py-2">
                          <span className="text-[9px] font-black text-white/75 uppercase">{summary.label}</span>
                          <span className="text-[9px] font-black text-primary">{summary.avgScore}% <span className="text-white/30">/ {summary.sampleSize} reps</span></span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

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

                {activeVision.raw_data?.reps && activeVision.raw_data.reps.length > 0 && (
                  <GlassCard className="p-5 border-white/5 bg-black/40">
                    <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">
                      Complete Measurement Log
                    </span>
                    <p className="text-[8px] text-white/30 uppercase tracking-wider mb-3">
                      Every stored rep, including the measured motion signals
                    </p>
                    <div className="overflow-x-auto">
                      <div className="min-w-[620px] flex flex-col gap-1.5">
                        <div className="grid grid-cols-8 gap-2 px-2 text-[7px] font-black text-white/30 uppercase tracking-wider">
                          <span>Rep</span><span>Call</span><span>Result</span><span>Power</span><span>Hip</span><span>Torso</span><span>Legs</span><span>Head</span>
                        </div>
                        {activeVision.raw_data.reps.map((rep) => (
                          <div key={rep.index} className="grid grid-cols-8 gap-2 items-center px-2 py-2 rounded-lg bg-black/40 border border-white/5 text-[8px] font-mono">
                            <span className="text-white/35">{rep.index}</span>
                            <span className="text-white/75 uppercase">{rep.command}</span>
                            <span className={rep.hit ? 'text-primary' : 'text-red-400'}>{rep.hit ? 'HIT' : 'MISS'}</span>
                            <span className="text-white/60">{rep.estimatedPower}%</span>
                            <span className="text-white/60">{rep.hipRotationScore}%</span>
                            <span className="text-white/60">{rep.torsoRotationScore}%</span>
                            <span className="text-white/60">{rep.kneeDriveScore}%</span>
                            <span className="text-white/60">{rep.kind === 'defense' ? `${rep.headLateralScore}/${rep.headDropScore}` : rep.trajectory}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                )}

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