'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  ArrowLeft,
  Target,
  AlertTriangle,
  Brain,
  Check,
  StopCircle,
  RotateCcw,
  Shield,
  ShieldAlert,
  Zap,
  Play,
  Activity,
  Flame,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Crosshair,
  Award
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { completeSessionSecure } from '@/lib/rank-client';
import { logVisionSession, getReflexTier } from '@/lib/session-log';
import { firebaseAuth } from '@/lib/firebase';
import { topSessionFlaws, summarizeTechniques, DetectedFlaw, FlawEngineRep } from '@/lib/coach/flawEngine';
import { computeStabilityScore, computeSwiftnessScore, targetAttainment, MeritRep } from '@/lib/coach/sessionMerits';
import type { FlawMetric } from '@/lib/coach/mechanicsDatabase';
import { playVoiceEvent, preloadVoicePack, unlockVoicePack } from '@/lib/voice-pack';

// ---------------------------------------------------------------------------
// Landmark indices we care about (MediaPipe Pose / BlazePose 33-point model)
// ---------------------------------------------------------------------------
const LM = {
  NOSE: 0,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
  L_HEEL: 29,
  R_HEEL: 30,
  L_FOOT_INDEX: 31,
  R_FOOT_INDEX: 32,
};

const SKELETON_CONNECTIONS: [number, number][] = [
  [LM.L_SHOULDER, LM.R_SHOULDER],
  [LM.L_SHOULDER, LM.L_ELBOW],
  [LM.L_ELBOW, LM.L_WRIST],
  [LM.R_SHOULDER, LM.R_ELBOW],
  [LM.R_ELBOW, LM.R_WRIST],
  [LM.L_SHOULDER, LM.L_HIP],
  [LM.R_SHOULDER, LM.R_HIP],
  [LM.L_HIP, LM.R_HIP],
  [LM.L_HIP, LM.L_KNEE],
  [LM.L_KNEE, LM.L_ANKLE],
  [LM.R_HIP, LM.R_KNEE],
  [LM.R_KNEE, LM.R_ANKLE],
];

const CORE_ANCHORS = [LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP];
const VISIBILITY_THRESHOLD = 0.6;
const CALIBRATION_HOLD_MS = 2000;
const TRACKING_LOSS_GRACE_MS = 500;
const TRACKING_RECOVERY_MS = 400;
const REACTION_WINDOW_PAD_MS = 250;

// --- Punch validation biomechanics constants ---------------------------
// A punch is only counted after passing through a real state machine
// (GUARD -> STRIKE -> GUARD), not a single frame threshold. This is what
// prevents false positives from idle movement, camera shake, or slowly
// raising an arm to scratch your face.
const ELBOW_EXTEND_THRESHOLD = 155;   // deg — webcam pose landmarks rarely reach a perfect 165° extension
const ELBOW_RETRACT_THRESHOLD = 135;  // deg — must drop back below this to re-arm (hysteresis band kills flicker/vibration double-counts)
const MIN_PUNCH_ANGULAR_VELOCITY = 180; // deg/sec — tolerate 30fps landmark smoothing without accepting slow arm raises
const SMOOTHING_ALPHA = 0.45; // exponential smoothing factor for elbow angle, reduces landmark jitter
const MIN_ROTATION_FOR_FULL_SCORE = 22; // deg of shoulder-line rotation for a "fully rotated" hook/cross
const FULL_KNEE_DRIVE_DEG = 18;         // deg of knee-angle change (push-off/extension) for a full drive score
const FULL_WEIGHT_TRANSFER_RATIO = 0.12; // hip horizontal shift, as a fraction of shoulder width, for a full transfer score
const FULL_FOOT_PIVOT_DEG = 20;         // deg of rear-foot rotation for a full pivot score
// A real punch moves the wrist fast through space, not just the elbow angle
// fast — angular velocity alone can be tripped by a shoulder shrug or a
// twitch near full extension. Requiring BOTH signals to agree is a much
// stronger check than either alone.
const MIN_WRIST_SPEED = 0.35; // shoulder-widths per second; normalized webcam motion is usually below 1.0
const MOTION_MEMORY_MS = 350;
// After retracting to guard, the arm must stay there briefly before the
// next strike can be evaluated — without this, noise flickering right
// across the hysteresis band can register as several strikes in a row.
const GUARD_REARM_MS = 70;
// Trajectory classification needs a real, decisive wrist path to trust —
// below this displacement (relative to shoulder width) there isn't enough
// signal to say what shape was thrown, so we don't penalize it.
const MIN_TRAJECTORY_CONFIDENCE = 0.18;
// Reference magnitudes (normalized by shoulder width, same units as
// noseOffset/drop above) for a "fully committed" slip or roll, used to
// convert raw peak displacement into a 0-100 score the same way peak
// rotation/knee-drive/etc are converted above.
const FULL_HEAD_LATERAL_FOR_FULL_SCORE = 0.55; // matches the existing defenseTriggered lateral threshold with headroom
const FULL_HEAD_DROP_FOR_FULL_SCORE = 0.35;

// Wrist displacement (normalized by shoulder width) shape used to classify
// what kind of punch was actually thrown, independent of what was called —
// lets us flag when a "HOOK" call was actually thrown as a straight punch.
function classifyTrajectory(dx: number, dy: number, shoulderWidth: number): 'straight' | 'hook' | 'uppercut' {
  if (shoulderWidth <= 0) return 'straight';
  const nx = dx / shoulderWidth;
  const ny = dy / shoulderWidth;
  if (Math.abs(ny) > Math.abs(nx) * 1.3 && ny < -0.12) return 'uppercut';
  if (Math.abs(nx) > 0.3 && Math.abs(ny) < Math.abs(nx) * 0.8) return 'hook';
  return 'straight';
}
function expectedTrajectoryFor(command: string): 'straight' | 'hook' | 'uppercut' {
  if (command === 'HOOK') return 'hook';
  if (command === 'UPPERCUT') return 'uppercut';
  return 'straight'; // JAB, CROSS
}

function tacticalCueForCommand(command: string, kind: 'punch' | 'defense'): string {
  if (kind === 'defense') {
    if (command === 'ROLL UNDER') return 'Sink through your knees and roll under the shot.';
    if (command === 'SLIP LEFT' || command === 'SLIP RIGHT') return `Move your head off line on ${command} — keep your eyes forward.`;
    return 'Keep your guard high and move your head, not just your shoulders.';
  }
  switch (command) {
    case 'JAB': return 'Snap the jab straight out and return to guard.';
    case 'CROSS': return 'Drive from the rear hip and let the back foot pivot.';
    case 'HOOK': return 'Turn your torso through the hook and keep the elbow bent.';
    case 'UPPERCUT': return 'Bend your knees and drive upward through the fist.';
    default: return 'Keep your guard high and drive from the hips.';
  }
}

type PoseLandmark = { x: number; y: number; z?: number; visibility?: number };
type Stage = 'welcome' | 'config' | 'camera' | 'analyzing' | 'results';

interface RepLogEntry {
  index: number;
  command: string;
  kind: 'punch' | 'defense';
  hit: boolean;
  reactionMs: number | null;
  peakVelocity: number; // degrees/second of elbow extension — a real measured value
  estimatedPower: number; // 0-100, derived from peakVelocity — an estimate, not a force sensor reading
  rotationScore: number; // 0-100, combined hip+torso rotation — kept for backward compatibility with existing displays
  torsoRotationScore: number; // 0-100, shoulder-line rotation specifically (a hook/cross twisting the shoulders)
  hipRotationScore: number; // 0-100, hip-line rotation specifically, independent of shoulder rotation
  kneeDriveScore: number; // 0-100, derived from measured knee-angle change (leg drive/push-off)
  weightTransferScore: number; // 0-100, derived from measured hip horizontal shift during the strike
  footPivotScore: number; // 0-100, derived from measured rear-foot rotation during the strike
  headLateralScore: number; // 0-100, lateral head displacement off centerline — slip quality
  headDropScore: number; // 0-100, vertical head drop below baseline — roll/bob-and-weave quality
  trajectory: 'straight' | 'hook' | 'uppercut'; // what shape of punch was actually thrown, from real wrist-path data
  trajectoryMatch: boolean; // whether the thrown shape matched what was called
}

// Reference angular velocity (deg/sec) used to normalize speed into a 0-100
// "power" estimate. This is a heuristic scale, not a calibrated force unit —
// a monocular camera has no way to measure actual impact force.
const POWER_REFERENCE_VELOCITY = 900;
// A scored area only becomes a reported flaw when it is genuinely weak.
const WEAK_AREA_THRESHOLD = 60; // accuracy / tracking / reflex below this = weak area
const CHAIN_WEAK_RATIO = 0.6; // a kinetic-chain metric below 60% of its technique target = weak

function estimatePower(peakVelocity: number): number {
  return Math.round(Math.min(100, Math.max(0, (peakVelocity / POWER_REFERENCE_VELOCITY) * 100)));
}

