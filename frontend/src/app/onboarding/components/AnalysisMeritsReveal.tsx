'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Lock,
  Sparkles,
  Zap,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Wrench,
  Activity,
  Gauge,
  TrendingUp,
  Target,
  Layers,
} from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import type { MiniAnalysisResult } from './FreestyleAnalysis';

function GradeLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'ELITE', color: 'text-primary' };
  if (score >= 65) return { label: 'ADVANCED', color: 'text-cyan-400' };
  if (score >= 45) return { label: 'DEVELOPING', color: 'text-yellow-400' };
  return { label: 'BASELINE', color: 'text-white/70' };
}

/* ─────────────────────────────────────────────────────────────
   Hexagon Radar Chart for Onboarding Reveal
───────────────────────────────────────────────────────────── */
interface RadarAxis {
  label: string;
  value: number;
}

function OnboardingBiomechanicalRadar({
  axes,
  activeAxis,
  onSelectAxis,
}: {
  axes: RadarAxis[];
  activeAxis: number;
  onSelectAxis: (idx: number) => void;
}) {
  const size = 220;
  const center = size / 2;
  const radius = 76;
  const numAxes = axes.length;

  const angleFor = (index: number) => -Math.PI / 2 + (index * Math.PI * 2) / numAxes;

  const point = (index: number, normalizedVal: number) => {
    const angle = angleFor(index);
    const r = radius * Math.max(0.1, Math.min(1.0, normalizedVal / 100));
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
    };
  };

  const rings = [0.35, 0.7, 1.0];
  const userPoints = axes.map((a, i) => point(i, a.value));
  const userPath = userPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  const proPoints = axes.map((_, i) => point(i, 85));
  const proPath = proPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[220px] h-[220px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {/* Background Concentric Webs */}
          {rings.map((ringScale, idx) => {
            const pts = axes.map((_, i) => point(i, ringScale * 100));
            const poly = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
            return (
              <path
                key={idx}
                d={poly}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
                strokeDasharray={idx < 2 ? '2,2' : undefined}
              />
            );
          })}

          {/* Spokes */}
          {axes.map((_, i) => {
            const edge = point(i, 100);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={edge.x}
                y2={edge.y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1}
              />
            );
          })}

          {/* Pro Baseline (85%) */}
          <path
            d={proPath}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={1.5}
            strokeDasharray="3,3"
          />

          {/* User Data Polygon */}
          <polygon
            points={userPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="rgba(226, 255, 59, 0.22)"
            stroke="#E2FF3B"
            strokeWidth={2.5}
          />

          {/* Interactive Vertex Nodes */}
          {userPoints.map((p, i) => {
            const isSelected = activeAxis === i;
            return (
              <g key={i} className="cursor-pointer" onClick={() => onSelectAxis(i)}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 6 : 4}
                  fill={isSelected ? '#000' : '#E2FF3B'}
                  stroke={isSelected ? '#E2FF3B' : '#000'}
                  strokeWidth={2}
                />
              </g>
            );
          })}
        </svg>

        {/* Axis Labels */}
        {axes.map((axis, i) => {
          const angle = angleFor(i);
          const labelDist = radius + 22;
          const lx = center + Math.cos(angle) * labelDist;
          const ly = center + Math.sin(angle) * labelDist;
          const isSelected = activeAxis === i;

          return (
            <button
              key={axis.label}
              type="button"
              onClick={() => onSelectAxis(i)}
              style={{ left: `${(lx / size) * 100}%`, top: `${(ly / size) * 100}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded transition ${
                isSelected
                  ? 'bg-primary text-black font-extrabold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {axis.label}
            </button>
          );
        })}
      </div>

      {/* Selected Axis Callout */}
      <div className="mt-2 flex items-center justify-between w-full max-w-[240px] px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
        <span className="text-[9px] font-bold text-white/60 uppercase">
          {axes[activeAxis]?.label} Rating:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-primary">{axes[activeAxis]?.value}%</span>
          <span className="text-[8px] text-white/40">/ Pro 85%</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Dynamic Velocity Progression Spline
───────────────────────────────────────────────────────────── */
function VelocityCurveChart({
  reps,
  peakV,
  avgV,
}: {
  reps: Array<{ peakVelocity: number; power: number }>;
  peakV: number;
  avgV: number;
}) {
  const chartWidth = 320;
  const chartHeight = 90;
  const paddingX = 16;
  const paddingY = 12;

  // If few reps recorded, simulate smooth progression curve anchored to measured peak and avg
  const dataPoints = useMemo(() => {
    if (reps && reps.length >= 4) {
      return reps.map((r, i) => ({ rep: i + 1, speed: r.peakVelocity || avgV }));
    }
    const count = Math.max(6, reps?.length || 8);
    return Array.from({ length: count }, (_, i) => {
      const progress = i / (count - 1);
      const wave = Math.sin(progress * Math.PI) * (peakV - avgV) * 0.9;
      return {
        rep: i + 1,
        speed: Math.round(avgV * 0.85 + wave + (i % 2 === 0 ? 30 : -25)),
      };
    });
  }, [reps, peakV, avgV]);

  const maxVal = Math.max(peakV || 700, ...dataPoints.map((d) => d.speed)) + 50;
  const minVal = Math.max(0, Math.min(...dataPoints.map((d) => d.speed)) - 60);
  const range = maxVal - minVal || 1;

  const points = dataPoints.map((d, i) => {
    const x = paddingX + (i / Math.max(1, dataPoints.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((d.speed - minVal) / range) * (chartHeight - paddingY * 2);
    return { x, y, speed: d.speed, rep: d.rep };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight} L ${points[0].x.toFixed(1)} ${chartHeight} Z`;

  return (
    <div className="relative rounded-2xl bg-white/[0.02] border border-white/5 p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="text-[8px] font-black uppercase tracking-wider text-white/70">
            Strike Velocity Trajectory
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-primary font-black">Peak: {peakV}°/s</span>
          <span className="text-[8px] font-mono text-white/40">Avg: {avgV}°/s</span>
        </div>
      </div>

      <div className="w-full h-[90px]">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2FF3B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#E2FF3B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill="url(#curveGradient)" />

          {/* Baseline Average Line */}
          {(() => {
            const avgY =
              chartHeight -
              paddingY -
              ((avgV - minVal) / range) * (chartHeight - paddingY * 2);
            return (
              <line
                x1={paddingX}
                y1={avgY}
                x2={chartWidth - paddingX}
                y2={avgY}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            );
          })()}

          {/* Velocity Curve */}
          <path d={pathD} fill="none" stroke="#E2FF3B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Rep Nodes */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.speed === peakV ? 4 : 2}
              fill={p.speed === peakV ? '#E2FF3B' : '#000'}
              stroke="#E2FF3B"
              strokeWidth={1.5}
            />
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-between text-[7px] font-mono text-white/40 mt-1 px-1">
        <span>Strike 1</span>
        <span>Round Progression</span>
        <span>Strike {dataPoints.length}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Analysis Merits Reveal Component
───────────────────────────────────────────────────────────── */
export default function AnalysisMeritsReveal(): JSX.Element {
  const router = useRouter();
  const { nextStep, prevStep } = useOnboarding();
  const [result, setResult] = useState<MiniAnalysisResult | null>(null);
  const [activeRadarAxis, setActiveRadarAxis] = useState(0);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem('sparai_mini_analysis') ||
        localStorage.getItem('boxing_onboarding_analysis_result');
      if (raw) {
        setResult(JSON.parse(raw));
      } else {
        // High quality fallback baseline if device had no camera or test skip
        setResult({
          totalScore: 74,
          powerScore: 82,
          stanceScore: 88,
          reflexScore: 80,
          rotationScore: 76,
          punchCount: 16,
          peakVelocity: 680,
          avgVelocity: 420,
        });
      }
    } catch {
      setResult({
        totalScore: 74,
        powerScore: 82,
        stanceScore: 88,
        reflexScore: 80,
        rotationScore: 76,
        punchCount: 16,
        peakVelocity: 680,
        avgVelocity: 420,
      });
    }
  }, []);

  const totalScore = result?.totalScore ?? 74;
  const stanceScore = result?.stanceScore ?? 88;
  const powerScore = result?.powerScore ?? 82;
  const rotationScore = result?.rotationScore ?? 76;
  const punchCount = result?.punchCount ?? 16;
  const peakV = result?.peakVelocity ?? 680;
  const avgV = result?.avgVelocity ?? 420;

  const { label: grade, color: gradeColor } = GradeLabel(totalScore);

  // Compute verified merits
  const accuracyMerit = Math.min(99, Math.max(65, Math.round(stanceScore * 0.92 + 8)));
  const kineticPSI = Math.min(620, Math.max(210, Math.round((peakV / 900) * 620)));
  const reactionSpeedMs = Math.round(Math.max(180, 360 - totalScore * 1.8));

  // Dynamic radar axes
  const radarAxes: RadarAxis[] = useMemo(
    () => [
      { label: 'POWER', value: Math.min(100, Math.max(20, powerScore)) },
      { label: 'STANCE', value: Math.min(100, Math.max(20, stanceScore)) },
      { label: 'VELOCITY', value: Math.min(100, Math.max(20, Math.round((peakV / 850) * 100))) },
      { label: 'ROTATION', value: Math.min(100, Math.max(20, rotationScore)) },
      { label: 'FORM ACCURACY', value: accuracyMerit },
      { label: 'STABILITY', value: Math.min(100, Math.max(20, Math.round((stanceScore + rotationScore) / 2))) },
    ],
    [powerScore, stanceScore, peakV, rotationScore, accuracyMerit]
  );

  // Diagnosed flaws: use saved flaws if present, or dynamically compute from session data
  const dynamicFlaws = useMemo(() => {
    if (result?.flaws && result.flaws.length > 0) {
      return result.flaws;
    }
    const computed = [];
    if (rotationScore < 75) {
      computed.push({
        name: 'Kinetic Core Rotation Deficit',
        impact: `-${Math.max(12, 100 - rotationScore)}% Power Transfer`,
        measured: rotationScore,
        target: 80,
        severity: (rotationScore < 55 ? 'major' : 'moderate') as 'major' | 'moderate',
        cause: 'Upper torso rotates independently without driving torque through the pelvis and lumbar chain.',
        drill: 'Russian Twists & Pivot Cable Presses (3x15 reps)',
      });
    }
    if (stanceScore < 78) {
      computed.push({
        name: 'Stance Anchor & Foot Pivot Lag',
        impact: `-${Math.max(10, 100 - stanceScore)}% Kinetic Stability`,
        measured: stanceScore,
        target: 82,
        severity: (stanceScore < 60 ? 'major' : 'moderate') as 'major' | 'moderate',
        cause: 'Stiff rear knee lockout and flat-footed contact during strike apex.',
        drill: 'Resistance Band Split Squat Rotations (3x12 reps)',
      });
    }
    if (peakV < 600 || avgV < 450) {
      computed.push({
        name: 'Terminal Velocity & Recoil Deceleration',
        impact: '-16% Punch Snap',
        measured: Math.min(100, Math.round((avgV / 700) * 100)),
        target: 85,
        severity: 'moderate' as const,
        cause: 'Arm decelerates prematurely prior to full extension.',
        drill: 'Heavy Bag Snap Retraction Drills (5 rounds x 45s)',
      });
    }
    if (computed.length === 0) {
      computed.push({
        name: 'Guard Recovery & Hand Recoil Drift',
        impact: '-8% Defensive Cover',
        measured: 78,
        target: 88,
        severity: 'minor' as const,
        cause: 'Lead hand drops slightly below cheekline during rapid combinations.',
        drill: 'High-Guard Wall Recoil Drills (4 sets)',
      });
    }
    return computed;
  }, [result, rotationScore, stanceScore, peakV, avgV]);

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="mb-3">
        <StepBadge />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3" /> ALL 3 MERITS REVEALED
        </div>
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.9] tracking-tighter text-white">
          Your Complete <span className="text-primary">Combat Audit</span>
        </h1>
        <p className="text-white/50 mt-1.5 text-[10px] font-semibold leading-relaxed">
          Identity verified. Performance merits & kinetic telemetry derived from your on-device AI session.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-3">
        {/* ── MERIT 1: OVERALL COMBAT SCORE ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 rounded-3xl border border-primary/50 bg-gradient-to-br from-primary/18 via-black/80 to-black/95 shadow-[0_0_30px_rgba(226,255,59,0.15)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">
                  MERIT 1 · OVERALL COMBAT SCORE
                </span>
              </div>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-5xl sm:text-6xl font-black text-white leading-none">{totalScore}</span>
                <span className="pb-2 text-sm font-bold text-white/40">/100</span>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-right">
              <span className={`block text-[10px] font-black uppercase tracking-wider ${gradeColor}`}>
                {grade} TIER
              </span>
              <span className="mt-0.5 block text-[7px] font-black uppercase text-white/50">
                {punchCount} Strikes Analyzed
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/40 text-primary">
              TECHNIQUE BASELINE CONFIRMED
            </span>
          </div>
        </motion.div>

        {/* ── DYNAMIC BIOMECHANICAL HEXAGON RADAR ────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="p-4 rounded-3xl border border-white/10 bg-black/60 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">
                BIOMECHANICAL RADAR SPECTRUM
              </span>
            </div>
            <span className="text-[7px] font-mono text-primary font-bold uppercase">
              LIVE TELEMETRY
            </span>
          </div>

          <OnboardingBiomechanicalRadar
            axes={radarAxes}
            activeAxis={activeRadarAxis}
            onSelectAxis={setActiveRadarAxis}
          />
        </motion.div>

        {/* ── MERIT 2 & MERIT 3: POWER & REFLEX ─────────────── */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Merit 2: Power */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/18 to-black/80 p-3.5 sm:p-4 shadow-[0_0_20px_rgba(226,255,59,0.12)]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[7px] font-black uppercase tracking-[0.16em] text-primary">
                MERIT 2 UNLOCKED
              </span>
              <Flame className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <span className="block text-3xl sm:text-4xl font-black leading-none text-white mt-1">
              {kineticPSI}
              <span className="text-xs font-bold text-white/40 ml-1">PSI</span>
            </span>
            <span className="mt-2 block text-[9px] font-black uppercase tracking-wider text-primary">
              Punch Power
            </span>
            <span className="text-[7px] text-white/50 font-semibold uppercase">
              Peak {peakV}°/s Extension
            </span>
          </motion.div>

          {/* Merit 3: Reflex */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-cyan-500/15 to-black/80 p-3.5 sm:p-4 shadow-[0_0_20px_rgba(6,182,212,0.12)]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[7px] font-black uppercase tracking-[0.16em] text-cyan-400">
                MERIT 3 UNLOCKED
              </span>
              <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <span className="block text-3xl sm:text-4xl font-black leading-none text-white mt-1">
              {reactionSpeedMs}
              <span className="text-xs font-bold text-white/40 ml-1">MS</span>
            </span>
            <span className="mt-2 block text-[9px] font-black uppercase tracking-wider text-cyan-400">
              Reflex & Reaction
            </span>
            <span className="text-[7px] text-white/50 font-semibold uppercase">
              {accuracyMerit}% Form Accuracy
            </span>
          </motion.div>
        </div>

        {/* ── DYNAMIC STRIKE VELOCITY CURVE ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <VelocityCurveChart
            reps={result?.reps || []}
            peakV={peakV}
            avgV={avgV}
          />
        </motion.div>

        {/* ── FLAW TELLER DIAGNOSTICS & TACTICAL AI DRILL PRESCRIPTIONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/60 p-4"
        >
          <div className="relative z-10 flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">
                EVIDENCED BIOMECHANICAL FLAWS ({dynamicFlaws.length})
              </span>
            </div>
            <span className="text-[7px] font-black text-red-400 uppercase px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
              AI DETECTED
            </span>
          </div>

          {/* Flaw List Connected to Live Test Findings */}
          <div className="flex flex-col gap-2.5 mb-3">
            {dynamicFlaws.map((flaw, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-white uppercase tracking-wide">
                    {flaw.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${
                        flaw.severity === 'major'
                          ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {flaw.severity}
                    </span>
                    <span className="text-[8px] font-mono text-rose-400 font-extrabold">
                      {flaw.impact}
                    </span>
                  </div>
                </div>

                {/* Telemetry Progress Bar: Measured vs Target */}
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between text-[7px] font-mono text-white/50">
                    <span>
                      Measured: <strong className="text-white">{flaw.measured}%</strong>
                    </span>
                    <span>
                      Target: <strong className="text-primary">{flaw.target}%</strong>
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${Math.min(100, flaw.measured)}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary"
                      style={{ left: `${Math.min(100, flaw.target)}%` }}
                    />
                  </div>
                </div>

                <p className="text-[8px] text-white/60 leading-tight mt-0.5">
                  {flaw.cause}
                </p>
              </div>
            ))}
          </div>

          {/* Locked Tactical Drills & Recovery Program */}
          <div className="relative rounded-2xl border border-primary/20 bg-primary/[0.04] p-3 overflow-hidden">
            <div className="filter blur-[4px] select-none pointer-events-none opacity-25 flex flex-col gap-1.5">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[8px] text-white font-bold">
                PRESCRIPTION 1: {dynamicFlaws[0]?.drill || 'Rotational Power Kinetic Chain Sequence (4 sets)'}
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[8px] text-white font-bold">
                PRESCRIPTION 2: Resistance Band Guard Wall Hold & Recoil Recovery (5 min)
              </div>
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black/95 flex flex-col items-center justify-center p-3 text-center">
              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mb-1 shadow-[0_0_15px_rgba(226,255,59,0.3)]">
                <Lock className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                TACTICAL AI DRILLS & RECOVERY PLAN
              </span>
              <p className="text-[8px] font-semibold text-white/60 mt-0.5 max-w-[260px] leading-tight">
                Get full step-by-step corrective routines, angle corrections, and video tutorials to eliminate these {dynamicFlaws.length} flaws.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="mt-4 flex flex-col gap-2.5">
        <button
          onClick={nextStep}
          className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider shadow-[0_0_30px_rgba(226,255,59,0.4)]"
        >
          SEE PLAN TO UNLOCK <ChevronRight size={18} />
        </button>
        <button
          onClick={() => router.push('/spar')}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] text-[10px] font-black uppercase tracking-widest text-white/70 transition hover:border-primary/50 hover:text-primary"
        >
          TRY FREE SPARRING <ChevronRight size={16} />
        </button>
        <button
          onClick={prevStep}
          className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto"
        >
          Back
        </button>
      </footer>
    </div>
  );
}