// Circular progress card for one session merit. Purely presentational — the
// value is whatever the report computed; null means "not enough data" and is
// shown honestly as an empty ring instead of a fake 0.
function MeritRing({ label, value, caption }: { label: string; value: number | null; caption: string }) {
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value === null ? 0 : Math.min(100, Math.max(0, value));
  const color = value === null ? '#52525b' : pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const tier = value === null ? 'NO DATA' : pct >= 85 ? 'ELITE' : pct >= 70 ? 'STRONG' : pct >= 50 ? 'DECENT' : 'BUILD';
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-2 py-4 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
          {value === null ? '—' : `${Math.round(pct)}%`}
        </span>
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest text-white">{label}</span>
      <span className="text-[7px] font-black uppercase tracking-widest" style={{ color }}>{tier}</span>
      <span className="text-[7px] leading-tight text-white/30">{caption}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Analysis Visual Components
// ─────────────────────────────────────────────────────────────────────────────

export interface RadarMetric {
  label: string;
  value: number;
  benchmark: number;
  sub: string;
}

function BiomechanicalRadarChart({ metrics }: { metrics: RadarMetric[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const size = 300;
  const center = size / 2;
  const radius = 92;
  const count = metrics.length;

  const angleFor = (index: number) => (-Math.PI / 2) + (index * Math.PI * 2) / count;
  const pointFor = (index: number, scale: number) => {
    const angle = angleFor(index);
    const r = radius * Math.min(1.15, Math.max(0.05, scale));
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
    };
  };

  const userPoints = metrics.map((m, i) => pointFor(i, m.value / 100));
  const userPath = userPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  const proPoints = metrics.map((m, i) => pointFor(i, m.benchmark / 100));
  const proPath = proPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id="radar-user-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e2ff3b" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#e2ff3b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#e2ff3b" stopOpacity="0.02" />
            </radialGradient>
            <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Web rings */}
          {[0.33, 0.66, 1.0].map((scale) => {
            const ringPts = Array.from({ length: count }, (_, i) => pointFor(i, scale))
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ') + ' Z';
            return (
              <path
                key={scale}
                d={ringPts}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={scale === 1.0 ? "1.5" : "1"}
                strokeDasharray={scale === 1.0 ? "none" : "3 3"}
              />
            );
          })}

          {/* Axis lines */}
          {metrics.map((_, i) => {
            const end = pointFor(i, 1.05);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
            );
          })}

          {/* Pro Athlete Benchmark Polygon */}
          <path
            d={proPath}
            fill="rgba(34, 211, 238, 0.05)"
            stroke="#22d3ee"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity={0.7}
          />

          {/* User Kinetic Envelope Polygon */}
          <path
            d={userPath}
            fill="url(#radar-user-glow)"
            stroke="#e2ff3b"
            strokeWidth="2.5"
            filter="url(#radar-glow)"
          />

          {/* User Vertex Nodes */}
          {userPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={activeIdx === i ? 6 : 4}
              fill={activeIdx === i ? '#ffffff' : '#e2ff3b'}
              stroke="#000"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-200"
              onClick={() => setActiveIdx(i)}
            />
          ))}

          {/* Labels positioned around the chart */}
          {metrics.map((m, i) => {
            const labelPos = pointFor(i, 1.26);
            const isLeft = labelPos.x < center - 10;
            const isRight = labelPos.x > center + 10;
            const anchor = isLeft ? 'end' : isRight ? 'start' : 'middle';
            const isActive = activeIdx === i;

            return (
              <g
                key={i}
                className="cursor-pointer select-none"
                onClick={() => setActiveIdx(i)}
              >
                <text
                  x={labelPos.x}
                  y={labelPos.y - 4}
                  textAnchor={anchor}
                  className={`text-[8px] font-black uppercase tracking-wider transition-colors ${
                    isActive ? 'fill-primary' : 'fill-white/80'
                  }`}
                >
                  {m.label}
                </text>
                <text
                  x={labelPos.x}
                  y={labelPos.y + 7}
                  textAnchor={anchor}
                  className="text-[9px] font-mono font-bold fill-primary"
                >
                  {Math.round(m.value)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Benchmark Legend & Active Metric Explainer */}
      <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-white/5 px-2 text-[8px] font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary/40 border border-primary" />
            <span className="text-white/70 uppercase">You ({Math.round(metrics.reduce((a, b) => a + b.value, 0) / Math.max(1, metrics.length))}% Avg)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 border-b border-dashed border-cyan-400" />
            <span className="text-cyan-400/80 uppercase">Target (85%)</span>
          </div>
        </div>
        <span className="text-white/40 uppercase">Tap axis for details</span>
      </div>

      {activeIdx !== null && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 w-full p-3 rounded-xl bg-primary/5 border border-primary/20 text-left flex justify-between items-center"
        >
          <div>
            <span className="text-[9px] font-black uppercase text-primary tracking-wider block">
              {metrics[activeIdx].label} Analysis
            </span>
            <p className="text-[10px] text-white/70 font-semibold mt-0.5">
              {metrics[activeIdx].sub}
            </p>
          </div>
          <div className="text-right pl-3 shrink-0">
            <span className="text-xs font-black font-mono text-white block">
              {Math.round(metrics[activeIdx].value)}%
            </span>
            <span className={`text-[8px] font-bold ${metrics[activeIdx].value >= 80 ? 'text-emerald-400' : metrics[activeIdx].value >= 60 ? 'text-cyan-400' : 'text-amber-400'}`}>
              {metrics[activeIdx].value >= 80 ? 'Optimal' : metrics[activeIdx].value >= 60 ? 'Developing' : 'Deficit'}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function InteractiveSpeedPowerChart({ log }: { log: RepLogEntry[] }) {
  const [selectedRep, setSelectedRep] = useState<RepLogEntry | null>(null);
  if (log.length === 0) return null;

  const width = 360;
  const height = 130;
  const padX = 12;
  const padY = 16;
  const maxVel = Math.max(...log.map((r) => r.peakVelocity), 120);
  const avgVel = Math.round(log.reduce((s, r) => s + r.peakVelocity, 0) / log.length);
  const peakRep = log.reduce((a, b) => (a.peakVelocity > b.peakVelocity ? a : b), log[0]);

  const points = log.map((r, i) => {
    const x = padX + (i / Math.max(1, log.length - 1)) * (width - padX * 2);
    const y = height - padY - (r.peakVelocity / maxVel) * (height - padY * 2);
    return { x, y, rep: r };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`;
  const avgY = height - padY - (avgVel / maxVel) * (height - padY * 2);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-[8px] font-mono text-white/50 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" /> Strike Velocity ({maxVel}°/s Max)
        </span>
        <span className="text-primary font-bold">Avg: {avgVel}°/s</span>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl bg-black/40 border border-white/5 p-2.5">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible select-none">
          <defs>
            <linearGradient id="speed-wave-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e2ff3b" stopOpacity="0.4" />
              <stop offset="75%" stopColor="#e2ff3b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#e2ff3b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Average speed reference dashed line */}
          <line
            x1={padX}
            y1={avgY}
            x2={width - padX}
            y2={avgY}
            stroke="rgba(255,255,255,0.2)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Area gradient */}
          <path d={areaD} fill="url(#speed-wave-grad)" />

          {/* Velocity curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#e2ff3b"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="drop-shadow(0 0 5px rgba(226,255,59,0.5))"
          />

          {/* Interactive Rep Bars and Nodes */}
          {points.map((p, i) => {
            const isPeak = p.rep.index === peakRep.index;
            const isSelected = selectedRep?.index === p.rep.index;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onClick={() => setSelectedRep(p.rep)}
              >
                <rect
                  x={p.x - 2}
                  y={p.y}
                  width={4}
                  height={Math.max(2, height - padY - p.y)}
                  fill={p.rep.hit ? '#e2ff3b' : '#ef4444'}
                  opacity={isSelected ? 1 : p.rep.hit ? 0.5 : 0.7}
                  rx={1.5}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 5 : isPeak ? 4 : 3}
                  fill={isSelected ? '#ffffff' : isPeak ? '#e2ff3b' : p.rep.hit ? '#e2ff3b' : '#ef4444'}
                  stroke="#000"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />
        </svg>

        {/* Selected or Peak Rep Inspector Bar */}
        {(selectedRep || peakRep) && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-[9px] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-white font-black uppercase">
                REP #{(selectedRep || peakRep).index} · {(selectedRep || peakRep).command}
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase ${
                (selectedRep || peakRep).hit ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-400'
              }`}>
                {(selectedRep || peakRep).hit ? 'HIT' : 'MISS'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/60">Speed: <b className="text-primary">{(selectedRep || peakRep).peakVelocity}°/s</b></span>
              <span className="text-white/60">Power: <b className="text-white">{(selectedRep || peakRep).estimatedPower}%</b></span>
              {(selectedRep || peakRep).reactionMs !== null && (
                <span className="text-white/60">Reflex: <b className="text-cyan-400">{(selectedRep || peakRep).reactionMs}ms</b></span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InteractiveReactionTrendChart({ log }: { log: RepLogEntry[] }) {
  const hits = log.filter((r) => r.hit && r.reactionMs !== null);
  if (hits.length < 2) return null;

  const width = 360;
  const height = 100;
  const padX = 12;
  const padY = 14;
  const values = hits.map((r) => r.reactionMs as number);
  const maxReaction = Math.max(...values, 600);
  const minReaction = Math.min(...values, 200);
  const range = maxReaction - minReaction || 1;

  const points = hits.map((r, i) => {
    const x = padX + (i / (hits.length - 1)) * (width - padX * 2);
    const norm = (r.reactionMs as number - minReaction) / range;
    const y = padY + norm * (height - padY * 2);
    return { x, y, rep: r };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const avgMs = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-[8px] font-mono text-white/50 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" /> Reaction Latency Trend
        </span>
        <span className="text-cyan-400 font-bold">Avg Response: {avgMs}ms</span>
      </div>

      <div className="w-full overflow-hidden rounded-2xl bg-black/40 border border-white/5 p-2.5">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible select-none">
          <path
            d={pathD}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="drop-shadow(0 0 5px rgba(34,211,238,0.4))"
          />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="#22d3ee"
              stroke="#000"
              strokeWidth="1.5"
            />
          ))}
        </svg>
        <div className="flex justify-between text-[7px] font-mono text-white/40 uppercase px-1 mt-1">
          <span>First Reps ({values[0]}ms)</span>
          <span className="text-cyan-400">Target: &lt;300ms</span>
          <span>Final Reps ({values[values.length - 1]}ms)</span>
        </div>
      </div>
    </div>
  );
}

function InteractiveFlawTeller({
  hasFlaw,
  headlineFlaw,
  advice,
  detailedFlaws,
}: {
  hasFlaw: boolean;
  headlineFlaw: string;
  advice: string;
  detailedFlaws?: DetectedFlaw[];
}) {
  const flaws = detailedFlaws || [];

  return (
    <div className="flex flex-col gap-3">
      {/* Flaw Hero Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-5 ${
          hasFlaw
            ? 'bg-gradient-to-br from-red-500/10 via-black/80 to-black border-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.15)]'
            : 'bg-gradient-to-br from-emerald-500/10 via-black/80 to-black border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              hasFlaw
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            }`}
          >
            {hasFlaw ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Shield className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[8px] font-black uppercase tracking-[0.2em] ${
                  hasFlaw ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {hasFlaw ? 'BIOMECHANICAL FLAW DETECTED' : 'CLEAN SESSION CONFIRMED'}
              </span>
              <span
                className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                  hasFlaw
                    ? 'bg-red-500/15 border-red-500/30 text-red-400'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                }`}
              >
                {hasFlaw ? `${flaws.length || 1} ISSUE${flaws.length > 1 ? 'S' : ''}` : 'NO DEFICITS'}
              </span>
            </div>
            <h4 className="text-sm font-black text-white uppercase leading-snug tracking-wide">
              {headlineFlaw}
            </h4>
            <p className="text-[10px] text-white/60 font-semibold mt-1.5 leading-relaxed italic">
              &ldquo;{advice}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Evidenced Flaw Deficit Breakdown Cards */}
      {flaws.length > 0 && (
        <GlassCard className="p-5 border-white/10 bg-black/45">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[9px] font-black text-primary tracking-widest uppercase block">
                EVIDENCED FLAW TELLER DIAGNOSTICS
              </span>
              <span className="text-[8px] text-white/40 uppercase tracking-wider">
                Target vs Measured Biomechanics
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[7px] font-mono font-black">
              {flaws.length} MEASURED
            </span>
          </div>

          <div className="flex flex-col gap-3.5">
            {flaws.map((f, idx) => {
              const deficit = Math.max(0, f.targetValue - f.measuredValue);
              const deficitPct = f.targetValue > 0 ? Math.round((deficit / f.targetValue) * 100) : 0;
              const severityColor =
                f.severity === 'major'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : f.severity === 'moderate'
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                  : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';

              return (
                <div
                  key={`${f.techniqueLabel}-${idx}`}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-2.5 transition-all hover:border-white/10"
                >
                  {/* Flaw Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white uppercase tracking-wide">
                        {f.techniqueLabel}
                      </span>
                      <span className="text-[8px] text-white/40 font-mono">
                        ({f.sampleSize} rep{f.sampleSize !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${severityColor}`}>
                      {f.severity}
                    </span>
                  </div>

                  {/* Deficit Comparison Bar */}
                  <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[8px] font-mono">
                      <span className="text-white/60">
                        Measured: <b className="text-white font-black">{f.measuredValue}%</b>
                      </span>
                      <span className="text-cyan-400">
                        Target Standard: <b className="font-black">{f.targetValue}%</b>
                      </span>
                      {deficit > 0 && (
                        <span className="text-red-400 font-bold">
                          -{deficitPct}% Deficit
                        </span>
                      )}
                    </div>

                    <div className="relative h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                      {/* Target Indicator line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10"
                        style={{ left: `${Math.min(100, f.targetValue)}%` }}
                        title={`Target: ${f.targetValue}%`}
                      />
                      {/* User measured bar */}
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          f.measuredValue >= f.targetValue
                            ? 'bg-emerald-400'
                            : f.severity === 'major'
                            ? 'bg-gradient-to-r from-red-600 to-rose-400'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        }`}
                        style={{ width: `${Math.min(100, f.measuredValue)}%` }}
                      />
                    </div>
                  </div>

                  {/* Mechanical Cause */}
                  <p className="text-[10px] text-white/70 font-semibold leading-relaxed">
                    {f.cause}
                  </p>

                  {/* Tactical Prescription Box */}
                  <div className="rounded-xl bg-primary/[0.04] border border-primary/20 p-2.5 flex flex-col gap-1 text-[9px]">
                    <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-wider">
                      <Zap className="w-3 h-3 shrink-0" /> FIX: {f.coachingTip}
                    </div>
                    <div className="text-white/60 font-semibold">
                      <b className="text-white">DRILL:</b> {f.correctiveExercise} · <span className="text-white/40">{f.recommendedFrequency}</span>
                    </div>
                    <div className="text-white/40 text-[8px]">
                      <b className="text-white/60">GOAL:</b> {f.progressionTarget}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function DiagnosticFaultMatrix({ mistakes }: { mistakes: string[] }) {
  if (!mistakes || mistakes.length === 0) return null;

  return (
    <GlassCard className="p-5 border-white/5 bg-black/40">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-black text-primary tracking-widest uppercase block">
          Session Fault Telemetry
        </span>
        <span className="text-[8px] text-white/40 uppercase tracking-wider">
          {mistakes.length} Items Identified
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {mistakes.map((m: string, i: number) => {
          const isMiss = m.toLowerCase().includes('missed');
          const isSlow = m.toLowerCase().includes('slowest') || m.toLowerCase().includes('reaction');
          const isTorso = m.toLowerCase().includes('rotation') || m.toLowerCase().includes('shoulder');
          const isKnee = m.toLowerCase().includes('knee') || m.toLowerCase().includes('leg');
          const isWeight = m.toLowerCase().includes('weight') || m.toLowerCase().includes('pivot');
          const isTrajectory = m.toLowerCase().includes('trajectory') || m.toLowerCase().includes('wrong shape');

          const category = isMiss
            ? 'MISSED CALL'
            : isSlow
            ? 'TIMING DELAY'
            : isTorso
            ? 'TORSO ROTATION'
            : isKnee
            ? 'KNEE DRIVE'
            : isWeight
            ? 'WEIGHT SHIFT'
            : isTrajectory
            ? 'TRAJECTORY PATH'
            : 'TECHNIQUE GAP';

          return (
            <div
              key={i}
              className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-start gap-2.5"
            >
              <div className="w-2 h-2 rounded-full bg-red-400 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[7px] font-black uppercase text-red-400 tracking-wider block mb-0.5">
                  {category}
                </span>
                <p className="text-[10px] text-white/70 font-semibold leading-snug">
                  {m}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function TechniqueComparisonMatrix({
  techniqueSummaries,
}: {
  techniqueSummaries?: Array<{ label: string; avgScore: number; sampleSize: number }>;
}) {
  if (!techniqueSummaries || techniqueSummaries.length === 0) return null;

  return (
    <GlassCard className="p-5 border-white/5 bg-black/40">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-black text-primary tracking-widest uppercase block">
          Technique Attainment Matrix
        </span>
        <span className="text-[8px] text-white/40 uppercase tracking-wider">
          Biomechanics by Weapon
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {techniqueSummaries.map((t, idx) => {
          const score = Math.round(t.avgScore);
          const isTop = idx === 0 && score >= 75;
          const isBottom = idx === techniqueSummaries.length - 1 && score < 60;

          return (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-white uppercase tracking-wide">
                    {t.label}
                  </span>
                  <span className="text-[7px] font-mono text-white/40">
                    ({t.sampleSize} rep{t.sampleSize !== 1 ? 's' : ''})
                  </span>
                  {isTop && (
                    <span className="px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase bg-emerald-500/15 text-emerald-400">
                      LEAD WEAPON
                    </span>
                  )}
                  {isBottom && (
                    <span className="px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase bg-orange-500/15 text-orange-400">
                      ATTENTION
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono font-black text-primary">
                  {score}%
                </span>
              </div>

              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    score >= 75 ? 'bg-primary' : score >= 50 ? 'bg-cyan-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function InteractiveRepLog({ log }: { log: RepLogEntry[] }) {
  const [filter, setFilter] = useState<'all' | 'hits' | 'misses' | 'wrong'>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (log.length === 0) return null;

  const hits = log.filter((r) => r.hit);
  const misses = log.filter((r) => !r.hit);
  const wrongPaths = log.filter((r) => r.hit && r.kind === 'punch' && !r.trajectoryMatch);

  const filtered = filter === 'hits'
    ? hits
    : filter === 'misses'
    ? misses
    : filter === 'wrong'
    ? wrongPaths
    : log;

  return (
    <GlassCard className="p-5 border-white/5 bg-black/40">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-black text-primary tracking-widest uppercase block">
          Telemetry Rep Inspector
        </span>
        <span className="text-[8px] text-white/40 uppercase tracking-wider">
          {log.length} Total Reps Logged
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `ALL (${log.length})` },
          { id: 'hits', label: `HITS (${hits.length})` },
          { id: 'misses', label: `MISSES (${misses.length})` },
          { id: 'wrong', label: `WRONG PATH (${wrongPaths.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === tab.id
                ? 'bg-primary text-black font-black'
                : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rep List */}
      <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
        {filtered.map((r: RepLogEntry) => {
          const isExpanded = expandedIndex === r.index;
          return (
            <div
              key={r.index}
              onClick={() => setExpandedIndex(isExpanded ? null : r.index)}
              className={`p-3 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${
                r.hit ? 'bg-white/[0.02] border-white/5 hover:border-white/15' : 'bg-red-500/[0.03] border-red-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white/30 font-mono w-5">{r.index}.</span>
                  <span className="text-white/80 uppercase tracking-wide">{r.command}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[7px] uppercase tracking-widest ${
                      r.hit ? 'bg-primary/15 text-primary' : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {r.hit ? 'HIT' : 'MISS'}
                  </span>
                  {r.hit && r.kind === 'punch' && !r.trajectoryMatch && (
                    <span className="px-1.5 py-0.5 rounded-full text-[7px] uppercase tracking-widest bg-orange-500/15 text-orange-400">
                      WRONG PATH
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-white/50 font-mono text-[9px]">
                  <span>{r.peakVelocity}°/s</span>
                  <span>{r.estimatedPower}% pwr</span>
                  <span>{r.reactionMs !== null ? `${r.reactionMs}ms` : '—'}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
                </div>
              </div>

              {/* Expanded Kinetic Detail Drawer */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2.5 pt-2.5 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8px] font-mono"
                >
                  <div className="bg-black/40 p-2 rounded-lg">
                    <span className="text-white/40 uppercase block">Torso Rotation</span>
                    <span className="text-primary font-black text-[10px]">{r.torsoRotationScore}%</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg">
                    <span className="text-white/40 uppercase block">Hip Rotation</span>
                    <span className="text-primary font-black text-[10px]">{r.hipRotationScore}%</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg">
                    <span className="text-white/40 uppercase block">Knee Drive</span>
                    <span className="text-white font-black text-[10px]">{r.kneeDriveScore}%</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg">
                    <span className="text-white/40 uppercase block">Rear Foot Pivot</span>
                    <span className="text-white font-black text-[10px]">{r.footPivotScore}%</span>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}



interface CoachCommand {
  text: string;
  kind: 'punch' | 'defense';
}

const PUNCH_COMMANDS: CoachCommand[] = [
  { text: 'JAB', kind: 'punch' },
  { text: 'CROSS', kind: 'punch' },
  { text: 'HOOK', kind: 'punch' },
  { text: 'UPPERCUT', kind: 'punch' },
];

const DEFENSE_COMMANDS: CoachCommand[] = [
  { text: 'SLIP LEFT', kind: 'defense' },
  { text: 'SLIP RIGHT', kind: 'defense' },
  { text: 'ROLL UNDER', kind: 'defense' },
];

function angleAt(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (magAB === 0 || magCB === 0) return 0;
  const cos = (ab.x * cb.x + ab.y * cb.y) / (magAB * magCB);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

// Angle (degrees) of the line between two landmarks — used on the shoulder
// pair to measure torso rotation (a real hook/cross twists the shoulders;
// an arm-only flail doesn't).
function lineAngle(a: PoseLandmark, b: PoseLandmark): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export default function VisionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<Stage>('welcome');

  // Configuration
  const [voiceProfile, setVoiceProfile] = useState<'steel' | 'athena' | 'cyber'>('steel');
  const [mode, setMode] = useState<'punches' | 'defense' | 'freestyle'>('punches');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [punchTarget, setPunchTarget] = useState(50);
  const [freestyleDuration, setFreestyleDuration] = useState(60); // seconds

  // Camera / model loading
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Calibration
  const [calibStatus, setCalibStatus] = useState('SEARCHING FOR PERSON...');
  const [calibSecondsLeft, setCalibSecondsLeft] = useState(2);
  const [calibSuccess, setCalibSuccess] = useState(false);
  const [awaitingUserStart, setAwaitingUserStart] = useState(false);
  const awaitingUserStartRef = useRef(false);

  // Live session
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [hitCount, setHitCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [activeCommand, setActiveCommand] = useState('');
  const [tacticalCue, setTacticalCue] = useState('Keep your guard high and stay light on your feet.');
  const [isCommandSpeaking, setIsCommandSpeaking] = useState(false);
  const [subscriptionChecking, setSubscriptionChecking] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const isMuted = false;
  const [isTrackingInadequate, setIsTrackingInadequate] = useState(false);
  const elapsedSecondsRef = useRef(0);

  // Live Reactive Metrics & Controls
  const [liveVelocity, setLiveVelocity] = useState<number>(0);
  const [isVelocityFlashing, setIsVelocityFlashing] = useState<boolean>(false);
  const [liveFps, setLiveFps] = useState<number>(60);
  const [comboIndex, setComboIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef(false);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  const isProcessingRef = useRef(false);
  const fpsFramesRef = useRef(0);
  const fpsLastTimeRef = useRef(Date.now());

  // Results
  const [resultsData, setResultsData] = useState<any>(null);
  const [insufficientData, setInsufficientData] = useState(false);

  // ---- Refs mirroring state so the MediaPipe callback (a stale closure
  // captured once per session) always reads current values -----------------
  const stageRef = useRef<Stage>('welcome');
  const modeRef = useRef(mode);
  const difficultyRef = useRef(difficulty);
  const punchTargetRef = useRef(punchTarget);
  const freestyleDurationRef = useRef(freestyleDuration);
  const isMutedRef = useRef(isMuted);
  const voiceProfileRef = useRef(voiceProfile);
  const calibSuccessRef = useRef(false);
  const isTrackingInadequateRef = useRef(false);

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { punchTargetRef.current = punchTarget; }, [punchTarget]);
  useEffect(() => { freestyleDurationRef.current = freestyleDuration; }, [freestyleDuration]);
  useEffect(() => { voiceProfileRef.current = voiceProfile; }, [voiceProfile]);

  // DOM / media refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calibTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poseRef = useRef<any>(null);
  const rafIdRef = useRef<number | null>(null);
  const mpLoadedRef = useRef(false);

  // Tracking-quality bookkeeping
  const goodTrackingRef = useRef(false);
  const goodHoldMsRef = useRef(0);
  const badHoldMsRef = useRef(0);
  const lastFrameTsRef = useRef<number | null>(null);
  const trackingSamplesRef = useRef<number[]>([]);

  // Drill logic bookkeeping
  const awaitingRef = useRef(false);
  const awaitingKindRef = useRef<'punch' | 'defense' | null>(null);
  const commandTimestampRef = useRef(0);
  const prevMaxElbowAngleRef = useRef(0);
  const smoothedElbowAngleRef = useRef(0);
  const prevAngleTsRef = useRef<number | null>(null);
  const peakAngularVelocityRef = useRef(0);
  const lastVelUpdateTsRef = useRef(0);
  const prevNoseOffsetRef = useRef(0);
  const hitCountRef = useRef(0);
  const missCountRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const attemptedRef = useRef(0);
  const currentRepPeakVelocityRef = useRef(0);
  const repLogRef = useRef<RepLogEntry[]>([]);
  const activeCommandTextRef = useRef('');

  // DO NOT remove the motion gate below or change this state machine to a
  // single-frame angle check. Straight arms at rest also measure near 180°;
  // without the gate, the detector gets stuck in strike and stops counting.
  // Punch state machine: guard -> strike -> guard, with hysteresis so one
  // punch cannot be counted repeatedly while the arm is extended.
  const elbowStateRef = useRef<'guard' | 'strike'>('guard');
  const elbowAngleHistoryRef = useRef<number[]>([]); // last 3 raw readings, for median outlier rejection
  const guardEnteredAtRef = useRef(0); // timestamp guard was (re)entered, for GUARD_REARM_MS debounce
  const prevWristPosRef = useRef<{ x: number; y: number } | null>(null);
  const wristSpeedRef = useRef(0); // shoulder-widths/sec, cross-validates angular velocity
  const lastPunchMotionAtRef = useRef(0);
  // Shoulder-line angle while in guard — the rotation baseline a strike is
  // measured against, so we can score real torso rotation (hooks/crosses)
  // vs an arm-only flail.
  const shoulderBaselineAngleRef = useRef(0);
  const peakRotationRef = useRef(0);

  // Hip-line rotation, tracked independently of the shoulder-line rotation
  // above. A cross/hook can show a fully rotated torso while the hips barely
  // turn (arm-and-shoulder punch) — scoring them separately is what lets the
  // flaw engine tell "no hip rotation" apart from "no torso rotation" as two
  // distinct, separately-correctable flaws instead of one blended number.
  const hipBaselineAngleRef = useRef(0);
  const peakHipRotationRef = useRef(0);

  // --- Full-body kinetic-chain tracking (all measured, all baselined off
  // the guard position, all peak-tracked through the strike phase) --------
  const kneeBaselineRef = useRef({ L: 0, R: 0 });
  const peakKneeDriveRef = useRef(0);
  const hipXBaselineRef = useRef(0);
  const peakWeightTransferRef = useRef(0);
  const footAngleBaselineRef = useRef({ L: 0, R: 0 });
  const peakFootPivotRef = useRef(0);
  const wristBaselineRef = useRef({ L: { x: 0, y: 0 }, R: { x: 0, y: 0 } });
  const peakWristDisplacementRef = useRef({ dx: 0, dy: 0, mag: 0 });
  const lastShoulderWidthRef = useRef(0.2);

  // --- Defensive head-movement tracking (independent of the elbow state
  // machine — a slip/roll never extends the elbow, so it needs its own peak
  // tracker rather than piggybacking on the punch guard/strike cycle). Reset
  // per-command in runCommands() so each defense rep is scored on its own
  // window, not against drift from earlier in the round. -------------------
  const noseYBaselineRef = useRef(0); // slow EMA of nose.y — the "at rest" head height
  const peakHeadLateralRef = useRef(0); // peak |noseOffset| (normalized) this command window — slip quality
  const peakHeadDropRef = useRef(0); // peak downward nose displacement (normalized) this command window — roll quality

  // Defensive knee-bend tracking. kneeBaselineRef/peakKneeDriveRef above are
  // reset every guard frame and only peak during a punch strike, so they are
  // never meaningful for a slip/roll. This independent tracker uses a slow
  // EMA "standing" knee angle and records the deepest bend away from it in
  // the current command window — the real signal behind a roll's leg bend.
  const restingKneeAngleRef = useRef({ L: 0, R: 0 });
  const peakDefenseKneeBendRef = useRef(0); // deg, peak knee-angle decrease from standing this command window

  // -------------------------------------------------------------------------
  // Mount / MediaPipe script loading
  // -------------------------------------------------------------------------
  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    const loadMediaPipe = () => {
      if (typeof window === 'undefined') return;
      if ((window as any).Pose) {
        mpLoadedRef.current = true;
        return;
      }
      const poseScript = document.createElement('script');
      poseScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
      poseScript.crossOrigin = 'anonymous';
      poseScript.async = true;
      poseScript.onload = () => {
        mpLoadedRef.current = true;
      };
      document.head.appendChild(poseScript);
    };

    loadMediaPipe();

    return () => {
      cleanupSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (poseRef.current) {
      try { poseRef.current.close(); } catch { }
      poseRef.current = null;
    }
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
    if (calibTickRef.current) clearInterval(calibTickRef.current);
  };

  const enumerateCameras = async () => {
    try {
      // A short-lived permission probe: labels stay blank until permission
      // has been granted at least once, so we request+immediately release.
      const probe = await navigator.mediaDevices.getUserMedia({ video: true });
      probe.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoInputs);

      // Prefer a device whose label suggests it's a virtual camera (OBS, etc.)
      // only if nothing was already chosen by the user.
      setSelectedDeviceId((prev) => {
        if (prev && videoInputs.some((d) => d.deviceId === prev)) return prev;
        const obs = videoInputs.find((d) => /obs|virtual/i.test(d.label));
        return (obs || videoInputs[0])?.deviceId || '';
      });
    } catch (err) {
      console.warn('Could not enumerate cameras:', err);
    }
  };

  useEffect(() => {
    if (stage === 'config') {
      enumerateCameras();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // -------------------------------------------------------------------------
  // Voice
  // -------------------------------------------------------------------------
  // Natural-language text actually sent to the speech engine. ALL-CAPS
  // command text (how it's stored/displayed for the HUD) makes several TTS
  // engines read words letter-by-letter like an acronym ("U-P-P-E-R-C-U-T"),
  // and "UPPERCUT" as one solid word is often mumbled. This maps every
  // command to how it should actually sound.
  const SPEECH_TEXT: Record<string, string> = {
    JAB: 'Jab',
    CROSS: 'Cross',
    HOOK: 'Hook',
    UPPERCUT: 'Upper cut',
    'LEAD HOOK': 'Lead hook',
    'REAR HOOK': 'Rear hook',
    'LEAD UPPERCUT': 'Lead upper cut',
    'REAR UPPERCUT': 'Rear upper cut',
    'BODY HOOK': 'Body hook',
    'OVERHAND RIGHT': 'Overhand right',
    'DOUBLE JAB': 'Double jab',
    '1-2 COMBO': 'One two combo',
    '1-2-3 COMBO': 'One two three combo',
    'BODY-HEAD COMBO': 'Body head combo',
    'SLIP LEFT': 'Slip left',
    'SLIP RIGHT': 'Slip right',
    'ROLL UNDER': 'Roll under',
  };
  const normalizeForSpeech = (text: string) => {
    const normalized = SPEECH_TEXT[text.toUpperCase()] || text;
    return normalized.replace(/-/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  };

  // Cache available voices (they load asynchronously in most browsers — the
  // old code called getVoices() fresh every time and often got an empty
  // list, silently falling back to whatever voice happened to be first).
  const voicesCacheRef = useRef<SpeechSynthesisVoice[]>([]);
  const voiceForProfileRef = useRef<Record<string, SpeechSynthesisVoice | undefined>>({});

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      voicesCacheRef.current = window.speechSynthesis.getVoices();
      voiceForProfileRef.current = {}; // re-resolve against the new voice list
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => { preloadVoicePack(); }, []);

  const pickVoice = (profile: string): SpeechSynthesisVoice | undefined => {
    if (voiceForProfileRef.current[profile]) return voiceForProfileRef.current[profile];
    const voices = voicesCacheRef.current.length ? voicesCacheRef.current : (synthRef.current?.getVoices() ?? []);
    const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
    const pool = english.length ? english : voices;
    const scored = pool.map((v) => {
      const name = v.name.toLowerCase();
      let score = 0;
      if (v.localService) score += 3; // local voices start near-instantly — critical for audio/visual sync
      if (profile === 'steel' && /male|david|daniel|fred|uk english male/.test(name)) score += 5;
      if (profile === 'steel' && v.lang === 'en-GB') score += 2;
      if (profile === 'athena' && /female|zira|samantha|victoria|karen|aria/.test(name)) score += 5;
      if (profile === 'cyber' && /google|online|natural/.test(name)) score += 3;
      const chosenByAnotherProfile = Object.entries(voiceForProfileRef.current).some(([key, selected]) => key !== profile && selected?.voiceURI === v.voiceURI);
      if (chosenByAnotherProfile) score -= 20;
      return { v, score };
    }).sort((a, b) => b.score - a.score);
    const chosen = scored[0]?.v || pool[0];
    voiceForProfileRef.current[profile] = chosen;
    return chosen;
  };

  // onStart fires the instant audio actually begins (not when we asked for
  // it) — callers use this to timestamp reaction windows and drive visuals
  // that are genuinely synced to what the fighter hears, not to network/
  // engine latency, which can be 100-500ms on remote "Online" voices.
  const speakCommand = (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (isMutedRef.current) {
      onStart?.();
      onEnd?.();
      return;
    }
    const fallback = () => {
      if (!synthRef.current) {
        onStart?.();
        onEnd?.();
        return;
      }
      try {
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(normalizeForSpeech(text));
        const profile = voiceProfileRef.current;
        const voice = pickVoice(profile);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }
        utterance.volume = 1.0;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        let fired = false;
        const fireStart = () => {
          if (fired) return;
          fired = true;
          onStart?.();
        };
        utterance.onstart = fireStart;
        utterance.onend = () => onEnd?.();
        utterance.onerror = () => { fireStart(); onEnd?.(); };
        synthRef.current.speak(utterance);
        setTimeout(fireStart, 150);
      } catch {
        onStart?.();
        onEnd?.();
      }
    };
    playVoiceEvent(text, fallback, onStart, onEnd);
  };

  // -------------------------------------------------------------------------
  // Skeleton drawing (GPU-accelerated dual-stroke; zero shadowBlur lag)
  // -------------------------------------------------------------------------
  const drawSkeleton = (landmarks: PoseLandmark[], ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    // Outer glow stroke
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
    for (const [i, j] of SKELETON_CONNECTIONS) {
      const a = landmarks[i];
      const b = landmarks[j];
      if (!a || !b) continue;
      if ((a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) continue;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }

    // Inner crisp neon stroke
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#22d3ee';
    for (const [i, j] of SKELETON_CONNECTIONS) {
      const a = landmarks[i];
      const b = landmarks[j];
      if (!a || !b) continue;
      if ((a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) continue;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }

    // Joint dots
    ctx.fillStyle = '#67e8f9';
    const jointIndices = [LM.NOSE, ...SKELETON_CONNECTIONS.flat()];
    const seen = new Set<number>();
    for (const idx of jointIndices) {
      if (seen.has(idx)) continue;
      seen.add(idx);
      const p = landmarks[idx];
      if (!p || (p.visibility ?? 1) < 0.35) continue;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // -------------------------------------------------------------------------
  // Camera / MediaPipe start
  // -------------------------------------------------------------------------
  const waitForVideoElement = async (timeoutMs = 2000): Promise<HTMLVideoElement | null> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (videoRef.current) return videoRef.current;
      await new Promise((r) => setTimeout(r, 30));
    }
    return videoRef.current;
  };

  const waitForMediaPipe = async (timeoutMs = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (mpLoadedRef.current && (window as any).Pose) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  };

  const startCalibration = async () => {
    unlockVoicePack();
    // Server-side entitlement + usage-limit check — the ONLY thing that can
    // actually grant an AI Video Analysis session. Nothing client-side
    // (a previous status fetch, a cached flag, etc.) is trusted here; this
    // call re-validates fresh against Supabase every time.
    setSubscriptionError(null);
    setSubscriptionChecking(true);
    try {
      const user = firebaseAuth.currentUser;
      if (!user) {
        setSubscriptionChecking(false);
        setSubscriptionError('Please log in to start an AI analysis session.');
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/subscription/use-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubscriptionChecking(false);
      if (!res.ok || !data.allowed) {
        if (data.reason === 'daily_limit_reached') {
          setSubscriptionError(`Daily analysis limit reached (${data.used}/${data.limit}). Upgrade your plan or come back tomorrow.`);
          router.push('/subscription?reason=analysis_limit');
        } else {
          setSubscriptionError('An active subscription is required for AI Video Analysis.');
          router.push('/subscription');
        }
        return;
      }
    } catch (e) {
      setSubscriptionChecking(false);
      setSubscriptionError('Could not verify subscription. Check your connection and try again.');
      return;
    }

    setCameraError(null);
    setEngineStatus('loading');
    setStage('camera');
    setCalibStatus('LOADING AI MODEL...');
    setCalibSecondsLeft(2);
    setCalibSuccess(false);
    calibSuccessRef.current = false;
    setAwaitingUserStart(false);
    awaitingUserStartRef.current = false;
    setHitCount(0);
    setMissCount(0);
    setTimerDisplay('00:00');
    elapsedSecondsRef.current = 0;
    hitCountRef.current = 0;
    missCountRef.current = 0;
    reactionTimesRef.current = [];
    attemptedRef.current = 0;
    setAttemptedCount(0);
    repLogRef.current = [];
    currentRepPeakVelocityRef.current = 0;
    activeCommandTextRef.current = '';
    peakAngularVelocityRef.current = 0;
    trackingSamplesRef.current = [];
    elbowStateRef.current = 'guard';
    elbowAngleHistoryRef.current = [];
    guardEnteredAtRef.current = 0;
    prevWristPosRef.current = null;
    wristSpeedRef.current = 0;
    lastPunchMotionAtRef.current = 0;
    smoothedElbowAngleRef.current = 0;
    prevMaxElbowAngleRef.current = 0;
    prevAngleTsRef.current = null;
    shoulderBaselineAngleRef.current = 0;
    peakRotationRef.current = 0;
    hipBaselineAngleRef.current = 0;
    peakHipRotationRef.current = 0;
    kneeBaselineRef.current = { L: 0, R: 0 };
    peakKneeDriveRef.current = 0;
    hipXBaselineRef.current = 0;
    peakWeightTransferRef.current = 0;
    footAngleBaselineRef.current = { L: 0, R: 0 };
    peakFootPivotRef.current = 0;
    wristBaselineRef.current = { L: { x: 0, y: 0 }, R: { x: 0, y: 0 } };
    peakWristDisplacementRef.current = { dx: 0, dy: 0, mag: 0 };
    noseYBaselineRef.current = 0;
    peakHeadLateralRef.current = 0;
    peakHeadDropRef.current = 0;
    restingKneeAngleRef.current = { L: 0, R: 0 };
    peakDefenseKneeBendRef.current = 0;
    goodHoldMsRef.current = 0;
    badHoldMsRef.current = 0;
    setIsTrackingInadequate(false);
    isTrackingInadequateRef.current = false;

    try {
      const videoConstraints: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId }, width: 640, height: 480 }
        : { width: 640, height: 480, facingMode: 'user' };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      streamRef.current = stream;

      // setStage('camera') above triggers a re-render that mounts the
      // <video> element, but React may not have committed that render yet
      // by the time we get here — so poll briefly instead of assuming it's
      // already attached.
      const videoEl = await waitForVideoElement();
      if (!videoEl) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('Video element failed to mount in time.');
      }
      videoEl.srcObject = stream;

      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          if (canvasRef.current) {
            canvasRef.current.width = videoEl.videoWidth || 640;
            canvasRef.current.height = videoEl.videoHeight || 480;
          }
          resolve();
        };
      });

      try {
        await videoEl.play();
      } catch (playErr) {
        console.warn('video.play() was blocked or failed:', playErr);
      }

      setCalibStatus('LOADING AI MODEL...');
      const mpReady = await waitForMediaPipe();
      if (!mpReady) {
        setEngineStatus('failed');
        setCameraError('The on-device pose model failed to load. Check your connection and try again — no simulated data will be shown.');
        cleanupSession();
        return;
      }

      setEngineStatus('ready');
      setCalibStatus('CAMERA READY');
      setAwaitingUserStart(true);
      awaitingUserStartRef.current = true;

      const mpPose = (window as any).Pose;
      const pose = new mpPose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      pose.onResults(onPoseResults);
      poseRef.current = pose;

      // Drive detection ourselves off the exact stream/device we opened above.
      // (MediaPipe's Camera utility silently re-requests its own default
      // camera stream internally, which is what was overriding the OBS
      // device selection — so we don't use it.)
      const detectLoop = async () => {
        const video = videoRef.current;
        if (video && video.readyState >= 2 && poseRef.current && !isProcessingRef.current && !isPausedRef.current) {
          isProcessingRef.current = true;
          try {
            await poseRef.current.send({ image: video });
          } catch (sendErr) {
            console.warn('Pose detection frame failed:', sendErr);
          } finally {
            isProcessingRef.current = false;
          }
        }
        // Compute live camera FPS
        fpsFramesRef.current++;
        const now = Date.now();
        if (now - fpsLastTimeRef.current >= 500) {
          const computedFps = Math.min(60, Math.round((fpsFramesRef.current * 1000) / (now - fpsLastTimeRef.current)));
          setLiveFps(computedFps);
          fpsFramesRef.current = 0;
          fpsLastTimeRef.current = now;
        }
        rafIdRef.current = requestAnimationFrame(detectLoop);
      };
      rafIdRef.current = requestAnimationFrame(detectLoop);
      // Live preview + skeleton render immediately; calibration itself only
      // begins once the user taps "Start Analysis" (see beginCalibration()).
    } catch (err) {
      console.error('Camera access failed:', err);

      // If a specific device was selected and it failed (unplugged, busy,
      // or constraints it can't satisfy), fall back to the default camera
      // once before giving up — this is the single most common real-world
      // cause of "unavailable" and it's silently recoverable.
      const name = err instanceof Error ? err.name : '';
      if (selectedDeviceId && (name === 'OverconstrainedError' || name === 'NotFoundError' || name === 'NotReadableError')) {
        console.warn(`Selected camera device failed (${name}) — retrying with default camera.`);
        setSelectedDeviceId('');
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
            audio: false,
          });
          streamRef.current = fallbackStream;
          const videoEl = await waitForVideoElement();
          if (videoEl) {
            videoEl.srcObject = fallbackStream;
            await new Promise<void>((resolve) => {
              videoEl.onloadedmetadata = () => {
                if (canvasRef.current) {
                  canvasRef.current.width = videoEl.videoWidth || 640;
                  canvasRef.current.height = videoEl.videoHeight || 480;
                }
                resolve();
              };
            });
            try { await videoEl.play(); } catch { }

            setCalibStatus('LOADING AI MODEL...');
            const mpReady = await waitForMediaPipe();
            if (mpReady) {
              setEngineStatus('ready');
              setCalibStatus('CAMERA READY');
              setAwaitingUserStart(true);
              awaitingUserStartRef.current = true;

              const mpPose = (window as any).Pose;
              const pose = new mpPose({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
              });
              pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
              });
              pose.onResults(onPoseResults);
              poseRef.current = pose;

              const detectLoop = async () => {
                const video = videoRef.current;
                if (video && video.readyState >= 2 && poseRef.current && !isProcessingRef.current && !isPausedRef.current) {
                  isProcessingRef.current = true;
                  try {
                    await poseRef.current.send({ image: video });
                  } catch (sendErr) {
                    console.warn('Pose detection frame failed:', sendErr);
                  } finally {
                    isProcessingRef.current = false;
                  }
                }
                // Compute live camera FPS
                fpsFramesRef.current++;
                const now = Date.now();
                if (now - fpsLastTimeRef.current >= 500) {
                  const computedFps = Math.min(60, Math.round((fpsFramesRef.current * 1000) / (now - fpsLastTimeRef.current)));
                  setLiveFps(computedFps);
                  fpsFramesRef.current = 0;
                  fpsLastTimeRef.current = now;
                }
                rafIdRef.current = requestAnimationFrame(detectLoop);
              };
              rafIdRef.current = requestAnimationFrame(detectLoop);
              return; // fallback succeeded — skip the error screen entirely
            }
          }
        } catch (fallbackErr) {
          console.error('Fallback default camera also failed:', fallbackErr);
        }
      }

      // Specific, actionable message per real getUserMedia failure mode,
      // instead of one generic message for every cause.
      let message = 'Camera access was denied, no camera is available, or the selected device could not be opened. Grant camera permission, pick a different source, and try again.';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Open your browser\u2019s site settings, allow camera access for this page, then reload and try again.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        message = 'No camera was found on this device. Connect a camera, or open this page on a device that has one.';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        message = 'Your camera is already in use by another app or browser tab. Close whatever else is using it, then retry.';
      } else if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
        message = 'The selected camera couldn\u2019t be opened. Pick a different camera source below, then retry.';
      } else if (name === 'SecurityError') {
        message = 'Camera access is blocked on this connection. Sparai needs to be loaded over HTTPS to use the camera.';
      }

      setEngineStatus('failed');
      setCameraError(message);
      cleanupSession();
    }
  };

  const beginCalibration = () => {
    setAwaitingUserStart(false);
    awaitingUserStartRef.current = false;
    setCalibStatus('SEARCHING FOR PERSON...');
    setCalibSecondsLeft(2);
    goodHoldMsRef.current = 0;

    calibTickRef.current = setInterval(() => {
      if (calibSuccessRef.current) return;
      const tickMs = 150;
      if (goodTrackingRef.current) {
        goodHoldMsRef.current += tickMs;
        setCalibStatus('PERSON DETECTED. HOLD STILL...');
        const remaining = Math.max(0, Math.ceil((CALIBRATION_HOLD_MS - goodHoldMsRef.current) / 1000));
        setCalibSecondsLeft(remaining);
        if (goodHoldMsRef.current >= CALIBRATION_HOLD_MS) {
          calibSuccessRef.current = true;
          setCalibSuccess(true);
          setCalibStatus('CALIBRATION COMPLETE.');
          if (calibTickRef.current) clearInterval(calibTickRef.current);
          speakCommand('Calibration complete. Beginning drill.');
          startDrill();
        }
      } else {
        goodHoldMsRef.current = 0;
        setCalibSecondsLeft(2);
        setCalibStatus('SEARCHING FOR PERSON...');
      }
    }, 150);
  };

  // -------------------------------------------------------------------------
  // Per-frame pose callback — the core real-time engine
  // -------------------------------------------------------------------------
  const onPoseResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const landmarks: PoseLandmark[] | undefined = results.poseLandmarks;

    const now = performance.now();
    const dt = lastFrameTsRef.current ? now - lastFrameTsRef.current : 33;
    lastFrameTsRef.current = now;

    if (!landmarks || landmarks.length === 0) {
      ctx.clearRect(0, 0, w, h);
      goodTrackingRef.current = false;
      handleTrackingLoss(dt);
      return;
    }

    const coreVisibility = CORE_ANCHORS.map((idx) => landmarks[idx]?.visibility ?? 0);
    const minVis = Math.min(...coreVisibility);
    goodTrackingRef.current = minVis >= VISIBILITY_THRESHOLD;

    drawSkeleton(landmarks, ctx, w, h);

    if (stageRef.current !== 'camera') return;

    if (goodTrackingRef.current) {
      handleTrackingGain(dt);
    } else {
      handleTrackingLoss(dt);
    }

    if (calibSuccessRef.current && !isTrackingInadequateRef.current) {
      trackingSamplesRef.current.push(minVis);
      analyzeFrame(landmarks, now);
    }
  };

  const handleTrackingLoss = (dt: number) => {
    if (!calibSuccessRef.current) return; // calibration ticker handles pre-drill state
    badHoldMsRef.current += dt;
    goodHoldMsRef.current = 0;
    if (badHoldMsRef.current >= TRACKING_LOSS_GRACE_MS && !isTrackingInadequateRef.current) {
      isTrackingInadequateRef.current = true;
      setIsTrackingInadequate(true);
    }
  };

  const handleTrackingGain = (dt: number) => {
    if (!calibSuccessRef.current) return;
    goodHoldMsRef.current += dt;
    badHoldMsRef.current = 0;
    if (isTrackingInadequateRef.current && goodHoldMsRef.current >= TRACKING_RECOVERY_MS) {
      isTrackingInadequateRef.current = false;
      setIsTrackingInadequate(false);
    }
  };

  // -------------------------------------------------------------------------
  // Real biomechanical analysis of a single frame
  // -------------------------------------------------------------------------
  const analyzeFrame = (landmarks: PoseLandmark[], now: number) => {
    const lS = landmarks[LM.L_SHOULDER], rS = landmarks[LM.R_SHOULDER];
    const lE = landmarks[LM.L_ELBOW], rE = landmarks[LM.R_ELBOW];
    const lW = landmarks[LM.L_WRIST], rW = landmarks[LM.R_WRIST];
    const nose = landmarks[LM.NOSE];

    let lAngleThisFrame = 0;
    let rAngleThisFrame = 0;
    if (lS && lE && lW && (lW.visibility ?? 1) > 0.4) {
      lAngleThisFrame = angleAt(lS, lE, lW);
    }
    if (rS && rE && rW && (rW.visibility ?? 1) > 0.4) {
      rAngleThisFrame = angleAt(rS, rE, rW);
    }
    const maxElbowAngle = Math.max(lAngleThisFrame, rAngleThisFrame);

    // Outlier rejection: take the median of the last 3 raw readings before
    // smoothing. A single bad MediaPipe frame (landmark snapping/occlusion
    // flicker) shows up as one outlier value — the median throws it out
    // completely instead of just diluting it, which exponential smoothing
    // alone can't do.
    const hist = elbowAngleHistoryRef.current;
    hist.push(maxElbowAngle);
    if (hist.length > 3) hist.shift();
    const medianElbowAngle =
      hist.length === 3 ? [...hist].sort((a, b) => a - b)[1] : maxElbowAngle;

    // Exponential smoothing kills remaining frame-to-frame landmark jitter
    // without adding meaningful lag — a real punch takes multiple frames to
    // extend, so smoothing never masks a genuine strike.
    smoothedElbowAngleRef.current =
      smoothedElbowAngleRef.current === 0
        ? medianElbowAngle
        : smoothedElbowAngleRef.current + SMOOTHING_ALPHA * (medianElbowAngle - smoothedElbowAngleRef.current);
    const smoothedAngle = smoothedElbowAngleRef.current;

    let angularVel = 0;
    const prevTs = prevAngleTsRef.current;
    if (prevTs !== null) {
      const dtSec = (now - prevTs) / 1000;
      if (dtSec > 0) {
        angularVel = Math.abs(smoothedAngle - prevMaxElbowAngleRef.current) / dtSec;
        if (angularVel < 3000) {
          if (angularVel > peakAngularVelocityRef.current) peakAngularVelocityRef.current = angularVel;
          if (awaitingRef.current && angularVel > currentRepPeakVelocityRef.current) {
            currentRepPeakVelocityRef.current = angularVel;
          }
          // Real-time live velocity display update (throttled to 100ms for silky-smooth UI response)
          if (now - lastVelUpdateTsRef.current > 100 && angularVel > 60) {
            lastVelUpdateTsRef.current = now;
            setLiveVelocity(angularVel);
          }
        }
      }
    }

    // Wrist speed, independent of the elbow-angle signal — cross-validating
    // against a second measurement makes a false positive much harder: a
    // shoulder shrug or elbow flick can spike angular velocity without the
    // wrist actually travelling anywhere near punch speed.
    const activeWristNow = lAngleThisFrame >= rAngleThisFrame ? lW : rW;
    const shoulderWidthNow = lS && rS ? Math.hypot(lS.x - rS.x, lS.y - rS.y) || 0.001 : 0.001;
    if (activeWristNow && (activeWristNow.visibility ?? 1) > 0.4 && prevTs !== null) {
      const dtSec = (now - prevTs) / 1000;
      if (prevWristPosRef.current && dtSec > 0) {
        const dist = Math.hypot(activeWristNow.x - prevWristPosRef.current.x, activeWristNow.y - prevWristPosRef.current.y);
        wristSpeedRef.current = (dist / shoulderWidthNow) / dtSec;
      }
      prevWristPosRef.current = { x: activeWristNow.x, y: activeWristNow.y };
    }

    prevAngleTsRef.current = now;
    prevMaxElbowAngleRef.current = smoothedAngle;

    // --- Torso rotation tracking (hip/shoulder engagement) ---------------
    let shoulderAngle = shoulderBaselineAngleRef.current;
    if (lS && rS) {
      shoulderAngle = lineAngle(lS, rS);
    }
    const shoulderWidth = lS && rS ? Math.hypot(lS.x - rS.x, lS.y - rS.y) || 0.001 : 0.001;
    if (lS && rS) lastShoulderWidthRef.current = shoulderWidth;

    // Knee angles (hip-knee-ankle) — whichever leg extends more during the
    // strike is treated as the driving leg.
    const lHip = landmarks[LM.L_HIP], rHip = landmarks[LM.R_HIP];
    const lKneeL = landmarks[LM.L_KNEE], rKneeL = landmarks[LM.R_KNEE];
    const lAnkle = landmarks[LM.L_ANKLE], rAnkle = landmarks[LM.R_ANKLE];
    const lKneeAngle = lHip && lKneeL && lAnkle ? angleAt(lHip, lKneeL, lAnkle) : kneeBaselineRef.current.L;
    const rKneeAngle = rHip && rKneeL && rAnkle ? angleAt(rHip, rKneeL, rAnkle) : kneeBaselineRef.current.R;

    const hipMidX = lHip && rHip ? (lHip.x + rHip.x) / 2 : hipXBaselineRef.current;

    // Hip-line angle — same lineAngle() measurement used for the shoulders,
    // just applied to the hip landmarks instead, so rotation of the hips can
    // be scored as its own signal rather than folded into shoulder rotation.
    let hipAngle = hipBaselineAngleRef.current;
    if (lHip && rHip) {
      hipAngle = lineAngle(lHip, rHip);
    }

    const lHeel = landmarks[LM.L_HEEL], rHeel = landmarks[LM.R_HEEL];
    const lFoot = landmarks[LM.L_FOOT_INDEX], rFoot = landmarks[LM.R_FOOT_INDEX];
    const lFootVisible = lHeel && lFoot && (lHeel.visibility ?? 1) > 0.4 && (lFoot.visibility ?? 1) > 0.4;
    const rFootVisible = rHeel && rFoot && (rHeel.visibility ?? 1) > 0.4 && (rFoot.visibility ?? 1) > 0.4;
    const lFootAngle = lFootVisible ? lineAngle(lHeel!, lFoot!) : footAngleBaselineRef.current.L;
    const rFootAngle = rFootVisible ? lineAngle(rHeel!, rFoot!) : footAngleBaselineRef.current.R;

    if (elbowStateRef.current === 'guard') {
      // Track the resting orientation continuously while arms are down —
      // this becomes the baseline a strike's rotation is measured against.
      shoulderBaselineAngleRef.current = shoulderAngle;
      peakRotationRef.current = 0;

      hipBaselineAngleRef.current = hipAngle;
      peakHipRotationRef.current = 0;

      kneeBaselineRef.current = { L: lKneeAngle, R: rKneeAngle };
      peakKneeDriveRef.current = 0;

      hipXBaselineRef.current = hipMidX;
      peakWeightTransferRef.current = 0;

      if (lFootVisible) footAngleBaselineRef.current.L = lFootAngle;
      if (rFootVisible) footAngleBaselineRef.current.R = rFootAngle;
      peakFootPivotRef.current = 0;

      if (lW && (lW.visibility ?? 1) > 0.4) wristBaselineRef.current.L = { x: lW.x, y: lW.y };
      if (rW && (rW.visibility ?? 1) > 0.4) wristBaselineRef.current.R = { x: rW.x, y: rW.y };
      peakWristDisplacementRef.current = { dx: 0, dy: 0, mag: 0 };
    } else {
      const rotationDelta = Math.abs(shoulderAngle - shoulderBaselineAngleRef.current);
      if (rotationDelta > peakRotationRef.current) peakRotationRef.current = rotationDelta;

      const hipRotationDelta = Math.abs(hipAngle - hipBaselineAngleRef.current);
      if (hipRotationDelta > peakHipRotationRef.current) peakHipRotationRef.current = hipRotationDelta;

      const kneeDelta = Math.max(
        Math.abs(lKneeAngle - kneeBaselineRef.current.L),
        Math.abs(rKneeAngle - kneeBaselineRef.current.R)
      );
      if (kneeDelta > peakKneeDriveRef.current) peakKneeDriveRef.current = kneeDelta;

      const weightShift = Math.abs(hipMidX - hipXBaselineRef.current) / shoulderWidth;
      if (weightShift > peakWeightTransferRef.current) peakWeightTransferRef.current = weightShift;

      const footDelta = Math.max(
        lFootVisible ? Math.abs(lFootAngle - footAngleBaselineRef.current.L) : 0,
        rFootVisible ? Math.abs(rFootAngle - footAngleBaselineRef.current.R) : 0
      );
      if (footDelta > peakFootPivotRef.current) peakFootPivotRef.current = footDelta;

      // Track whichever wrist belongs to the more-extended arm this frame,
      // and keep the largest displacement-from-guard seen during the strike
      // — that's the shape of the punch actually thrown.
      const activeSide: 'L' | 'R' = lAngleThisFrame >= rAngleThisFrame ? 'L' : 'R';
      const activeWrist = activeSide === 'L' ? lW : rW;
      const baseline = wristBaselineRef.current[activeSide];
      if (activeWrist && (activeWrist.visibility ?? 1) > 0.4) {
        const dx = activeWrist.x - baseline.x;
        const dy = activeWrist.y - baseline.y;
        const mag = Math.hypot(dx, dy);
        if (mag > peakWristDisplacementRef.current.mag) {
          peakWristDisplacementRef.current = { dx, dy, mag };
        }
      }
    }

    // --- Punch state machine (GUARD -> STRIKE -> GUARD) -------------------
    // A punch is only ever evaluated on the GUARD -> STRIKE transition, and
    // that transition only counts as a real punch if BOTH the elbow's
    // angular velocity AND the wrist's actual travel speed clear their
    // minimums — two independent signals agreeing is far harder to fool
    // than either alone (a shoulder shrug can spike one but rarely both).
    // A short dwell time in guard before re-arming also stops noise
    // flickering right across the hysteresis band from double-counting.
    let punchValidated = false;
    const dwelledInGuard = now - guardEnteredAtRef.current >= GUARD_REARM_MS;
    if (angularVel >= MIN_PUNCH_ANGULAR_VELOCITY || wristSpeedRef.current >= MIN_WRIST_SPEED) {
      lastPunchMotionAtRef.current = now;
    }
    if (elbowStateRef.current === 'guard' && dwelledInGuard && smoothedAngle > ELBOW_EXTEND_THRESHOLD) {
      const motionDetected = now - lastPunchMotionAtRef.current <= MOTION_MEMORY_MS;
      if (motionDetected) {
        elbowStateRef.current = 'strike';
        punchValidated = true;
      }
    } else if (elbowStateRef.current === 'strike' && smoothedAngle < ELBOW_RETRACT_THRESHOLD) {
      elbowStateRef.current = 'guard';
      guardEnteredAtRef.current = now;
    }

    let noseOffset = 0;
    if (nose && lS && rS) {
      const shoulderMidX = (lS.x + rS.x) / 2;
      const shoulderWidth = Math.abs(lS.x - rS.x) || 0.001;
      noseOffset = (nose.x - shoulderMidX) / shoulderWidth;
    }
    const defenseTriggered = Math.abs(noseOffset) > 0.45 && Math.abs(noseOffset - prevNoseOffsetRef.current) > 0.15;
    prevNoseOffsetRef.current = noseOffset;

    // --- Head displacement tracking (slip/roll quality) --------------------
    // Independent of the elbow state machine on purpose: a slip or roll
    // never extends the elbow, so it can't reuse the guard/strike peak
    // trackers above. noseYBaselineRef is a slow-moving average of head
    // height that represents "standing in guard" without needing its own
    // explicit state machine; peaks are measured as displacement away from
    // that average and are reset per-command in runCommands().
    if (nose && lS && rS) {
      const headShoulderWidth = Math.hypot(lS.x - rS.x, lS.y - rS.y) || 0.001;
      noseYBaselineRef.current = noseYBaselineRef.current === 0
        ? nose.y
        : noseYBaselineRef.current * 0.98 + nose.y * 0.02;
      const lateral = Math.abs(noseOffset);
      if (lateral > peakHeadLateralRef.current) peakHeadLateralRef.current = lateral;
      const drop = (nose.y - noseYBaselineRef.current) / headShoulderWidth; // positive = head moved down
      if (drop > peakHeadDropRef.current) peakHeadDropRef.current = drop;
    }

    // --- Defensive knee-bend tracking (independent of the punch state machine)
    if (lHip && lKneeL && lAnkle && rHip && rKneeL && rAnkle) {
      const rest = restingKneeAngleRef.current;
      rest.L = rest.L === 0 ? lKneeAngle : rest.L * 0.98 + lKneeAngle * 0.02;
      rest.R = rest.R === 0 ? rKneeAngle : rest.R * 0.98 + rKneeAngle * 0.02;
      // Knee angle shrinks as the knee bends, so bend = resting - current.
      const bend = Math.max(rest.L - lKneeAngle, rest.R - rKneeAngle);
      if (bend > peakDefenseKneeBendRef.current) peakDefenseKneeBendRef.current = bend;
    }

    // Freestyle: no called commands to wait for — every validated punch
    // (same guard->strike->guard state machine, same velocity gate as coach
    // mode) is logged the instant it completes.
    if (modeRef.current === 'freestyle') {
      if (punchValidated) registerFreestylePunch(now);
      return;
    }

    if (!awaitingRef.current) return;

    if (awaitingKindRef.current === 'punch' && punchValidated) {
      registerHit(now);
    } else if (awaitingKindRef.current === 'defense' && defenseTriggered) {
      registerHit(now);
    }
  };

  const registerHit = (now: number) => {
    const kind = awaitingKindRef.current;
    const command = activeCommandTextRef.current;
    awaitingRef.current = false;
    awaitingKindRef.current = null;
    const reaction = now - commandTimestampRef.current;
    reactionTimesRef.current.push(reaction);
    hitCountRef.current += 1;
    setHitCount(hitCountRef.current);

    const peakVelocity = Math.round(currentRepPeakVelocityRef.current);
    const resolvedVel = peakVelocity > 0 ? peakVelocity : Math.round(peakAngularVelocityRef.current || 550);
    setLiveVelocity(resolvedVel);
    setIsVelocityFlashing(true);
    setTimeout(() => setIsVelocityFlashing(false), 300);
    setComboIndex((prev) => (prev + 1) % 5);
    const torsoRotationScore = Math.round(
      Math.min(100, (peakRotationRef.current / MIN_ROTATION_FOR_FULL_SCORE) * 100)
    );
    const hipRotationScore = Math.round(
      Math.min(100, (peakHipRotationRef.current / MIN_ROTATION_FOR_FULL_SCORE) * 100)
    );
    const rotationScore = Math.round((torsoRotationScore + hipRotationScore) / 2);
    // Punches use the strike-phase knee drive; defensive moves use the
    // independent knee-bend tracker, since the punch tracker never runs for
    // a slip/roll and would otherwise report a fake 0.
    const kneeDriveScore = Math.round(
      Math.min(
        100,
        ((kind === 'defense' ? peakDefenseKneeBendRef.current : peakKneeDriveRef.current) / FULL_KNEE_DRIVE_DEG) * 100
      )
    );
    const weightTransferScore = Math.round(
      Math.min(100, (peakWeightTransferRef.current / FULL_WEIGHT_TRANSFER_RATIO) * 100)
    );
    const footPivotScore = Math.round(
      Math.min(100, (peakFootPivotRef.current / FULL_FOOT_PIVOT_DEG) * 100)
    );
    const headLateralScore = Math.round(
      Math.min(100, (peakHeadLateralRef.current / FULL_HEAD_LATERAL_FOR_FULL_SCORE) * 100)
    );
    const headDropScore = Math.round(
      Math.min(100, (Math.max(0, peakHeadDropRef.current) / FULL_HEAD_DROP_FOR_FULL_SCORE) * 100)
    );

    let trajectory: 'straight' | 'hook' | 'uppercut' = 'straight';
    let trajectoryConfident = false;
    if (kind === 'punch') {
      const { dx, dy, mag } = peakWristDisplacementRef.current;
      const shoulderW = lastShoulderWidthRef.current || 0.2;
      trajectory = classifyTrajectory(dx, dy, shoulderW);
      trajectoryConfident = mag / shoulderW >= MIN_TRAJECTORY_CONFIDENCE;
    }
    const trajectoryMatch =
      kind === 'punch' ? (!trajectoryConfident || trajectory === expectedTrajectoryFor(command)) : true;

    repLogRef.current.push({
      index: repLogRef.current.length + 1,
      command,
      kind: kind || 'punch',
      hit: true,
      reactionMs: Math.round(reaction),
      peakVelocity,
      estimatedPower: estimatePower(peakVelocity),
      rotationScore,
      torsoRotationScore,
      hipRotationScore,
      kneeDriveScore,
      weightTransferScore,
      footPivotScore,
      headLateralScore,
      headDropScore,
      trajectory,
      trajectoryMatch,
    });
  };

  const registerFreestylePunch = (now: number) => {
    hitCountRef.current += 1;
    setHitCount(hitCountRef.current);

    const peakVelocity = Math.round(currentRepPeakVelocityRef.current);
    const resolvedVel = peakVelocity > 0 ? peakVelocity : Math.round(peakAngularVelocityRef.current || 550);
    setLiveVelocity(resolvedVel);
    setIsVelocityFlashing(true);
    setTimeout(() => setIsVelocityFlashing(false), 300);
    setComboIndex((prev) => (prev + 1) % 5);
    const torsoRotationScore = Math.round(Math.min(100, (peakRotationRef.current / MIN_ROTATION_FOR_FULL_SCORE) * 100));
    const hipRotationScore = Math.round(Math.min(100, (peakHipRotationRef.current / MIN_ROTATION_FOR_FULL_SCORE) * 100));
    const rotationScore = Math.round((torsoRotationScore + hipRotationScore) / 2);
    const kneeDriveScore = Math.round(Math.min(100, (peakKneeDriveRef.current / FULL_KNEE_DRIVE_DEG) * 100));
    const weightTransferScore = Math.round(Math.min(100, (peakWeightTransferRef.current / FULL_WEIGHT_TRANSFER_RATIO) * 100));
    const footPivotScore = Math.round(Math.min(100, (peakFootPivotRef.current / FULL_FOOT_PIVOT_DEG) * 100));
    const { dx, dy } = peakWristDisplacementRef.current;
    const trajectory = classifyTrajectory(dx, dy, lastShoulderWidthRef.current || 0.2);

    repLogRef.current.push({
      index: repLogRef.current.length + 1,
      command: 'FREESTYLE',
      kind: 'punch',
      hit: true,
      reactionMs: null,
      peakVelocity,
      estimatedPower: estimatePower(peakVelocity),
      rotationScore,
      torsoRotationScore,
      hipRotationScore,
      kneeDriveScore,
      weightTransferScore,
      footPivotScore,
      headLateralScore: 0,
      headDropScore: 0,
      trajectory,
      trajectoryMatch: true, // no called shape to compare against in freestyle
    });

    currentRepPeakVelocityRef.current = 0;
  };

  // -------------------------------------------------------------------------
  // Drill / command loop
  // -------------------------------------------------------------------------
  const startDrill = () => {
    if (modeRef.current === 'freestyle') {
      startFreestyleRound();
      return;
    }

    sessionTimerRef.current = setInterval(() => {
      if (isTrackingInadequateRef.current || isPausedRef.current) return;
      elapsedSecondsRef.current += 1;
      const mins = Math.floor(elapsedSecondsRef.current / 60).toString().padStart(2, '0');
      const secs = (elapsedSecondsRef.current % 60).toString().padStart(2, '0');
      setTimerDisplay(`${mins}:${secs}`);
    }, 1000);

    const gap = difficultyRef.current === 'hard' ? 2200 : difficultyRef.current === 'easy' ? 4000 : 3000;

    const runCommands = () => {
      if (stageRef.current !== 'camera') return;

      if (isTrackingInadequateRef.current || isPausedRef.current) {
        drillTimerRef.current = setTimeout(runCommands, 300);
        return;
      }

      if (awaitingRef.current) {
        const missedKind = awaitingKindRef.current || 'punch';
        const missedCommand = activeCommandTextRef.current;
        const peakVelocity = Math.round(currentRepPeakVelocityRef.current);
        awaitingRef.current = false;
        awaitingKindRef.current = null;
        missCountRef.current += 1;
        setMissCount(missCountRef.current);
        repLogRef.current.push({
          index: repLogRef.current.length + 1,
          command: missedCommand,
          kind: missedKind,
          hit: false,
          reactionMs: null,
          peakVelocity,
          estimatedPower: estimatePower(peakVelocity),
          rotationScore: 0,
          torsoRotationScore: 0,
          hipRotationScore: 0,
          kneeDriveScore: 0,
          weightTransferScore: 0,
          footPivotScore: 0,
          headLateralScore: 0,
          headDropScore: 0,
          trajectory: 'straight',
          trajectoryMatch: false,
        });
      }

      if (attemptedRef.current >= punchTargetRef.current) {
        stopAndAnalyse();
        return;
      }

      const pool = modeRef.current === 'defense'
        ? DEFENSE_COMMANDS
        : PUNCH_COMMANDS;
      const cmd = pool[Math.floor(Math.random() * pool.length)];

      setActiveCommand(cmd.text);
      setTacticalCue(tacticalCueForCommand(cmd.text, cmd.kind));
      activeCommandTextRef.current = cmd.text;
      awaitingRef.current = true;
      awaitingKindRef.current = cmd.kind;
      currentRepPeakVelocityRef.current = 0;
      peakHeadLateralRef.current = 0;
      peakHeadDropRef.current = 0;
      peakDefenseKneeBendRef.current = 0;
      attemptedRef.current += 1;
      setAttemptedCount(attemptedRef.current);

      // Fallback timestamp in case the speech engine never fires onstart —
      // overwritten below the instant real audio begins, which is what
      // actually keeps the reaction window and the visual pulse in sync
      // with what the fighter hears rather than with engine/network latency.
      commandTimestampRef.current = performance.now();
      setIsCommandSpeaking(true);
      speakCommand(
        cmd.text,
        () => { commandTimestampRef.current = performance.now(); },
        () => { setIsCommandSpeaking(false); }
      );

      drillTimerRef.current = setTimeout(runCommands, gap + REACTION_WINDOW_PAD_MS);
    };

    drillTimerRef.current = setTimeout(runCommands, 800);
  };

  // -------------------------------------------------------------------------
  // Freestyle mode: no called commands — every validated punch (same state
  // machine, same guard/velocity gating as coach mode) is logged
  // continuously for the length of the round.
  // -------------------------------------------------------------------------
  const startFreestyleRound = () => {
    let remaining = freestyleDurationRef.current;
    elapsedSecondsRef.current = 0;
    setActiveCommand('FREESTYLE');
    setTacticalCue('Keep your guard high — choose clean, committed punch shapes.');
    activeCommandTextRef.current = 'FREESTYLE';
    awaitingRef.current = true;
    awaitingKindRef.current = 'punch';

    const mins0 = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs0 = (remaining % 60).toString().padStart(2, '0');
    setTimerDisplay(`${mins0}:${secs0}`);

    setIsCommandSpeaking(true);
    speakCommand('Freestyle round. Throw when ready.', undefined, () => setIsCommandSpeaking(false));

    sessionTimerRef.current = setInterval(() => {
      if (stageRef.current !== 'camera') return;
      if (isTrackingInadequateRef.current) return;
      remaining -= 1;
      elapsedSecondsRef.current += 1;
      const clamped = Math.max(0, remaining);
      const mins = Math.floor(clamped / 60).toString().padStart(2, '0');
      const secs = (clamped % 60).toString().padStart(2, '0');
      setTimerDisplay(`${mins}:${secs}`);
      if (remaining === 10) speakCommand('Ten seconds.');
      if (remaining <= 0) {
        stopAndAnalyse();
      }
    }, 1000);
  };

  const stopAndAnalyse = async () => {
    if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (calibTickRef.current) clearInterval(calibTickRef.current);

    // If a coach-command session was stopped mid-command, don't silently
    // drop that rep — log it as a miss so the punch-by-punch record stays
    // complete and honest. Freestyle has no called commands, so this never
    // applies there (awaitingRef stays true for the whole round by design).
    if (awaitingRef.current && modeRef.current !== 'freestyle') {
      const missedKind = awaitingKindRef.current || 'punch';
      const missedCommand = activeCommandTextRef.current;
      const peakVelocity = Math.round(currentRepPeakVelocityRef.current);
      missCountRef.current += 1;
      setMissCount(missCountRef.current);
      repLogRef.current.push({
        index: repLogRef.current.length + 1,
        command: missedCommand,
        kind: missedKind,
        hit: false,
        reactionMs: null,
        peakVelocity,
        estimatedPower: estimatePower(peakVelocity),
        rotationScore: 0,
        torsoRotationScore: 0,
        hipRotationScore: 0,
        kneeDriveScore: 0,
        weightTransferScore: 0,
        footPivotScore: 0,
        headLateralScore: 0,
        headDropScore: 0,
        trajectory: 'straight',
        trajectoryMatch: false,
      });
    }
    awaitingRef.current = false;
    cleanupSession();

    setStage('analyzing');
    speakCommand('Session complete. Compiling your performance report.');

    const steps = ['step-1', 'step-2', 'step-3'];
    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const el = document.getElementById(step);
      if (el) el.classList.add('done');
    }

    const isFreestyle = modeRef.current === 'freestyle';
    const totalAttempts = isFreestyle ? hitCountRef.current : hitCountRef.current + missCountRef.current;

    if (totalAttempts < 3) {
      setInsufficientData(true);
      setStage('results');
      return;
    }

    const accuracy = isFreestyle ? 100 : Math.round((hitCountRef.current / totalAttempts) * 100);
    const avgReaction = reactionTimesRef.current.length
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : null;
    const avgTrackingConfidence = trackingSamplesRef.current.length
      ? trackingSamplesRef.current.reduce((a, b) => a + b, 0) / trackingSamplesRef.current.length
      : 0;

    const stanceScore = Math.round(avgTrackingConfidence * 100);
    const reflexScore = avgReaction
      ? Math.round(Math.min(100, Math.max(0, 100 - (avgReaction - 250) / 8)))
      : 0;
    const powerScore = Math.round(Math.min(100, (peakAngularVelocityRef.current / 900) * 100));
    let overallScore = Math.round((accuracy + stanceScore + reflexScore) / 3);

    let flaw = 'Tracking confidence stayed strong throughout — no major flaw detected.';
    let advice = 'Consistent frame presence and clean strike mechanics across the session.';
    let flawFound = false;
    if (!isFreestyle) {
      const scores = [
        { name: 'accuracy', value: accuracy },
        { name: 'stance', value: stanceScore },
        { name: 'reflex', value: reflexScore },
      ];
      const weakest = scores.sort((a, b) => a.value - b.value)[0];
      // Only call something a flaw when it is genuinely weak. Previously the
      // lowest of the three was ALWAYS reported, even at 95%.
      if (weakest.value >= WEAK_AREA_THRESHOLD) {
        flaw = 'No significant flaw detected — accuracy, tracking and reaction were all solid.';
        advice = 'Keep this level of consistency and push the pace or difficulty next session.';
      } else if (weakest.name === 'accuracy') {
        flawFound = true;
        flaw = 'Missed commands: several calls went unanswered inside the reaction window.';
        advice = 'Focus on committing to each call immediately — hesitation cost you reps this session.';
      } else if (weakest.name === 'stance') {
        flawFound = true;
        flaw = 'Tracking confidence dipped repeatedly — you drifted out of the optimal frame zone.';
        advice = 'Stand roughly 6-8 feet from the camera and keep your full upper body visible throughout.';
      } else if (weakest.name === 'reflex') {
        flawFound = true;
        flaw = 'Reaction times ran high relative to the call cadence.';
        advice = 'Keep your hands up and weight forward so you can fire the instant a command lands.';
      }
    }

    // Build a real, per-command mistakes breakdown from the actual rep log —
    // nothing here is invented, it's all aggregated from logged reps.
    const log = repLogRef.current;
    const chainRepsForAttainment: FlawEngineRep[] = log.map((r) => ({
      command: r.command,
      kind: r.kind,
      hit: r.hit,
      estimatedPower: r.estimatedPower,
      hipRotationScore: r.hipRotationScore ?? 0,
      torsoRotationScore: r.torsoRotationScore ?? 0,
      kneeDriveScore: r.kneeDriveScore,
      weightTransferScore: r.weightTransferScore,
      footPivotScore: r.footPivotScore,
      headLateralScore: r.headLateralScore ?? 0,
      headDropScore: r.headDropScore ?? 0,
      trajectory: r.trajectory,
      trajectoryMatch: r.trajectoryMatch,
    }));
    const missesByCommand: Record<string, number> = {};
    log.filter((r) => !r.hit).forEach((r) => {
      missesByCommand[r.command] = (missesByCommand[r.command] || 0) + 1;
    });
    const mistakes: string[] = Object.entries(missesByCommand)
      .sort((a, b) => b[1] - a[1])
      .map(([cmd, count]) => `Missed ${cmd} ${count}x — no clean strike detected within the reaction window.`);

    // hitsOnly drives reaction-time stats (freestyle has none, so this is
    // naturally empty there). punchHits drives biomechanics and is NOT
    // gated on reactionMs, so freestyle punches (which have no reaction
    // time by design) are correctly included.
    const allHits = log.filter((r) => r.hit);
    const hitsOnly = allHits.filter((r) => r.reactionMs !== null);
    const punchHits = allHits.filter((r) => r.kind === 'punch');
    if (hitsOnly.length > 0) {
      const slowest = hitsOnly.reduce((a, b) => ((a.reactionMs ?? 0) > (b.reactionMs ?? 0) ? a : b));
      if ((slowest.reactionMs ?? 0) > 700) {
        mistakes.push(`Slowest reaction was on ${slowest.command} at ${slowest.reactionMs}ms — noticeably behind your average.`);
      }
    }

    // Full kinetic-chain aggregates — only meaningful for actual punches
    // (defense reps don't drive the arm state machine these are measured
    // through), so they're computed over punchHits, not all hits.
    let avgKneeDrive = 0, avgWeightTransfer = 0, avgFootPivot = 0, avgRotation = 0, trajectoryAccuracy = 0;
    let avgHipRotation = 0, avgTorsoRotation = 0;
    let findings: Array<{ metric: FlawMetric; msg: string; flaw: string; advice: string; att: ReturnType<typeof targetAttainment> }> = [];
    if (punchHits.length > 0) {
      const weakestStrike = punchHits.reduce((a, b) => (a.peakVelocity < b.peakVelocity ? a : b));
      if (weakestStrike.peakVelocity < POWER_REFERENCE_VELOCITY * 0.35) {
        mistakes.push(`Weakest strike was ${weakestStrike.command} at ${weakestStrike.peakVelocity}°/s — extend fully through the target.`);
      }

      avgRotation = punchHits.reduce((sum, r) => sum + r.rotationScore, 0) / punchHits.length;
      avgHipRotation = punchHits.reduce((sum, r) => sum + (r.hipRotationScore ?? 0), 0) / punchHits.length;
      avgTorsoRotation = punchHits.reduce((sum, r) => sum + (r.torsoRotationScore ?? 0), 0) / punchHits.length;
      avgKneeDrive = punchHits.reduce((sum, r) => sum + r.kneeDriveScore, 0) / punchHits.length;
      avgWeightTransfer = punchHits.reduce((sum, r) => sum + r.weightTransferScore, 0) / punchHits.length;
      avgFootPivot = punchHits.reduce((sum, r) => sum + r.footPivotScore, 0) / punchHits.length;
      trajectoryAccuracy = isFreestyle ? 100 : Math.round(
        (punchHits.filter((r) => r.trajectoryMatch).length / punchHits.length) * 100
      );

      // Technique-aware chain findings: each punch is judged against ITS OWN
      // technique's target (so jabs aren't failed for lacking hip pivot), a
      // metric must reach >= 3 qualifying punches, and only genuinely weak
      // ones (< 60% of target) are reported — worst three at most.
      const chainChecks: Array<{ metric: FlawMetric; msg: string; flaw: string; advice: string }> = [
        { metric: 'torsoRotationScore', msg: 'Low shoulder/torso rotation on your power punches — turn your torso into the strike instead of just extending the arm.', flaw: 'Torso rotation was the weak link across your punches.', advice: 'Drive power from your hips and shoulders on every strike, not just your arm.' },
        { metric: 'hipRotationScore', msg: 'Hips barely turned on your power punches — rotate your hips so the punch carries your body weight.', flaw: 'Hip rotation was minimal on your power punches.', advice: 'Turn your rear hip through the punch, not just your shoulder.' },
        { metric: 'kneeDriveScore', msg: 'Minimal knee drive detected — push off your back leg to load each punch instead of throwing arm-only.', flaw: 'Knee drive was minimal through most of the session.', advice: 'Push off your back leg to load each punch before you throw it.' },
        { metric: 'weightTransferScore', msg: 'Weight stayed mostly static — shift your weight forward/across into the strike for real power transfer.', flaw: 'Weight transfer was flat across the session.', advice: 'Shift your weight forward and across into each strike.' },
        { metric: 'footPivotScore', msg: 'Rear foot barely pivoted — let your back heel rotate so your hips can fully turn into the punch.', flaw: 'Rear foot pivot was minimal.', advice: 'Let your back heel rotate so your hips can fully turn into the punch.' },
        { metric: 'estimatedPower', msg: 'Strike speed stayed on the slow side for your power punches — snap through the extension.', flaw: 'Strike speed stayed on the slower side throughout.', advice: 'Snap through the extension instead of pushing the arm out.' },
      ];
      findings = chainChecks
        .map((c) => ({ ...c, att: targetAttainment(chainRepsForAttainment, c.metric) }))
        .filter((c) => c.att !== null && c.att.ratio < CHAIN_WEAK_RATIO)
        .sort((a, b) => (a.att!.ratio - b.att!.ratio))
        .slice(0, 3);
      findings.forEach((f) => mistakes.push(f.msg));
      if (!isFreestyle && punchHits.length >= 3 && trajectoryAccuracy < 60) {
        const mismatched = punchHits.filter((r) => !r.trajectoryMatch);
        const commonCmd = mismatched.length
          ? Object.entries(
              mismatched.reduce((acc: Record<string, number>, r) => {
                acc[r.command] = (acc[r.command] || 0) + 1;
                return acc;
              }, {})
            ).sort((a, b) => b[1] - a[1])[0][0]
          : null;
        mistakes.push(
          commonCmd
            ? `${commonCmd} was often thrown with the wrong shape — check your trajectory (straight vs looping vs rising) for that punch.`
            : 'Several punches didn\'t match the expected trajectory shape for the call — focus on clean punch-specific paths.'
        );
      }

      if (isFreestyle) {
        // No accuracy/reflex signal in freestyle — overall score is a pure
        // technique composite instead.
        overallScore = Math.round(
          (powerScore + stanceScore + avgRotation + avgKneeDrive + avgWeightTransfer + avgFootPivot) / 6
        );
        if (findings.length > 0) {
          flawFound = true;
          flaw = findings[0].flaw;
          advice = findings[0].advice;
        } else {
          flaw = 'No significant flaw detected — your technique chain held up across the round.';
          advice = 'Keep this form and push the pace next round.';
        }
      }
    }
    // Defensive head-movement aggregates — measured on defense hits only,
    // mirroring how punch kinetic-chain aggregates are scoped to punchHits
    // above.
    const defenseHits = allHits.filter((r) => r.kind === 'defense');
    const avgHeadLateral = defenseHits.length
      ? defenseHits.reduce((sum, r) => sum + (r.headLateralScore ?? 0), 0) / defenseHits.length
      : 0;
    const avgHeadDrop = defenseHits.length
      ? defenseHits.reduce((sum, r) => sum + (r.headDropScore ?? 0), 0) / defenseHits.length
      : 0;

    // --- Data-driven flaw detection ----------------------------------------
    // Replaces the fixed "lowest of ~9 canned strings" logic above with a
    // real evaluation against the mechanics database: every flaw returned
    // here carries the measured session-average value that triggered it,
    // and a matched cause / coaching tip / corrective exercise / progression
    // target instead of a generic sentence. The canned `flaw`/`advice`
    // strings computed above are kept as a fallback (used only when the
    // engine has too little data — e.g. under MIN_SAMPLE_SIZE reps per
    // technique — to make a confident call).
    const detailedFlaws: DetectedFlaw[] = topSessionFlaws(chainRepsForAttainment, 5);

    // Merge session-wide kinetic chain findings if not already captured
    if (findings.length > 0) {
      for (const f of findings) {
        const alreadyCovered = detailedFlaws.some((df) => df.metric === f.metric);
        if (!alreadyCovered) {
          const ratio = f.att ? f.att.ratio : 0.45;
          const measuredVal = Math.round(ratio * (f.metric === 'footPivotScore' ? 40 : f.metric === 'kneeDriveScore' ? 55 : 55));
          const targetVal = f.metric === 'footPivotScore' ? 40 : f.metric === 'kneeDriveScore' ? 55 : 55;
          detailedFlaws.push({
            techniqueLabel: f.metric === 'torsoRotationScore' ? 'Torso Rotation'
              : f.metric === 'hipRotationScore' ? 'Hip Rotation'
              : f.metric === 'kneeDriveScore' ? 'Knee Drive'
              : f.metric === 'weightTransferScore' ? 'Weight Transfer'
              : f.metric === 'footPivotScore' ? 'Rear Foot Pivot'
              : 'Strike Power',
            metric: f.metric,
            measuredValue: measuredVal,
            targetValue: targetVal,
            severity: ratio < 0.45 ? 'major' : 'moderate',
            cause: f.msg,
            coachingTip: f.advice,
            correctiveExercise: f.metric === 'hipRotationScore' ? 'Rear Hip-Lead Power Cross Drill'
              : f.metric === 'torsoRotationScore' ? 'Torso Rotation & Pivot Hook Drill'
              : f.metric === 'kneeDriveScore' ? 'Leg-Drive Dip-and-Push Uppercut Drill'
              : f.metric === 'weightTransferScore' ? 'Weight Transfer Stepping Drill'
              : f.metric === 'footPivotScore' ? 'Rear Heel Rotation & Pivot Drill'
              : 'Speed Snap & Extension Drill',
            recommendedFrequency: '3 sets x 15 reps, 3x/week',
            progressionTarget: `Reach target of ${targetVal}%+ across all combinations`,
            sampleSize: f.att ? f.att.samples : punchHits.length,
          });
        }
      }
    }

    // Check for missed commands or reaction delays if kinetic chain was clean
    if (!isFreestyle) {
      if (missCountRef.current > 0 && accuracy < 75) {
        const missedPill = detailedFlaws.some((df) => df.techniqueLabel === 'Command Cadence');
        if (!missedPill) {
          detailedFlaws.push({
            techniqueLabel: 'Command Cadence',
            metric: 'trajectoryMatchRate',
            measuredValue: accuracy,
            targetValue: 85,
            severity: accuracy < 55 ? 'major' : 'moderate',
            cause: `${missCountRef.current} called strike${missCountRef.current !== 1 ? 's' : ''} went unanswered inside the reaction window.`,
            coachingTip: 'Commit immediately to each call without second-guessing your stance.',
            correctiveExercise: 'Fast-Call Reaction Drill',
            recommendedFrequency: '3 sets x 20 reps, 3x/week',
            progressionTarget: 'Reach 85%+ command accuracy on coached rounds',
            sampleSize: totalAttempts,
          });
        }
      }
      if (avgReaction && avgReaction > 520) {
        const reflexPill = detailedFlaws.some((df) => df.techniqueLabel === 'Reflex Latency');
        if (!reflexPill) {
          detailedFlaws.push({
            techniqueLabel: 'Reflex Latency',
            metric: 'estimatedPower',
            measuredValue: reflexScore,
            targetValue: 80,
            severity: avgReaction > 650 ? 'major' : 'moderate',
            cause: `Average reaction time ran high at ${avgReaction}ms relative to call cadence.`,
            coachingTip: 'Keep your hands in a high, relaxed guard to release immediately on audio cues.',
            correctiveExercise: 'Audio-Cue Snap Drill',
            recommendedFrequency: '3 sets x 15 reps, 3x/week',
            progressionTarget: 'Lower average reaction time under 350ms',
            sampleSize: reactionTimesRef.current.length,
          });
        }
      }
    }

    const techniqueSummaries = summarizeTechniques(chainRepsForAttainment);

    // --- New merits (Overall/Power/Reflex above keep their existing formulas)
    // Stability = repeatability of technique + timing + frame steadiness.
    // Swiftness = sustained strike speed + quickness (coached) / cadence
    // (freestyle). Full definitions live in lib/coach/sessionMerits.ts.
    const meritReps: MeritRep[] = log.map((r, i) => ({
      ...chainRepsForAttainment[i],
      peakVelocity: r.peakVelocity,
      reactionMs: r.reactionMs,
    }));
    const stabilityScore = computeStabilityScore(meritReps, stanceScore);
    const swiftnessScore = computeSwiftnessScore(meritReps, {
      isFreestyle,
      elapsedSeconds: elapsedSecondsRef.current,
      referenceVelocity: POWER_REFERENCE_VELOCITY,
    });

    if (detailedFlaws.length > 0) {
      // Top-ranked (most severe) flaw drives the headline "biggest
      // opportunity" + coach line, same slots the UI already reads.
      const top = detailedFlaws[0];
      flawFound = true;
      flaw = `${top.techniqueLabel}: ${top.cause}`;
      advice = top.coachingTip;
    } else {
      flawFound = false;
      flaw = 'Clean session across all metrics — tracking, kinetic chain, and response times were solid.';
      advice = 'Keep this level of consistency and push for higher speed next session.';
    }

    setResultsData({
      overallScore,
      powerScore,
      stanceScore,
      reflexScore,
      accuracy,
      avgReflex: avgReaction,
      hits: hitCountRef.current,
      misses: missCountRef.current,
      posture: Math.round(stanceScore / 10),
      advice,
      flaw,
      mistakes,
      log,
      rotationScore: Math.round(avgRotation),
      hipRotationScore: Math.round(avgHipRotation),
      torsoRotationScore: Math.round(avgTorsoRotation),
      kneeDriveScore: Math.round(avgKneeDrive),
      weightTransferScore: Math.round(avgWeightTransfer),
      footPivotScore: Math.round(avgFootPivot),
      headLateralScore: Math.round(avgHeadLateral),
      headDropScore: Math.round(avgHeadDrop),
      trajectoryAccuracy,
      isFreestyle,
      detailedFlaws,
      techniqueSummaries,
      stabilityScore,
      swiftnessScore,
      hasFlaw: flawFound,
    });
    setInsufficientData(false);
    setStage('results');
  };

  useEffect(() => {
    if (stage === 'results' && resultsData) {
      try {
        localStorage.setItem('vision_progress_' + new Date().toDateString(), 'true');
      } catch { }

      // Real session record for the Analytics page — every field here is
      // pulled straight from the actual computed results, nothing invented.
      logVisionSession({
        date: new Date().toISOString(),
        mode: resultsData.isFreestyle ? 'freestyle' : modeRef.current,
        punches: resultsData.log.filter((r: RepLogEntry) => r.kind === 'punch').length,
        hits: resultsData.hits,
        misses: resultsData.misses,
        attempted: resultsData.hits + resultsData.misses,
        score: resultsData.overallScore,
        reflex_tier: resultsData.avgReflex ? getReflexTier(resultsData.avgReflex / 1000) : '--',
        avg_reflex_ms: resultsData.avgReflex ?? 0,
        accuracy: resultsData.accuracy,
        power_score: resultsData.powerScore,
        tracking_score: resultsData.stanceScore,
        reflex_score: resultsData.reflexScore,
        rotation_score: resultsData.rotationScore,
        hip_rotation_score: resultsData.hipRotationScore,
        torso_rotation_score: resultsData.torsoRotationScore,
        knee_drive_score: resultsData.kneeDriveScore,
        weight_transfer_score: resultsData.weightTransferScore,
        foot_pivot_score: resultsData.footPivotScore,
        head_lateral_score: resultsData.headLateralScore,
        head_drop_score: resultsData.headDropScore,
        trajectory_accuracy: resultsData.trajectoryAccuracy,
        stability_score: resultsData.stabilityScore,
        swiftness_score: resultsData.swiftnessScore,
        flaw: resultsData.flaw,
        advice: resultsData.advice,
        detailed_flaws: resultsData.detailedFlaws,
        technique_summaries: resultsData.techniqueSummaries,
        raw_data: {
          drill_data: resultsData.log.map((r: RepLogEntry) => ({
            command: r.command,
            velocity_rating: r.peakVelocity > POWER_REFERENCE_VELOCITY * 0.7 ? 'Explosive' : r.peakVelocity > POWER_REFERENCE_VELOCITY * 0.4 ? 'Snappy' : 'Slow',
            reflex_time_ms: r.reactionMs ?? 0,
            extension_speed_ms: r.reactionMs ?? 0,
            form_notes: r.hit ? 'Clean strike, on time.' : 'Missed — no clean strike detected within the window.',
          })),
          reps: resultsData.log,
        },
      });

      // This is the ONLY place the streak/rank system gets credited — not
      // login, not Daily Grind workouts. Safe to call every time results
      // are shown: the server no-ops (no extra credit) if a session was
      // already credited within the last 24 hours.
      completeSessionSecure().catch(console.error);
    } else if (stage === 'results' && insufficientData) {
      try {
        localStorage.setItem('vision_progress_' + new Date().toDateString(), 'true');
      } catch { }
    }
  }, [stage, resultsData, insufficientData]);

  const stopSessionEarly = () => {
    stopAndAnalyse();
  };

  const backToConfig = () => {
    cleanupSession();
    setStage('config');
  };

  const restartDrill = () => {
    setHitCount(0);
    hitCountRef.current = 0;
    setAttemptedCount(0);
    attemptedRef.current = 0;
    setLiveVelocity(0);
    peakAngularVelocityRef.current = 0;
    setComboIndex(0);
    elapsedSecondsRef.current = 0;
    setTimerDisplay('00:00');
    setIsPaused(false);
    isPausedRef.current = false;
    repLogRef.current = [];
    reactionTimesRef.current = [];
    if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    setCalibSuccess(false);
    calibSuccessRef.current = false;
    setAwaitingUserStart(true);
    awaitingUserStartRef.current = true;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading System...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        {stage === 'welcome' && (
          <motion.div
            key="stage-welcome"
            className="flex flex-col gap-6 anim-fade-in select-none"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <header className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-white/50 tracking-wider uppercase block mb-0.5">
                  VISION CALIBRATOR
                </span>
                <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
                  AI VISION ANALYSER
                </h1>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </header>

            <GlassCard className="p-6 border-primary/20 bg-black/40 text-center relative overflow-hidden flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary text-2xl mb-4 shadow-[0_0_15px_rgba(226,255,59,0.2)]">
                <Camera className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-xs text-white/50 font-semibold leading-relaxed max-w-[280px]">
                Real-time on-device pose tracking. Everything runs locally in your browser —
                no video ever leaves your phone. If tracking quality drops, scoring pauses
                and you&apos;ll be told, instead of guessing.
              </p>
            </GlassCard>

            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
              <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block text-center mb-3">
                AI COACH PROFILE VOICE
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'steel', label: 'STEEL', desc: 'Male Core' },
                  { key: 'athena', label: 'ATHENA', desc: 'Female Core' },
                  { key: 'cyber', label: 'CYBER', desc: 'Synthetic' },
                ].map((choice) => (
                  <button
                    key={choice.key}
                    onClick={() => {
                      setVoiceProfile(choice.key as any);
                      speakCommand(`${choice.label} calibrated.`);
                    }}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-2xl border text-[10px] font-black transition-all ${voiceProfile === choice.key
                        ? 'bg-primary/15 border-primary text-primary shadow-[0_0_8px_rgba(226,255,59,0.15)]'
                        : 'bg-black/40 border-white/5 text-white/50 hover:text-white'
                      }`}
                  >
                    <span>{choice.label}</span>
                    <span className="text-[6px] text-white/30 mt-0.5">{choice.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <NeonButton onClick={() => setStage('config')} className="w-full h-14 mt-4">
              CALIBRATE SESSION
            </NeonButton>
          </motion.div>
        )}

        {stage === 'config' && (
          <motion.div
            key="stage-config"
            className="flex flex-col gap-6 anim-fade-in select-none"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <header className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black text-primary tracking-[3px] uppercase block mb-1">
                  DRILL SETTINGS
                </span>
                <h1 className="text-xl font-black italic uppercase text-white leading-none">
                  NEURAL CONFIG
                </h1>
              </div>
              <button
                onClick={() => setStage('welcome')}
                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </header>

            <div className="flex flex-col gap-3">
              <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block">
                DRILL COMBAT MODE
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => setMode('punches')}
                  className={`flex flex-col items-center justify-center p-3 rounded-3xl border text-left transition-all ${mode === 'punches'
                      ? 'bg-primary/15 border-primary text-primary shadow-[0_0_12px_rgba(226,255,59,0.2)]'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white'
                    }`}
                >
                  <Target className="w-5 h-5 mb-2" />
                  <span className="text-[9px] font-black uppercase">PUNCHES</span>
                  <span className="text-[6px] text-white/30 mt-0.5 text-center">Jab, Cross, Hook, Uppercut</span>
                </button>

                <button
                  onClick={() => setMode('defense')}
                  className={`flex flex-col items-center justify-center p-3 rounded-3xl border text-left transition-all ${mode === 'defense'
                      ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white'
                    }`}
                >
                  <Shield className="w-5 h-5 mb-2" />
                  <span className="text-[9px] font-black uppercase">DEFENSE</span>
                  <span className="text-[6px] text-white/30 mt-0.5 text-center">Slips, Rolls, Head Movement</span>
                </button>

                <button
                  onClick={() => setMode('freestyle')}
                  className={`flex flex-col items-center justify-center p-3 rounded-3xl border text-left transition-all ${mode === 'freestyle'
                      ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white'
                    }`}
                >
                  <Zap className="w-5 h-5 mb-2" />
                  <span className="text-[9px] font-black uppercase">FREESTYLE</span>
                  <span className="text-[6px] text-white/30 mt-0.5 text-center">No calls — throw freely</span>
                </button>
              </div>
            </div>

            {mode !== 'freestyle' && (
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block">
                  SPEED DIFFICULTY LEVEL
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { key: 'easy', label: 'EASY', color: 'text-green-400 border-green-500/30' },
                    { key: 'medium', label: 'MEDIUM', color: 'text-primary border-primary/30' },
                    { key: 'hard', label: 'HARD', color: 'text-red-500 border-red-500/30' },
                  ].map((choice) => (
                    <button
                      key={choice.key}
                      onClick={() => {
                        setDifficulty(choice.key as any);
                        speakCommand(`${choice.label} level.`);
                      }}
                      className={`py-3 rounded-2xl border text-[10px] font-black transition-all ${difficulty === choice.key
                          ? `bg-white/[0.08] ${choice.color} text-white`
                          : 'bg-black/40 border-white/5 text-white/55 hover:text-white'
                        }`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block">
                CAMERA SETUP GUIDE
              </span>
              <div className="bg-black/40 border border-primary/20 rounded-3xl overflow-hidden">
                <video
                  src="/vision/setup-guide.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full aspect-video object-cover bg-black"
                />
                <div className="p-4">
                  <p className="text-[11px] font-bold text-white/80 leading-relaxed">
                    Stand at a <span className="text-primary">45&deg; angle</span> to your camera — not straight-on —
                    with your <span className="text-primary">whole body in frame</span>, head to feet.
                  </p>
                  <p className="text-[9px] text-white/40 font-semibold leading-relaxed mt-2">
                    This gives the AI a clear side-on view of your rotation, footwork, and guard, so
                    tracking is more accurate for every drill — Punches, Defense, and Freestyle.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block">
                CAMERA SOURCE
              </span>
              {cameraDevices.length === 0 ? (
                <button
                  onClick={enumerateCameras}
                  className="bg-black/40 border border-primary/30 rounded-2xl px-4 py-4 text-[10px] text-white/70 font-black uppercase text-center hover:border-primary hover:text-primary transition-colors flex flex-col items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  Tap to Enable Camera Access
                </button>
              ) : (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-bold text-white uppercase tracking-wide focus:outline-none focus:border-primary"
                >
                  {cameraDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900">
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={enumerateCameras}
                className="text-[8px] font-black text-primary/70 hover:text-primary uppercase tracking-widest self-start"
              >
                ↻ Refresh camera list
              </button>
            </div>

            {mode === 'freestyle' ? (
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl text-center">
                <div className="text-3xl font-black italic text-white leading-none">
                  {Math.floor(freestyleDuration / 60)}:{String(freestyleDuration % 60).padStart(2, '0')}
                </div>
                <span className="text-[8px] font-black text-purple-400 tracking-widest uppercase block mt-1.5 mb-4">
                  ROUND DURATION
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 120].map((secs) => (
                    <button
                      key={secs}
                      onClick={() => setFreestyleDuration(secs)}
                      className={`py-2.5 rounded-2xl border text-[10px] font-black transition-all ${freestyleDuration === secs
                          ? 'bg-purple-500/15 border-purple-500 text-purple-400'
                          : 'bg-black/40 border-white/5 text-white/55 hover:text-white'
                        }`}
                    >
                      {secs}s
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl text-center">
                <div className="text-3xl font-black italic text-white leading-none">
                  {punchTarget}
                </div>
                <span className="text-[8px] font-black text-primary tracking-widest uppercase block mt-1.5 mb-4">
                  TOTAL COMMANDS OBJECTIVE
                </span>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={punchTarget}
                  onChange={(e) => setPunchTarget(parseInt(e.target.value))}
                  className="w-full accent-primary bg-white/10 rounded-lg cursor-pointer"
                />
                <span className="text-[7px] font-black text-white/30 tracking-widest uppercase mt-3 block">
                  Recommended: {difficulty === 'easy' ? '20' : difficulty === 'medium' ? '35' : '55'} commands
                </span>
              </div>
            )}

            {subscriptionError && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-red-400 leading-tight">{subscriptionError}</p>
              </div>
            )}

            <NeonButton onClick={startCalibration} disabled={subscriptionChecking} className="w-full h-14 mt-2">
              {subscriptionChecking ? 'CHECKING SUBSCRIPTION…' : 'START CALIBRATION'}
            </NeonButton>
          </motion.div>
        )}

        {stage === 'camera' && (
          <motion.div
            key="stage-camera"
            className="fixed inset-0 bg-black flex flex-col z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* ── Full-screen video + canvas ── */}
            <div className="absolute inset-0 z-0">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
              />
              {/* Subtle tactical grid overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="hud-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#e2ff3b" strokeWidth="0.6"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hud-grid)" />
              </svg>
            </div>

            {/* ── Corner brackets ── */}
            <div className="absolute top-[72px] left-3 w-5 h-5 border-l-2 border-t-2 border-primary z-30 pointer-events-none" />
            <div className="absolute top-[72px] right-3 w-5 h-5 border-r-2 border-t-2 border-primary z-30 pointer-events-none" />
            <div className="absolute bottom-[88px] left-3 w-5 h-5 border-l-2 border-b-2 border-primary z-30 pointer-events-none" />
            <div className="absolute bottom-[88px] right-3 w-5 h-5 border-r-2 border-b-2 border-primary z-30 pointer-events-none" />

            {/* ── TOP STATUS BAR ── */}
            <div className="relative z-40 flex items-center justify-between px-3 pt-10 pb-1">
              {/* Left: LIVE badge + FPS */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-black/70 border border-white/10 rounded-full px-3 py-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-white font-mono font-black text-[10px] tracking-widest">LIVE {timerDisplay}</span>
                </div>
                <div className="bg-primary/20 border border-primary/50 rounded-full px-2.5 py-1">
                  <span className="text-primary font-mono font-black text-[9px] tracking-widest">{liveFps} FPS</span>
                </div>
              </div>
              {/* Right: Restart Drill + Stance Shield */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={restartDrill}
                  title="Restart Drill"
                  aria-label="Restart Drill"
                  className="w-8 h-8 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white/70 hover:text-primary active:scale-90 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white/60"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── SUB-HEADER WIDGETS ── */}
            <div className="relative z-40 flex items-start justify-between px-3 pt-1">
              {/* Top-left HUD */}
              <div className="flex flex-col gap-1.5">
                {/* AI Vision active pill */}
                <div className="flex items-center gap-1.5 bg-black/70 border border-primary/40 rounded-full px-2.5 py-1 w-fit">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary font-mono font-black text-[8px] tracking-widest">AI VISION V2.4 ACTIVE</span>
                </div>
                {/* Impact velocity card */}
                <div
                  className={`bg-black/80 border rounded-xl px-3 py-2 relative transition-all duration-200 ${
                    isVelocityFlashing
                      ? 'border-[#E2FF3B] shadow-[0_0_20px_rgba(226,255,59,0.7)] scale-[1.03]'
                      : 'border-primary/30 shadow-[0_0_10px_rgba(226,255,59,0.08)]'
                  }`}
                >
                  <span className="text-[7px] font-black text-white/50 tracking-widest uppercase block mb-0.5">IMPACT VELOCITY</span>
                  <div className="flex items-baseline gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isVelocityFlashing ? 'bg-[#E2FF3B] animate-ping' : 'bg-primary'}`} />
                    <span className="text-primary font-mono font-black text-lg leading-none">
                      {((liveVelocity || peakAngularVelocityRef.current || 550) * 0.024).toFixed(1)}
                    </span>
                    <span className="text-white/50 font-mono text-[8px]">m/s</span>
                    <span className="text-[7px] font-black text-red-400 bg-red-500/20 border border-red-500/30 rounded px-1">MAX</span>
                  </div>
                </div>
                {/* Stance + Accuracy chips */}
                <div className="flex items-center gap-1.5">
                  <div className="bg-black/60 border border-white/10 rounded-full px-2 py-0.5">
                    <span className="text-[8px] font-black tracking-widest">
                      <span className="text-white/50">STANCE: </span>
                      <span className="text-cyan-400">ORTHODOX</span>
                    </span>
                  </div>
                  <div className="bg-black/60 border border-white/10 rounded-full px-2 py-0.5">
                    <span className="text-[8px] font-black tracking-widest">
                      <span className="text-white/50">ACCURACY: </span>
                      <span className="text-primary">{attemptedCount > 0 ? Math.round((hitCount / attemptedCount) * 100) : 94}%</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Top-right: Total punches */}
              <div className="bg-black/70 border border-white/10 rounded-xl px-3 py-2 text-right">
                <span className="text-[7px] font-black text-white/50 tracking-widest uppercase block">TOTAL PUNCHES</span>
                <div className="flex items-baseline gap-1.5 justify-end">
                  <span className="text-white font-mono font-black text-2xl leading-none">{hitCount}</span>
                  {hitCount > 0 && (
                    <span className="text-[8px] font-black text-primary bg-primary/20 border border-primary/30 rounded px-1">
                      x{Math.max(1, Math.floor(hitCount / 10))}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── ACTIVE COMMAND (mid-screen, minimal) ── */}
            {calibSuccess && !isTrackingInadequate && activeCommand && (
              <div className="absolute left-0 right-0 bottom-[220px] z-40 flex justify-center pointer-events-none">
                <motion.div
                  className="bg-black/90 border-2 border-primary rounded-xl px-6 py-2.5 text-center font-mono text-xl font-black text-primary tracking-widest select-none"
                  animate={{
                    boxShadow: isCommandSpeaking
                      ? '0 0 25px rgba(226,255,59,0.65)'
                      : '0 0 15px rgba(226,255,59,0.3)',
                    scale: isCommandSpeaking ? 1.04 : 1,
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {activeCommand}
                </motion.div>
              </div>
            )}

            {/* ── TRACKING LOSS OVERLAY ── */}
            {isTrackingInadequate && calibSuccess && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center select-none">
                <ShieldAlert className="w-8 h-8 text-yellow-400 mb-3 animate-pulse" />
                <div className="bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 px-4 py-2 rounded-xl text-[11px] font-black tracking-wide uppercase mb-2 max-w-[260px]">
                  ⚠️ Insufficient Tracking Data
                </div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider max-w-[240px]">
                  Position your full upper body in frame. Scoring is paused.
                </p>
              </div>
            )}

            {/* ── AWAITING START OVERLAY (Elevated in front, unobstructed, clickable) ── */}
            {awaitingUserStart && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
                <div className="bg-[#0c1606] border border-primary/60 text-primary px-3.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 shadow-[0_0_20px_rgba(226,255,59,0.3)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  CAMERA READY — CHECK YOUR FRAMING
                </div>

                <div className="relative group cursor-pointer my-3" onClick={beginCalibration}>
                  <div className="absolute -inset-3 bg-primary/35 rounded-full blur-2xl animate-pulse pointer-events-none" />
                  <button
                    type="button"
                    onClick={beginCalibration}
                    className="relative w-28 h-28 rounded-full bg-primary hover:bg-[#d6f52e] text-black flex flex-col items-center justify-center shadow-[0_0_35px_rgba(226,255,59,0.6)] active:scale-95 transition-all cursor-pointer z-10"
                  >
                    <Play className="w-8 h-8 fill-black text-black ml-1 mb-1" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-tight text-center">
                      START<br />ANALYSIS
                    </span>
                  </button>
                </div>

                <p className="text-[11px] text-white/75 font-black uppercase tracking-wider mt-6 max-w-[260px] leading-relaxed">
                  Step back 6–8 feet so upper body is fully in frame, then tap Start.
                </p>
              </div>
            )}

            {/* ── DRILL PAUSED OVERLAY ── */}
            {isPaused && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-150">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                  <span className="text-3xl font-black">⏸</span>
                </div>
                <h3 className="text-lg font-black tracking-widest uppercase text-white mb-1">DRILL PAUSED</h3>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-5 max-w-[220px]">
                  MediaPipe tracking and session timer are paused.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  className="px-6 py-2.5 rounded-full bg-primary hover:bg-[#d6f52e] text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(226,255,59,0.5)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>RESUME DRILL</span>
                </button>
              </div>
            )}

            {/* ── CALIBRATING OVERLAY ── */}
            {!awaitingUserStart && !calibSuccess && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="bg-primary/5 border border-primary text-primary px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase mb-4 animate-pulse">
                  {calibStatus}
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center text-primary text-2xl font-black font-mono shadow-[0_0_10px_rgba(226,255,59,0.15)] mb-3">
                  {calibSecondsLeft}
                </div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
                  STEP BACK 6-8 FEET AND RAISE GUARD
                </p>
              </div>
            )}

            {/* ── LOWER FLOATING HUD (Hidden while awaiting start so button is never covered) ── */}
            {!awaitingUserStart && (
              <div className="absolute bottom-[72px] left-0 right-0 z-40 px-3 flex flex-col gap-2 pointer-events-auto">
                {/* Mode card */}
                <div className="bg-black/80 border border-primary/40 rounded-2xl px-4 py-2.5" style={{ boxShadow: '0 0 12px rgba(226,255,59,0.06)' }}>
                  <span className="text-[7px] font-black text-white/40 tracking-[2px] uppercase block mb-0.5">MODE SELECTION</span>
                  <span className="text-white font-black text-base tracking-wider uppercase">
                    {mode === 'freestyle' ? 'FREESTYLE // DRILL #01' : mode === 'defense' ? 'DEFENSE // DRILL #01' : 'PUNCHES // DRILL #01'}
                  </span>
                </div>

                {/* Target combo row (Reactive to combo progress) */}
                <div className="bg-black/85 border border-white/10 rounded-2xl px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[7.5px] font-black text-white/70 tracking-widest uppercase">TARGET COMBO // 1-2-3</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[7.5px] font-black text-primary uppercase block font-mono">
                        STEP {(comboIndex % 5) + 1}/5
                      </span>
                      <span className="text-[7px] font-black text-white/40 uppercase">CADENCE 132 BPM</span>
                    </div>
                  </div>
                  {/* Reactive Combo step pills */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {(['JAB', 'CROSS', 'HOOK', 'SLIP R', 'UPPER'] as const).map((step, i) => {
                      const currentStepInCycle = comboIndex % 5;
                      const isCurrent = currentStepInCycle === i;
                      const isCompleted = currentStepInCycle > i;

                      return (
                        <div
                          key={step}
                          className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[8px] font-black font-mono tracking-wide transition-all duration-200 ${
                            isCurrent
                              ? 'bg-primary/25 border-primary text-primary shadow-[0_0_12px_rgba(226,255,59,0.5)] scale-105'
                              : isCompleted
                              ? 'bg-[#101e08]/90 border-[#84CC16]/60 text-[#84CC16]'
                              : i === 3
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400/70'
                              : 'bg-black/60 border-white/10 text-white/40'
                          }`}
                        >
                          <span className="text-[7px] opacity-70">
                            {isCompleted ? '✓' : i + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Tactical Cue */}
                <div className="bg-black/75 border border-cyan-400/20 rounded-2xl px-3 py-2 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[7px] font-black text-cyan-400 tracking-widest uppercase">AI TACTICAL CUE</span>
                      <span className="text-[7px] text-white/30 font-mono">JUST NOW</span>
                    </div>
                    <p className="text-[9px] text-white/80 font-semibold leading-tight truncate">
                      {tacticalCue}
                    </p>
                  </div>
                </div>

                {/* Bottom action chips */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[8px] font-black text-white/50 tracking-widest uppercase">CALIBRATE SENSORS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-white/40" />
                    <span className="text-[8px] font-black text-white/50 tracking-widest uppercase">METRICS HUD</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── BOTTOM CONTROLS (Pause and Terminate Session) ── */}
            <div className="absolute bottom-0 left-0 right-0 z-40 flex gap-3 px-3 pb-6 pt-3 bg-gradient-to-t from-black via-black/80 to-transparent">
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                title={isPaused ? 'Resume Session' : 'Pause Session'}
                className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                    : 'bg-black/80 border-white/20 text-white/80 hover:text-white active:scale-95'
                }`}
              >
                {isPaused ? <Play className="w-6 h-6 fill-current" /> : <span className="text-xl">⏸</span>}
              </button>
              <button
                type="button"
                onClick={stopSessionEarly}
                className="flex-1 h-14 rounded-full bg-gradient-to-r from-red-600 to-rose-700 active:scale-[0.98] text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(239,68,68,0.4)] cursor-pointer"
              >
                <StopCircle className="w-5 h-5 fill-white stroke-none" />
                <span>TERMINATE SESSION</span>
              </button>
            </div>

            {/* ── Camera / engine error ── */}
            {engineStatus === 'failed' && cameraError && (
              <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8 text-center gap-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
                <h3 className="text-white font-black uppercase text-sm">Camera / Model Unavailable</h3>
                <p className="text-white/50 text-xs max-w-[260px]">{cameraError}</p>
                <div className="flex gap-3 mt-2">
                  <button onClick={backToConfig} className="px-4 py-2 rounded-full border border-white/20 text-white/70 text-xs font-black uppercase">Back</button>
                  <button onClick={startCalibration} className="px-4 py-2 rounded-full bg-primary text-black text-xs font-black uppercase">Retry</button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {stage === 'analyzing' && (
          <motion.div
            key="stage-analyzing"
            className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[75vh] gap-6 select-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary text-3xl shadow-[0_0_20px_rgba(226,255,59,0.35)] animate-bounce">
              <Brain className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black text-primary tracking-[3px] uppercase block mb-1">
                ON-DEVICE ANALYSIS
              </span>
              <h2 className="text-xl font-black italic uppercase text-white leading-none">
                COMPILING SESSION DATA
              </h2>
              <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">
                Nothing left this device.
              </p>
            </div>

            <div className="w-full max-w-[280px] text-left border border-white/5 bg-black/40 rounded-3xl p-5 flex flex-col gap-3 font-mono text-[9px] text-white/50">
              <div className="flex justify-between items-center" id="step-1">
                <span>1. TALLYING HITS &amp; MISSES</span>
                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
              </div>
              <div className="flex justify-between items-center" id="step-2">
                <span>2. AVERAGING REACTION TIME</span>
                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
              </div>
              <div className="flex justify-between items-center" id="step-3">
                <span>3. COMPILING REPORT</span>
                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'results' && insufficientData && (
          <motion.div
            key="stage-results-insufficient"
            className="flex flex-col gap-6 anim-fade-in pb-16 select-none"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <header>
              <span className="text-[9px] font-black text-yellow-400 tracking-[3px] uppercase block mb-1">
                SESSION SUMMARY
              </span>
              <h1 className="text-xl font-black italic uppercase text-white leading-none">
                NOT ENOUGH DATA
              </h1>
            </header>
            <GlassCard className="p-6 border-yellow-500/20 bg-black/40 text-center flex flex-col items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-yellow-400" />
              <p className="text-xs text-white/60 leading-relaxed max-w-[280px]">
                Too few commands were confidently tracked this session to generate a reliable
                report. This usually means tracking was lost too often. No score has been fabricated.
              </p>
            </GlassCard>
            <footer className="flex gap-4 mt-4">
              <NeonButton onClick={() => setStage('welcome')} className="flex-1 h-14">
                RETRY SESSION <RotateCcw className="w-4 h-4 ml-1" />
              </NeonButton>
              <Link
                href="/dashboard"
                className="h-14 rounded-full border border-white/20 hover:bg-white/5 text-white/80 flex items-center justify-center px-6 font-black uppercase text-xs tracking-widest no-underline"
              >
                RETURN HOME
              </Link>
            </footer>
          </motion.div>
        )}

        {stage === 'results' && !insufficientData && resultsData && (
          <motion.div
            key="stage-results"
            className="flex flex-col gap-6 anim-fade-in pb-16 select-none"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <header className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black text-primary tracking-[3px] uppercase block mb-1">
                  SESSION SUMMARY
                </span>
                <h1 className="text-xl sm:text-2xl font-black italic uppercase text-white leading-none">
                  BIOMECHANICAL INTEL
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[8px] font-mono font-bold uppercase">
                  {resultsData.isFreestyle ? 'FREESTYLE' : modeRef.current.toUpperCase()}
                </span>
                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black tracking-widest uppercase">
                  ON-DEVICE
                </div>
              </div>
            </header>

            {/* ── 1. Overall Performance GlassCard ── */}
            <GlassCard className="p-6 border-primary/20 bg-black/40">
              <div className="text-left mb-4 pb-4 border-b border-white/5 flex items-end justify-between">
                <div>
                  <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">
                    Overall Performance
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase text-white leading-none italic">
                    {resultsData.overallScore >= 80 ? 'STRONG SESSION' : resultsData.overallScore >= 55 ? 'SOLID EFFORT' : 'NEEDS WORK'}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black font-mono text-primary leading-none">
                    {resultsData.overallScore}%
                  </span>
                  <span className="text-[7px] text-white/40 uppercase tracking-widest block mt-0.5">
                    COMBAT RATING
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mt-2">
                <MeritRing
                  label="Overall"
                  value={resultsData.overallScore}
                  caption={resultsData.isFreestyle ? 'Technique composite' : 'Accuracy + tracking + reflex'}
                />
                <MeritRing label="Power" value={resultsData.powerScore} caption="Peak hand speed" />
                <MeritRing
                  label="Reflex"
                  value={resultsData.isFreestyle || !resultsData.avgReflex ? null : resultsData.reflexScore}
                  caption={resultsData.avgReflex ? `Avg ${resultsData.avgReflex}ms` : 'Needs called drills'}
                />
                <MeritRing label="Stability" value={resultsData.stabilityScore ?? null} caption="Rep-to-rep consistency" />
                <MeritRing label="Swiftness" value={resultsData.swiftnessScore ?? null} caption="Sustained speed + pace" />
              </div>

              <div className="grid grid-cols-4 gap-2.5 mt-3.5">
                {(resultsData.isFreestyle
                  ? [
                      { val: `${resultsData.hits}`, label: 'Punches Thrown' },
                      { val: `${resultsData.kneeDriveScore}%`, label: 'Knee Drive' },
                      { val: `${resultsData.weightTransferScore}%`, label: 'Weight Shift' },
                      { val: `${resultsData.stanceScore}%`, label: 'Tracking' },
                    ]
                  : [
                      { val: `${resultsData.hits}/${resultsData.hits + resultsData.misses}`, label: 'Commands Hit' },
                      { val: resultsData.avgReflex ? `${resultsData.avgReflex}ms` : 'N/A', label: 'Avg Reaction' },
                      { val: `${resultsData.accuracy}%`, label: 'Accuracy' },
                      { val: `${resultsData.stanceScore}%`, label: 'Tracking' },
                    ]
                ).map((pill, idx) => (
                  <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-2xl py-2.5 text-center">
                    <div className="text-xs font-black text-primary leading-none mb-0.5 font-mono">
                      {pill.val}
                    </div>
                    <span className="text-[6px] font-black text-white/40 uppercase tracking-widest block">
                      {pill.label}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* ── 2. Biomechanical Hexagon Radar Chart ── */}
            <GlassCard className="p-5 border-primary/20 bg-black/45 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[9px] font-black text-primary tracking-widest uppercase block">
                    KINETIC MOTION SIGNATURE
                  </span>
                  <span className="text-[8px] text-white/40 uppercase tracking-wider">
                    6-Axis Pose Landmark Envelope vs 85% Pro Baseline
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[7px] font-black uppercase tracking-wider">
                  <Activity className="w-3 h-3" /> RADAR MATRIX
                </div>
              </div>

              <BiomechanicalRadarChart
                metrics={[
                  {
                    label: 'Power',
                    value: resultsData.powerScore,
                    benchmark: 85,
                    sub: 'Peak angular extension speed of the elbow joint',
                  },
                  {
                    label: 'Torso',
                    value: resultsData.torsoRotationScore ?? resultsData.rotationScore ?? 0,
                    benchmark: 85,
                    sub: 'Shoulder-line rotation angle turning into the strike',
                  },
                  {
                    label: 'Hip',
                    value: resultsData.hipRotationScore ?? resultsData.rotationScore ?? 0,
                    benchmark: 85,
                    sub: 'Rear hip opening & pelvic rotation carrying bodyweight',
                  },
                  {
                    label: 'Knee',
                    value: resultsData.kneeDriveScore ?? 0,
                    benchmark: 80,
                    sub: 'Lower limb spring and vertical push-off off back foot',
                  },
                  {
                    label: 'Transfer',
                    value: resultsData.weightTransferScore ?? 0,
                    benchmark: 80,
                    sub: 'Horizontal center-of-mass shift forward into strike',
                  },
                  {
                    label: resultsData.isFreestyle ? 'Pivot' : 'Reflex',
                    value: resultsData.isFreestyle
                      ? (resultsData.footPivotScore ?? 0)
                      : (resultsData.reflexScore ?? resultsData.footPivotScore ?? 0),
                    benchmark: 85,
                    sub: resultsData.isFreestyle
                      ? 'Rear heel rotation allowing complete hip extension'
                      : 'Response latency between audio trigger and strike launch',
                  },
                ]}
              />
            </GlassCard>

            {/* ── 3. Evidenced Flaw Teller Diagnostic Suite ── */}
            <InteractiveFlawTeller
              hasFlaw={resultsData.hasFlaw}
              headlineFlaw={resultsData.flaw}
              advice={resultsData.advice}
              detailedFlaws={resultsData.detailedFlaws}
            />

            {/* ── 4. Strike Speed Per Rep & Reaction Time Waveforms ── */}
            {resultsData.log && resultsData.log.length > 0 && (
              <GlassCard className="p-5 border-white/5 bg-black/40 flex flex-col gap-5">
                <div>
                  <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-0.5">
                    Strike Velocity &amp; Power Waveform
                  </span>
                  <p className="text-[8px] text-white/40 uppercase tracking-wider mb-3">
                    Every rep tracked from MediaPipe Landmark displacement · Tap any bar to inspect
                  </p>
                  <InteractiveSpeedPowerChart log={resultsData.log} />
                </div>

                {resultsData.log.filter((r: RepLogEntry) => r.hit && r.reactionMs !== null).length >= 2 && (
                  <div className="pt-4 border-t border-white/5">
                    <span className="text-[9px] font-black text-cyan-400 tracking-widest uppercase block mb-0.5">
                      Reaction Cadence Response Curve
                    </span>
                    <p className="text-[8px] text-white/40 uppercase tracking-wider mb-3">
                      Reaction time (ms) from audio command onset to full elbow extension
                    </p>
                    <InteractiveReactionTrendChart log={resultsData.log} />
                  </div>
                )}
              </GlassCard>
            )}

            {/* ── 5. Technique Attainment Matrix ── */}
            {resultsData.techniqueSummaries && resultsData.techniqueSummaries.length > 0 && (
              <TechniqueComparisonMatrix techniqueSummaries={resultsData.techniqueSummaries} />
            )}

            {/* ── 6. Session Fault Telemetry (Replaces plain text bullet list) ── */}
            {resultsData.mistakes && resultsData.mistakes.length > 0 && (
              <DiagnosticFaultMatrix mistakes={resultsData.mistakes} />
            )}

            {/* ── 7. Full-Body Biomechanics Kinetic Gauges ── */}
            {resultsData.log && resultsData.log.length > 0 && (
              <GlassCard className="p-5 border-white/5 bg-black/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-primary tracking-widest uppercase">
                    Full-Body Biomechanics Gauges
                  </span>
                  <span className="text-[8px] font-mono text-white/40 uppercase">
                    33-POINT SKELETON
                  </span>
                </div>
                <p className="text-[8px] text-white/30 uppercase tracking-wider mb-3.5">
                  Measured from real landmark coordinates, not synthetic estimations
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Torso Rotation', val: resultsData.torsoRotationScore ?? resultsData.rotationScore },
                    { label: 'Hip Rotation', val: resultsData.hipRotationScore ?? resultsData.rotationScore },
                    { label: 'Knee Drive', val: resultsData.kneeDriveScore },
                    { label: 'Weight Transfer', val: resultsData.weightTransferScore },
                    { label: 'Rear Foot Pivot', val: resultsData.footPivotScore },
                    { label: 'Strike Power', val: resultsData.powerScore },
                    ...(resultsData.headLateralScore || resultsData.headDropScore
                      ? [
                          { label: 'Head Lateral (Slip)', val: resultsData.headLateralScore ?? 0 },
                          { label: 'Head Drop (Roll)', val: resultsData.headDropScore ?? 0 },
                        ]
                      : []),
                  ].map((m, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[8px] font-black text-white/50 uppercase tracking-wider">{m.label}</span>
                        <span className="text-[10px] font-mono font-black text-white">{m.val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            m.val >= 75 ? 'bg-primary' : m.val >= 50 ? 'bg-cyan-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, m.val))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/5 px-1">
                  <span className="text-[7px] font-black text-white/35 uppercase tracking-wider">
                    Punch Trajectory Matching
                  </span>
                  <span className="text-[10px] font-mono font-black text-primary">{resultsData.trajectoryAccuracy}%</span>
                </div>
              </GlassCard>
            )}

            {/* ── 8. Interactive Rep Inspector Drawer (Punch-By-Punch) ── */}
            {resultsData.log && resultsData.log.length > 0 && (
              <InteractiveRepLog log={resultsData.log} />
            )}

            {/* ── 9. Coach Feedback Card ── */}
            <div className="glass-card p-5 border-white/5 bg-black/40 flex items-start gap-4 rounded-3xl">
              <div className="w-11 h-11 rounded-2xl border border-primary/30 bg-primary/10 text-primary flex items-center justify-center text-lg shrink-0 shadow-[0_0_15px_rgba(226,255,59,0.2)]">
                🤖
              </div>
              <div className="text-left flex-1 min-w-0">
                <span className="text-[7px] font-black text-primary tracking-widest uppercase block mb-1">
                  TACTICAL AI COACH PRESCRIPTION
                </span>
                <p className="text-xs font-semibold text-white/80 leading-relaxed italic">
                  &ldquo;{resultsData.advice}&rdquo;
                </p>
              </div>
            </div>

            <footer className="flex gap-4 mt-4">
              <NeonButton onClick={() => setStage('welcome')} className="flex-1 h-14">
                NEW SESSION <RotateCcw className="w-4 h-4 ml-1" />
              </NeonButton>
              <Link
                href="/dashboard"
                className="h-14 rounded-full border border-white/20 hover:bg-white/5 text-white/80 flex items-center justify-center px-6 font-black uppercase text-xs tracking-widest no-underline"
              >
                RETURN HOME
              </Link>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}