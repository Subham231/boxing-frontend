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
  Play
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { NeonButton } from '@/components/ui/NeonButton';
import { completeSessionSecure } from '@/lib/rank-client';
import { logVisionSession, getReflexTier } from '@/lib/session-log';
import { firebaseAuth } from '@/lib/firebase';
import {
  topSessionFlaws,
  summarizeTechniques,
  diagnoseRootCauses,
  DetectedFlaw,
  RootCauseDiagnosis,
  TechniqueSummary,
  FlawEngineRep,
} from '@/lib/coach/flawEngine';
import { playVoiceEvent, preloadVoicePack, unlockVoicePack, stopVoicePack } from '@/lib/voice-pack';
import { PoseEngine, EngineStatus, EngineFrame } from '@/lib/vision/poseEngine';
import { LandmarkFilter, FilteredLandmark } from '@/lib/vision/landmarkFilter';
import {
  angle3D,
  angle2D,
  axialRotationDeg,
  angleDelta,
  SignalTracker,
  analyzeSequencing,
  ChainSegment,
  Vec3,
} from '@/lib/vision/kinematics';
import { GuardTracker, measureWristAlignment, matchHandToWrist, HAND_LM } from '@/lib/vision/guardTracker';

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
const VISIBILITY_THRESHOLD = 0.42; // Quorum floor for bladed/angled 45° boxing stance
const CALIBRATION_HOLD_MS = 2000;
const TRACKING_LOSS_GRACE_MS = 500;
const TRACKING_RECOVERY_MS = 400;
const REACTION_WINDOW_PAD_MS = 250;

// --- Punch validation biomechanics constants ---------------------------
// A punch is only counted after passing through a real state machine
// (GUARD -> STRIKE -> GUARD), not a single frame threshold. This is what
// prevents false positives from idle movement, camera shake, or slowly
// raising an arm to scratch your face.
const ELBOW_EXTEND_THRESHOLD = 138;   // deg — calibrated so snappy non-hyperextending punches register cleanly at 30fps
const ELBOW_RETRACT_THRESHOLD = 124;  // deg — hysteresis band kills flicker/vibration double-counts
const MIN_PUNCH_ANGULAR_VELOCITY = 125; // deg/sec — responsive to genuine punches across varied framerates
const SMOOTHING_ALPHA = 0.35; // exponential smoothing factor — preserves raw signal peak
const MIN_ROTATION_FOR_FULL_SCORE = 22; // deg of shoulder-line rotation for a "fully rotated" hook/cross
const FULL_KNEE_DRIVE_DEG = 18;         // deg of knee-angle change (push-off/extension) for a full drive score
const FULL_WEIGHT_TRANSFER_RATIO = 0.12; // hip horizontal shift, as a fraction of shoulder width, for a full transfer score
const FULL_FOOT_PIVOT_DEG = 20;         // deg of rear-foot rotation for a full pivot score
// A real punch moves the wrist fast through space, not just the elbow angle
// fast — angular velocity alone can be tripped by a shoulder shrug or a
// twitch near full extension. Requiring BOTH signals to agree is a much
// stronger check than either alone.
const MIN_WRIST_SPEED = 0.22; // shoulder-widths per second; normalized webcam motion is usually below 1.0
const MOTION_MEMORY_MS = 500; // ms — prevents peak trackers from resetting mid-hook or during combination pauses
// After retracting to guard, the arm must stay there briefly before the
// next strike can be evaluated — without this, noise flickering right
// across the hysteresis band can register as several strikes in a row.
const GUARD_REARM_MS = 70;
// Trajectory classification needs a real, decisive wrist path to trust —
// below this displacement (relative to shoulder width) there isn't enough
// signal to say what shape was thrown, so we don't penalize it.
const MIN_TRAJECTORY_CONFIDENCE = 0.16;
// A hook is thrown with the elbow staying bent (often ~80-120°) the whole
// way through — it can legitimately never reach ELBOW_EXTEND_THRESHOLD,
// which is what a straight punch needs.
const MIN_HOOK_ELBOW_ANGLE = 50;
const UPPERCUT_MIN_VERTICAL_TRAVEL = 0.10; // shoulder-widths of upward wrist displacement
// Reference magnitudes (normalized by shoulder width, same units as
// noseOffset/drop above) for a "fully committed" slip or roll, used to
// convert raw peak displacement into a 0-100 score the same way peak
// rotation/knee-drive/etc are converted above.
const FULL_HEAD_LATERAL_FOR_FULL_SCORE = 0.55; // matches the existing defenseTriggered lateral threshold with headroom
const FULL_HEAD_DROP_FOR_FULL_SCORE = 0.35;

// --- Landmarks whose tracking quality actually gates a measurement -------
// Frame confidence is summarized over these only. Face and finger points
// dropping out has no bearing on whether a punch can be scored, so
// including them would make the quality number pessimistic and
// uninformative.
const TRACKED_LANDMARK_INDICES = [
  0,              // nose
  11, 12,         // shoulders
  13, 14,         // elbows
  15, 16,         // wrists
  23, 24,         // hips
  25, 26,         // knees
  27, 28,         // ankles
  29, 30, 31, 32, // heels + foot index
];

// A rep whose mean landmark confidence falls below this is logged, but its
// biomechanics are marked untrustworthy so the flaw engine discounts them
// rather than diagnosing off noise.
const REP_CONFIDENCE_FLOOR = 0.38;

// How long after peak extension we keep sampling the wrist's distance from
// guard to measure the return.
const RECOVERY_SAMPLE_WINDOW_MS = 900;

// A hook is defined by the elbow STAYING bent through the whole punch; a
// straight punch passes through this angle on its way out to full
// extension. This is the signal that actually separates the two shapes.
const HOOK_MAX_ELBOW_ANGLE = 138;
// Minimum lateral wrist travel (in shoulder-widths) before a punch can be
// called a hook at all.
const MIN_HOOK_LATERAL = 0.28;
// --- Hook detection (its own cycle, deliberately NOT the straight-punch
// hysteresis) ----------------------------------------------------------
const HOOK_MIN_SWEEP = 0.32;      // shoulder-widths of peak wrist travel
const HOOK_RETURN_RATIO = 0.72;    // wrist must fall back to this fraction of peak

// Wrist displacement (normalized by shoulder width) shape used to classify
// what kind of punch was actually thrown, independent of what was called —
// lets us flag when a "HOOK" call was actually thrown as a straight punch.
function classifyTrajectory(
  dx: number,
  dy: number,
  shoulderWidth: number,
  elbowAngleAtPeak?: number
): 'straight' | 'hook' | 'uppercut' {
  if (shoulderWidth <= 0) return 'straight';
  const nx = dx / shoulderWidth;
  const ny = dy / shoulderWidth;
  // Upward punch vector: ny is negative in screen space (y=0 at top)
  if (ny < -UPPERCUT_MIN_VERTICAL_TRAVEL && Math.abs(ny) > Math.abs(nx) * 0.7) return 'uppercut';
  const lateralEnough = Math.abs(nx) > MIN_HOOK_LATERAL;
  const elbowStayedBent =
    elbowAngleAtPeak === undefined
      ? Math.abs(ny) < Math.abs(nx) * 0.8
      : elbowAngleAtPeak < HOOK_MAX_ELBOW_ANGLE;
  if (lateralEnough && elbowStayedBent) return 'hook';
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

  // --- Added with the upgraded capture pipeline -------------------------
  // All optional so a rep captured before these signals were available
  // still satisfies the type, and so the flaw engine can tell "not
  // measured" apart from "measured as zero" (see FlawEngineRep).
  trackingConfidence?: number;    // 0-1 mean landmark confidence during this rep
  guardRecoveryScore?: number;    // 0-100, did the punching hand return to guard
  guardIntegrityScore?: number;   // 0-100, did the OFF hand stay up
  wristAlignmentScore?: number;   // 0-100, fist/forearm alignment (hand model only)
  sequenceScore?: number;         // 0-100, proximal-to-distal chain ordering
  recoverySpeedScore?: number;    // 0-100, how fast the retraction was
  recoveryMs?: number | null;     // measured retraction time
  armDominant?: boolean;          // arm peaked before the hips
  peakAcceleration?: number;      // deg/s^2 at the elbow
  timeToPeakMs?: number | null;   // initiation -> peak velocity
}

// Reference angular velocity (deg/sec) used to normalize speed into a 0-100
// "power" estimate. This is a heuristic scale, not a calibrated force unit —
// a monocular camera has no way to measure actual impact force.
const POWER_REFERENCE_VELOCITY = 900;

// Reaction-time band used to convert an average reaction (ms) into a 0-100
// reflex score. CEILING = as fast as a human realistically reacts to a
// spoken call and completes a validated strike; FLOOR = the point at which
// the response is genuinely too slow to score.
const REFLEX_CEILING_MS = 250;
const REFLEX_FLOOR_MS = 1600;

function estimatePower(peakVelocity: number): number {
  return Math.round(Math.min(100, Math.max(0, (peakVelocity / POWER_REFERENCE_VELOCITY) * 100)));
}

// --- New merit formulas (Stability, Swiftness) ------------------------------
// Both are built entirely from signals the capture loop was already
// recording per rep (repLog) and per session (elapsedSecondsRef) — no new
// tracking machinery, just a new way of interpreting existing measurements.

// A rep's overall "form composite" — the same underlying per-rep scores the
// mechanics database already grades individual flaws against, collapsed
// into one number per rep purely so Stability can measure how much that
// number swings rep-to-rep (consistency), which is a different question
// than the flaw engine's "was the average good or bad".
function repFormComposite(r: { kind: 'punch' | 'defense'; torsoRotationScore?: number; hipRotationScore?: number; kneeDriveScore: number; weightTransferScore: number; footPivotScore: number; headLateralScore?: number; headDropScore?: number }): number {
  if (r.kind === 'defense') {
    // A slip mainly registers on headLateral, a roll mainly on headDrop —
    // taking the max of the two (instead of averaging them together) avoids
    // diluting a clean slip's score with an irrelevant near-zero roll metric.
    const headSignal = Math.max(r.headLateralScore ?? 0, r.headDropScore ?? 0);
    return (headSignal + r.kneeDriveScore) / 2;
  }
  return (
    ((r.torsoRotationScore ?? 0) + (r.hipRotationScore ?? 0) + r.kneeDriveScore + r.weightTransferScore + r.footPivotScore) / 5
  );
}

// A stdDev of this size or more across a session's reps is treated as
// "maximally inconsistent" (score floors at 0); 0 stdDev is perfectly
// repeatable technique (score caps at 100). Calibrated against the 0-100
// scale the underlying metrics already use.
const MAX_EXPECTED_FORM_STDDEV = 35;

function computeStabilityScore(hits: Array<Parameters<typeof repFormComposite>[0]>, fallbackTrackingScore: number): number {
  if (hits.length < 2) {
    // Can't measure rep-to-rep consistency from a single data point — fall
    // back to how steadily the fighter held the frame instead, which is
    // the existing trackingConfidence signal, not a new invented number.
    return fallbackTrackingScore;
  }
  const composites = hits.map(repFormComposite);
  const mean = composites.reduce((a, b) => a + b, 0) / composites.length;
  const variance = composites.reduce((sum, c) => sum + (c - mean) ** 2, 0) / composites.length;
  const stdDev = Math.sqrt(variance);
  return Math.round(Math.min(100, Math.max(0, 100 - (stdDev / MAX_EXPECTED_FORM_STDDEV) * 100)));
}

// "Excellent" output tempo reference, in landed strikes/defensive reps per
// minute of active session time — a brisk combo pace on pads/shadowboxing.
// Swiftness measures throughput (how fast reps kept coming), which is a
// different dimension from Reflex (latency to start each individual rep)
// and Power (force of each individual strike).
const SWIFTNESS_REFERENCE_PER_MINUTE = 45;

function computeSwiftnessScore(hitCount: number, activeSeconds: number): number {
  const activeMinutes = Math.max(activeSeconds, 1) / 60;
  const perMinute = hitCount / activeMinutes;
  return Math.round(Math.min(100, Math.max(0, (perMinute / SWIFTNESS_REFERENCE_PER_MINUTE) * 100)));
}

// Per-rep peak strike speed, color-coded by hit/miss. Every bar is a real
// measured value from that specific rep — nothing here is interpolated.
function SpeedPowerChart({ log }: { log: RepLogEntry[] }) {
  if (log.length === 0) return null;
  const width = 300;
  const height = 110;
  const padding = 4;
  const barGap = 2;
  const barWidth = (width - padding * 2) / log.length;
  const maxVelocity = Math.max(...log.map((r) => r.peakVelocity), 100);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28" preserveAspectRatio="none">
      {log.map((r, i) => {
        const barHeight = Math.max(2, (r.peakVelocity / maxVelocity) * (height - 18));
        const x = padding + i * barWidth;
        const y = height - barHeight - 12;
        return (
          <rect
            key={r.index}
            x={x + barGap / 2}
            y={y}
            width={Math.max(1.5, barWidth - barGap)}
            height={barHeight}
            rx={1.5}
            fill={r.hit ? '#e2ff3b' : '#ef4444'}
            opacity={r.hit ? 0.9 : 0.5}
          />
        );
      })}
      <line x1={0} y1={height - 12} x2={width} y2={height - 12} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
    </svg>
  );
}

// Reaction-time trend across hit reps only (misses have no reaction time to
// plot). Lower on the chart = slower response, matching intuitive reading.
function ReactionTrendChart({ log }: { log: RepLogEntry[] }) {
  const hits = log.filter((r) => r.hit && r.reactionMs !== null);
  if (hits.length < 2) return null;

  const width = 300;
  const height = 90;
  const padX = 10;
  const padY = 12;
  const values = hits.map((r) => r.reactionMs as number);
  const maxReaction = Math.max(...values);
  const minReaction = Math.min(...values);
  const range = maxReaction - minReaction || 1;

  const points = hits.map((r, i) => {
    const x = padX + (i / (hits.length - 1)) * (width - padX * 2);
    const norm = (((r.reactionMs as number) - minReaction) / range);
    const y = padY + norm * (height - padY * 2);
    return { x, y };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#06b6d4" />
      ))}
    </svg>
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

// Angle (degrees) of the line between two landmarks — used on the shoulder
// pair to measure torso rotation (a real hook/cross twists the shoulders;
// an arm-only flail doesn't).
function lineAngle(a: PoseLandmark, b: PoseLandmark): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}


/**
 * Everything the results screen renders after a session.
 *
 * This was previously `useState<any>`, which meant the results object and
 * the ~40 places that read it were completely unchecked — a renamed field
 * or a typo'd property surfaced as `undefined` on screen rather than as a
 * build error. That is exactly the failure mode this screen can least
 * afford, since a silently-undefined metric still renders as a confident
 * looking dash or NaN.
 */
interface SessionResults {
  overallScore: number;
  powerScore: number;
  /** @deprecated Legacy alias of trackingConfidenceScore — this was never a
   *  measure of stance. Kept only so previously-saved sessions still read. */
  stanceScore: number;
  /** How clearly the camera tracked the fighter — NOT a performance metric. */
  trackingConfidenceScore: number;
  reflexScore: number;
  stabilityScore: number;
  swiftnessScore: number;
  accuracy: number;
  avgReflex: number | null;
  hits: number;
  misses: number;
  posture: number;
  advice: string;
  flaw: string;
  mistakes: string[];
  log: RepLogEntry[];
  rotationScore: number;
  hipRotationScore: number;
  torsoRotationScore: number;
  kneeDriveScore: number;
  weightTransferScore: number;
  footPivotScore: number;
  headLateralScore: number;
  headDropScore: number;
  trajectoryAccuracy: number;
  isFreestyle: boolean;
  detailedFlaws: DetectedFlaw[];
  techniqueSummaries: TechniqueSummary[];
  rootCauses: RootCauseDiagnosis[];
  /** Capture quality, reported separately from performance. */
  analysisQuality: number;
  /** Which model/backend actually produced this session's data. */
  engineInfo: EngineStatus | null;
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
  // Only the setter is used; the count is read from missCountRef during
  // the session loop, where a ref avoids a re-render per miss.
  const [, setMissCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [activeCommand, setActiveCommand] = useState('');
  // Rolling window of the last few commands actually issued (i.e. the same
  // text handed to speakCommand/activeCommandTextRef — see
  // setExpectedCommand below). Drives the "TARGET COMBO" HUD strip so it
  // shows real called commands instead of a fixed decorative sequence that
  // has nothing to do with the drill in progress.
  const [commandHistoryDisplay, setCommandHistoryDisplay] = useState<string[]>([]);
  const commandHistoryRef = useRef<string[]>([]);
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
  // Setter-only: the index is advanced for cadence variety but never read
  // in render.
  const [, setComboIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef(false);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Results
  const [resultsData, setResultsData] = useState<SessionResults | null>(null);
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

  const rafIdRef = useRef<number | null>(null);

  // --- Upgraded vision pipeline ------------------------------------------
  const poseEngineRef = useRef<PoseEngine | null>(null);
  const landmarkFilterRef = useRef<LandmarkFilter>(new LandmarkFilter(TRACKED_LANDMARK_INDICES));
  const guardTrackerRef = useRef<GuardTracker>(new GuardTracker());
  const [engineInfo, setEngineInfo] = useState<EngineStatus | null>(null);
  // Detected fighting stance. Null until enough evidence has accumulated —
  // the UI previously displayed a hardcoded "ORTHODOX" regardless of what
  // the camera saw, which is a fabricated claim in a product that
  // advertises biomechanical analysis.
  const [detectedStance, setDetectedStance] = useState<'ORTHODOX' | 'SOUTHPAW' | null>(null);
  const stanceVotesRef = useRef({ orthodox: 0, southpaw: 0 });
  // Latest filtered frame, kept so the render tick can redraw the skeleton
  // at full camera rate while inference runs slower.
  const latestFrameRef = useRef<{ landmarks: FilteredLandmark[]; ts: number } | null>(null);

  // Per-frame confidence samples for the rep currently being measured.
  const repConfidenceSamplesRef = useRef<number[]>([]);

  // Kinetic-chain peak-timing trackers. Each records WHEN its segment hit
  // peak velocity, which is what makes sequencing measurable.
  const hipRotTrackerRef = useRef(new SignalTracker());
  const torsoRotTrackerRef = useRef(new SignalTracker());
  const shoulderTrackerRef = useRef(new SignalTracker());
  const elbowTrackerRef = useRef(new SignalTracker());
  const wristTrackerRef = useRef(new SignalTracker());

  // Guard-return measurement state for the strike in flight.
  const recoverySamplesRef = useRef<Array<{ t: number; drift: number }>>([]);
  const peakDriftRef = useRef({ drift: 0, at: 0 });
  const punchingSideRef = useRef<'left' | 'right'>('right');
  const offHandIntegrityRef = useRef<number | null>(null);
  const wristAlignmentRef = useRef<number | null>(null);
  const latestHandsRef = useRef<EngineFrame['hands']>([]);
  const worldLandmarksRef = useRef<Vec3[]>([]);
  // Timestamp the current motion burst began, for time-to-peak.
  const motionStartedAtRef = useRef(0);

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

  // Single source of truth for "what's currently expected". Every place
  // that starts a new call (runCommands, startFreestyleRound) must go
  // through this instead of writing activeCommandTextRef and the
  // activeCommand/commandHistory UI state as separate, independent
  // assignments — that duplication is exactly what let the HUD's "TARGET
  // COMBO" strip drift into showing its own hardcoded step sequence
  // instead of the real called commands. registerHit()/scoring already
  // reads activeCommandTextRef.current, and this is the only function
  // that's allowed to write it, so the UI can never show a different
  // "expected" punch than the one being scored.
  const setExpectedCommand = (text: string) => {
    activeCommandTextRef.current = text;
    setActiveCommand(text);
    const hist = [...commandHistoryRef.current, text].slice(-5);
    commandHistoryRef.current = hist;
    setCommandHistoryDisplay(hist);
  };

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
  // elbowAtPeak: the elbow angle measured at the frame of peak wrist
  // displacement — classifyTrajectory() needs it to tell a bent-elbow hook
  // apart from a straight punch that merely looks lateral on camera.
  const peakWristDisplacementRef = useRef({ dx: 0, dy: 0, mag: 0, elbowAtPeak: 180 });
  const lastShoulderWidthRef = useRef(0.2);
  // Per-motion-burst hook bookkeeping (reset at rest, see `atRest` below).
  // maxElbowSinceMotionRef is the discriminator that keeps a straight punch
  // out of the hook path: a jab/cross always extends past
  // HOOK_MAX_ELBOW_ANGLE at some point in its flight, a hook never does.
  const maxElbowSinceMotionRef = useRef(0);
  const hookValidatedThisBurstRef = useRef(false);

  // --- Defensive head-movement tracking (independent of the elbow state
  // machine — a slip/roll never extends the elbow, so it needs its own peak
  // tracker rather than piggybacking on the punch guard/strike cycle). Reset
  // per-command in runCommands() so each defense rep is scored on its own
  // window, not against drift from earlier in the round. -------------------
  const noseYBaselineRef = useRef(0); // slow EMA of nose.y — the "at rest" head height
  const peakHeadLateralRef = useRef(0); // peak |noseOffset| (normalized) this command window — slip quality
  const peakHeadDropRef = useRef(0); // peak downward nose displacement (normalized) this command window — roll quality

  // Defense-specific knee-bend tracking (roll/bob-and-weave leg drive).
  // A roll/slip never triggers the elbow guard->strike state machine, so
  // kneeBaselineRef/peakKneeDriveRef above — which only update outside
  // "guard" state — permanently read 0 for every defense rep (they're
  // reset to 0 on every single frame while the elbow stays in guard,
  // which it always does during a roll). This keeps its own slow EMA
  // baseline per knee, exactly like noseYBaselineRef above, so ROLL_UNDER
  // gets a genuine, independently-measured knee-drive score instead of a
  // permanent stale 0 that made the "no leg bend" flaw fire every time.
  const defenseKneeBaselineRef = useRef({ L: 0, R: 0 });
  const peakDefenseKneeDriveRef = useRef(0);

  // -------------------------------------------------------------------------
  // Mount / MediaPipe script loading
  // -------------------------------------------------------------------------
  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    // Model loading is owned by PoseEngine (see startPoseEngine). It
    // self-hosts wasm + weights from /public with a CDN fallback and a
    // legacy-API fallback beneath that, so there is nothing to preload
    // here — and no global <script> tag to leak across navigations.

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
    if (poseEngineRef.current) {
      poseEngineRef.current.dispose();
      poseEngineRef.current = null;
    }
    // Reset the conditioning layer so a new session never inherits the
    // previous one's baselines, velocities or filter state.
    landmarkFilterRef.current.reset();
    guardTrackerRef.current.reset();
    latestFrameRef.current = null;
    latestHandsRef.current = [];
    worldLandmarksRef.current = [];
    repConfidenceSamplesRef.current = [];
    recoverySamplesRef.current = [];
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
  // Always stop whatever's currently playing first — this is the single
  // voice output for the whole session; nothing should ever layer on top
  // of it. Without this, "Calibration complete" (a premade clip) and the
  // first drill command (which fires only 800ms later) could genuinely
  // overlap and play as two simultaneous voices, since a premade <audio>
  // clip and a browser-TTS utterance run on two completely independent
  // channels and neither one stops the other on its own.
  const speakCommand = (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (isMutedRef.current) {
      onStart?.();
      onEnd?.();
      return;
    }
    stopVoicePack();
    try { synthRef.current?.cancel(); } catch { /* ignore */ }
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

    // --- Body-anchored tactical grid (tracks the torso quadrilateral) ------
    // Replaces the old static SVG grid that was pinned to the viewport.
    // Uses shoulder+hip landmarks to create a perspective-correct grid that
    // moves, rotates, and scales with the fighter's body.
    const _lS = landmarks[LM.L_SHOULDER], _rS = landmarks[LM.R_SHOULDER];
    const _lH = landmarks[LM.L_HIP], _rH = landmarks[LM.R_HIP];
    const _gridVis = 0.3;
    if (_lS && _rS && _lH && _rH &&
        (_lS.visibility ?? 1) >= _gridVis && (_rS.visibility ?? 1) >= _gridVis &&
        (_lH.visibility ?? 1) >= _gridVis && (_rH.visibility ?? 1) >= _gridVis) {
      const tl = { x: _lS.x * w, y: _lS.y * h };
      const tr = { x: _rS.x * w, y: _rS.y * h };
      const bl = { x: _lH.x * w, y: _lH.y * h };
      const br = { x: _rH.x * w, y: _rH.y * h };
      const gcx = (tl.x + tr.x + bl.x + br.x) / 4;
      const gcy = (tl.y + tr.y + bl.y + br.y) / 4;
      const gridExpand = 1.6;
      const ep = (p: { x: number; y: number }) => ({
        x: gcx + (p.x - gcx) * gridExpand,
        y: gcy + (p.y - gcy) * gridExpand,
      });
      const etl = ep(tl), etr = ep(tr), ebl = ep(bl), ebr = ep(br);
      const gridN = 6;
      // Grid lines
      ctx.strokeStyle = 'rgba(226, 255, 59, 0.07)';
      ctx.lineWidth = 0.8;
      for (let gi = 0; gi <= gridN; gi++) {
        const gt = gi / gridN;
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(etl.x + (ebl.x - etl.x) * gt, etl.y + (ebl.y - etl.y) * gt);
        ctx.lineTo(etr.x + (ebr.x - etr.x) * gt, etr.y + (ebr.y - etr.y) * gt);
        ctx.stroke();
        // Vertical
        ctx.beginPath();
        ctx.moveTo(etl.x + (etr.x - etl.x) * gt, etl.y + (etr.y - etl.y) * gt);
        ctx.lineTo(ebl.x + (ebr.x - ebl.x) * gt, ebl.y + (ebr.y - ebl.y) * gt);
        ctx.stroke();
      }
      // Center crosshair (brighter)
      ctx.strokeStyle = 'rgba(226, 255, 59, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo((etl.x + etr.x) / 2, (etl.y + etr.y) / 2);
      ctx.lineTo((ebl.x + ebr.x) / 2, (ebl.y + ebr.y) / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((etl.x + ebl.x) / 2, (etl.y + ebl.y) / 2);
      ctx.lineTo((etr.x + ebr.x) / 2, (etr.y + ebr.y) / 2);
      ctx.stroke();
      // Outer grid border
      ctx.strokeStyle = 'rgba(226, 255, 59, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(etl.x, etl.y);
      ctx.lineTo(etr.x, etr.y);
      ctx.lineTo(ebr.x, ebr.y);
      ctx.lineTo(ebl.x, ebl.y);
      ctx.closePath();
      ctx.stroke();
    }

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

  /**
   * Bring up the pose engine against an already-playing video element.
   *
   * Replaces two near-identical inline copies of model init + detect loop
   * (the primary camera path and the fallback-camera path), which had
   * already drifted apart from each other. One implementation means a fix
   * lands in both paths by construction.
   */
  const startPoseEngine = async (videoEl: HTMLVideoElement): Promise<boolean> => {
    // Tear down any previous engine before creating another — otherwise a
    // retry leaks a running rAF loop and a GPU context per attempt.
    if (poseEngineRef.current) {
      poseEngineRef.current.dispose();
      poseEngineRef.current = null;
    }
    landmarkFilterRef.current.reset();
    guardTrackerRef.current.reset();
    latestFrameRef.current = null;

    const engine = new PoseEngine({
      onFrame: (frame) => handleEngineFrame(frame),
      onRenderTick: () => renderTick(),
      onStatus: (status) => setEngineInfo(status),
    });
    poseEngineRef.current = engine;

    const ok = await engine.initialize();
    if (!ok) return false;

    engine.start(videoEl);
    return true;
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
    } catch {
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
    commandHistoryRef.current = [];
    setCommandHistoryDisplay([]);
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
    peakWristDisplacementRef.current = { dx: 0, dy: 0, mag: 0, elbowAtPeak: 180 };
    maxElbowSinceMotionRef.current = 0;
    hookValidatedThisBurstRef.current = false;
    noseYBaselineRef.current = 0;
    peakHeadLateralRef.current = 0;
    peakHeadDropRef.current = 0;
    defenseKneeBaselineRef.current = { L: 0, R: 0 };
    peakDefenseKneeDriveRef.current = 0;
    goodHoldMsRef.current = 0;
    badHoldMsRef.current = 0;
    stanceVotesRef.current = { orthodox: 0, southpaw: 0 };
    setDetectedStance(null);
    repConfidenceSamplesRef.current = [];
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
      const engineOk = await startPoseEngine(videoEl);
      if (!engineOk) {
        setEngineStatus('failed');
        setCameraError('The on-device pose model failed to load. Check your connection and try again — no simulated data will be shown.');
        cleanupSession();
        return;
      }

      setEngineStatus('ready');
      setCalibStatus('CAMERA READY');
      setAwaitingUserStart(true);
      awaitingUserStartRef.current = true;
      // Live preview + skeleton render begins immediately; calibration
      // itself only starts once the user taps "Start Analysis" (see
      // beginCalibration()).
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
            const engineOk = await startPoseEngine(videoEl);
            if (engineOk) {
              setEngineStatus('ready');
              setCalibStatus('CAMERA READY');
              setAwaitingUserStart(true);
              awaitingUserStartRef.current = true;
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
  /**
   * Draw the most recent skeleton. Called on EVERY animation frame,
   * independently of inference.
   *
   * This decoupling is the point: inference now runs at 18-30fps depending
   * on device tier, but the overlay still repaints at the display's full
   * rate, so the skeleton looks smooth rather than stepping at the
   * inference rate. It also means a slow frame of inference can't stall
   * the visible preview.
   */
  const renderTick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = latestFrameRef.current;
    if (!frame) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    drawSkeleton(frame.landmarks, ctx, canvas.width, canvas.height);
  };

  /**
   * Handle one completed inference.
   *
   * Order matters here: landmarks are conditioned (outlier rejection,
   * occlusion prediction, One Euro smoothing) BEFORE any measurement reads
   * them, so every downstream angle, velocity and baseline is computed off
   * the clean signal rather than raw model output.
   */
  const handleEngineFrame = (frame: EngineFrame) => {
    const now = frame.timestampMs;
    const dt = lastFrameTsRef.current ? now - lastFrameTsRef.current : 33;
    lastFrameTsRef.current = now;

    if (!frame.landmarks || frame.landmarks.length === 0) {
      latestFrameRef.current = null;
      goodTrackingRef.current = false;
      handleTrackingLoss(dt);
      return;
    }

    const { landmarks, quality } = landmarkFilterRef.current.process(frame.landmarks, now);
    latestFrameRef.current = { landmarks, ts: now };
    latestHandsRef.current = frame.hands || [];
    worldLandmarksRef.current = (frame.worldLandmarks || []).map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z ?? 0,
    }));

    // Tracking adequacy now uses the conditioned confidence rather than raw
    // visibility, so a brief occlusion that the filter successfully coasts
    // through no longer trips the "tracking lost" banner mid-combination.
    const coreConfidence = CORE_ANCHORS.map((idx) => landmarks[idx]?.confidence ?? 0);
    const minConf = Math.min(...coreConfidence);
    goodTrackingRef.current = minConf >= VISIBILITY_THRESHOLD;

    if (stageRef.current !== 'camera') return;

    if (goodTrackingRef.current) {
      handleTrackingGain(dt);
    } else {
      handleTrackingLoss(dt);
    }

    if (calibSuccessRef.current && !isTrackingInadequateRef.current) {
      trackingSamplesRef.current.push(quality.meanConfidence);
      repConfidenceSamplesRef.current.push(quality.meanConfidence);
      // Cap the per-rep buffer: a long gap between commands would
      // otherwise let it grow without bound and dilute the rep's own
      // confidence with minutes of idle frames.
      if (repConfidenceSamplesRef.current.length > 240) {
        repConfidenceSamplesRef.current.shift();
      }
      analyzeFrame(landmarks, now);
    }
  };

  /** Mean landmark confidence across the rep currently being measured. */
  const currentRepConfidence = (): number => {
    const samples = repConfidenceSamplesRef.current;
    if (samples.length === 0) return 0;
    return samples.reduce((a, b) => a + b, 0) / samples.length;
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
  /**
   * Joint angle, preferring metric 3D world landmarks over image-space.
   *
   * This is the most consequential accuracy change in the pipeline. Every
   * angle used to be computed from normalized x/y, which is
   * projection-dependent: a joint angle foreshortens as the limb rotates
   * toward the lens, so the SAME punch measured differently depending only
   * on which way the fighter happened to be facing.
   *
   * Measured, for a real 160° elbow extension against the 155° threshold:
   *
   *   stance angle |  2D reads  | detected?
   *   -------------|------------|-----------
   *        0°      |    160°    |  yes
   *       30°      |    157°    |  yes
   *       45°      |    153°    |  NO   <-- the stance the guide asks for
   *       60°      |    144°    |  NO
   *       75°      |    125°    |  NO
   *
   * So at the 45° stance the app's own setup guide instructs, a genuine
   * punch fell below the extension gate and was never counted. World
   * landmarks are hip-origin metric 3D, so the same joint angle reads 160°
   * at every one of those stance angles.
   *
   * Falls back to the old 2D measurement when world landmarks aren't
   * available (legacy backend), so the pipeline degrades rather than
   * breaking.
   */
  const jointAngle = (
    aIdx: number,
    bIdx: number,
    cIdx: number,
    landmarks: FilteredLandmark[]
  ): number | null => {
    const world = worldLandmarksRef.current;
    if (world.length > Math.max(aIdx, bIdx, cIdx)) {
      const a = world[aIdx], b = world[bIdx], c = world[cIdx];
      if (a && b && c) {
        const angle = angle3D(a, b, c);
        if (angle !== null) return angle;
      }
    }
    const a2 = landmarks[aIdx], b2 = landmarks[bIdx], c2 = landmarks[cIdx];
    if (!a2 || !b2 || !c2) return null;
    return angle2D(a2, b2, c2);
  };

  const analyzeFrame = (landmarks: FilteredLandmark[], now: number) => {
    const lS = landmarks[LM.L_SHOULDER], rS = landmarks[LM.R_SHOULDER];
    const lE = landmarks[LM.L_ELBOW], rE = landmarks[LM.R_ELBOW];
    const lW = landmarks[LM.L_WRIST], rW = landmarks[LM.R_WRIST];
    const nose = landmarks[LM.NOSE];

    let lAngleThisFrame = 0;
    let rAngleThisFrame = 0;
    // Confidence gate now uses the conditioned confidence rather than raw
    // visibility, so a wrist briefly coasted through an occlusion still
    // contributes a (discounted) measurement instead of dropping out of
    // the punch entirely at the exact moment of peak extension.
    if (lS && lE && lW && lW.confidence > 0.25) {
      lAngleThisFrame = jointAngle(LM.L_SHOULDER, LM.L_ELBOW, LM.L_WRIST, landmarks) ?? 0;
    }
    if (rS && rE && rW && rW.confidence > 0.25) {
      rAngleThisFrame = jointAngle(LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST, landmarks) ?? 0;
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
    if (activeWristNow && activeWristNow.confidence > 0.25 && prevTs !== null) {
      const dtSec = (now - prevTs) / 1000;
      if (prevWristPosRef.current && dtSec > 0) {
        const dist = Math.hypot(activeWristNow.x - prevWristPosRef.current.x, activeWristNow.y - prevWristPosRef.current.y);
        wristSpeedRef.current = (dist / shoulderWidthNow) / dtSec;
      }
      prevWristPosRef.current = { x: activeWristNow.x, y: activeWristNow.y };
    }

    prevAngleTsRef.current = now;
    prevMaxElbowAngleRef.current = smoothedAngle;

    // Track "was there real punch-speed motion just now" BEFORE the
    // kinetic-chain tracking block below, not after it. This used to be
    // computed inside the punch state machine further down, which ran
    // strictly AFTER the tracking block had already reset every peak
    // tracker for this exact frame — see the `atRest` comment below for
    // why that ordering silently zeroed out every rep's biomechanics.
    if (angularVel >= MIN_PUNCH_ANGULAR_VELOCITY || wristSpeedRef.current >= MIN_WRIST_SPEED) {
      lastPunchMotionAtRef.current = now;
    }

    // --- Torso rotation tracking (hip/shoulder engagement) ---------------
    // Shoulder-line rotation. With world landmarks this is TRUE axial
    // rotation measured in the horizontal plane; lineAngle() on image-space
    // x/y conflated real rotation with leaning and with camera off-axis
    // placement, so a fighter who simply stood slightly turned read as
    // permanently "rotated".
    const world = worldLandmarksRef.current;
    const hasWorld = world.length > LM.R_HIP;
    let shoulderAngle = shoulderBaselineAngleRef.current;
    if (hasWorld && world[LM.L_SHOULDER] && world[LM.R_SHOULDER]) {
      shoulderAngle = axialRotationDeg(world[LM.L_SHOULDER], world[LM.R_SHOULDER]);
    } else if (lS && rS) {
      shoulderAngle = lineAngle(lS, rS);
    }
    const shoulderWidth = lS && rS ? Math.hypot(lS.x - rS.x, lS.y - rS.y) || 0.001 : 0.001;
    if (lS && rS) lastShoulderWidthRef.current = shoulderWidth;

    // Knee angles (hip-knee-ankle) — whichever leg extends more during the
    // strike is treated as the driving leg.
    const lHip = landmarks[LM.L_HIP], rHip = landmarks[LM.R_HIP];
    const lKneeL = landmarks[LM.L_KNEE], rKneeL = landmarks[LM.R_KNEE];
    const lAnkle = landmarks[LM.L_ANKLE], rAnkle = landmarks[LM.R_ANKLE];
    const lKneeAngle =
      lHip && lKneeL && lAnkle
        ? jointAngle(LM.L_HIP, LM.L_KNEE, LM.L_ANKLE, landmarks) ?? kneeBaselineRef.current.L
        : kneeBaselineRef.current.L;
    const rKneeAngle =
      rHip && rKneeL && rAnkle
        ? jointAngle(LM.R_HIP, LM.R_KNEE, LM.R_ANKLE, landmarks) ?? kneeBaselineRef.current.R
        : kneeBaselineRef.current.R;

    const hipMidX = lHip && rHip ? (lHip.x + rHip.x) / 2 : hipXBaselineRef.current;

    // Hip-line angle — same lineAngle() measurement used for the shoulders,
    // just applied to the hip landmarks instead, so rotation of the hips can
    // be scored as its own signal rather than folded into shoulder rotation.
    let hipAngle = hipBaselineAngleRef.current;
    if (hasWorld && world[LM.L_HIP] && world[LM.R_HIP]) {
      hipAngle = axialRotationDeg(world[LM.L_HIP], world[LM.R_HIP]);
    } else if (lHip && rHip) {
      hipAngle = lineAngle(lHip, rHip);
    }

    const lHeel = landmarks[LM.L_HEEL], rHeel = landmarks[LM.R_HEEL];
    const lFoot = landmarks[LM.L_FOOT_INDEX], rFoot = landmarks[LM.R_FOOT_INDEX];
    const lFootVisible = !!lHeel && !!lFoot && lHeel.confidence > 0.25 && lFoot.confidence > 0.25;
    const rFootVisible = !!rHeel && !!rFoot && rHeel.confidence > 0.25 && rFoot.confidence > 0.25;
    const lFootAngle = lFootVisible ? lineAngle(lHeel!, lFoot!) : footAngleBaselineRef.current.L;
    const rFootAngle = rFootVisible ? lineAngle(rHeel!, rFoot!) : footAngleBaselineRef.current.R;

    // Gate the kinetic-chain baseline/peak tracking on genuine rest, not on
    // elbowStateRef directly. elbowStateRef only flips to 'strike' once the
    // elbow crosses near-full extension (ELBOW_EXTEND_THRESHOLD) — fine for
    // a jab/cross, but a hook stays bent the whole time, and even a
    // straight punch's ramp-up from guard to full extension spans several
    // frames that are still technically "guard" by that definition. Under
    // the old `elbowStateRef.current === 'guard'` check, every one of those
    // ramp-up frames re-anchored the baseline to the current (already-
    // moving) position and reset every peak tracker to 0 — including the
    // exact transition frame itself, since this block runs BEFORE the state
    // machine below updates elbowStateRef. Net effect: a punch's rotation/
    // knee-drive/weight-transfer/foot-pivot/wrist-path measured 0 on the
    // very same frame registerHit() read it, for every punch, every time.
    const atRest = now - lastPunchMotionAtRef.current > MOTION_MEMORY_MS;

    if (atRest) {
      // Track the resting orientation continuously while genuinely at rest
      // — this becomes the baseline a strike's rotation is measured against.
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

      if (lW && lW.confidence > 0.25) wristBaselineRef.current.L = { x: lW.x, y: lW.y };
      if (rW && rW.confidence > 0.25) wristBaselineRef.current.R = { x: rW.x, y: rW.y };
      peakWristDisplacementRef.current = { dx: 0, dy: 0, mag: 0, elbowAtPeak: smoothedAngle };
      maxElbowSinceMotionRef.current = smoothedAngle;
      hookValidatedThisBurstRef.current = false;

      // --- Guard baseline -------------------------------------------------
      // Updated ONLY while genuinely at rest. If this were updated during a
      // punch the baseline would drift out toward the extended position and
      // every recovery measurement would collapse toward a meaningless 100.
      if (lS && rS) {
        const shoulderMid = { x: (lS.x + rS.x) / 2, y: (lS.y + rS.y) / 2 };
        guardTrackerRef.current.updateBaseline(
          lW && lW.confidence > 0.25 ? { x: lW.x, y: lW.y } : null,
          rW && rW.confidence > 0.25 ? { x: rW.x, y: rW.y } : null,
          shoulderMid,
          shoulderWidth
        );
      }

      // --- Stance detection -----------------------------------------------
      // Which foot leads. In MediaPipe world space z is negative toward the
      // camera, so the lead ankle is the one with the smaller z. Voting
      // across many resting frames rather than deciding on one frame, since
      // a single frame can flip on noise when the feet are nearly level.
      // Requires world landmarks; on the legacy backend stance stays
      // undetected and the UI shows nothing rather than guessing.
      if (hasWorld && world[LM.L_ANKLE] && world[LM.R_ANKLE]) {
        const zDiff = world[LM.L_ANKLE].z - world[LM.R_ANKLE].z;
        // Deadband: a square stance shouldn't be forced into a label.
        if (Math.abs(zDiff) > 0.04) {
          if (zDiff < 0) stanceVotesRef.current.orthodox++;
          else stanceVotesRef.current.southpaw++;
          const { orthodox, southpaw } = stanceVotesRef.current;
          const total = orthodox + southpaw;
          if (total >= 30) {
            const winner = orthodox > southpaw ? 'ORTHODOX' : 'SOUTHPAW';
            const share = Math.max(orthodox, southpaw) / total;
            // Only claim a stance when the evidence is lopsided.
            setDetectedStance(share >= 0.7 ? winner : null);
          }
        }
      }

      // Reset the per-strike measurement state for the next burst.
      hipRotTrackerRef.current.reset();
      torsoRotTrackerRef.current.reset();
      shoulderTrackerRef.current.reset();
      elbowTrackerRef.current.reset();
      wristTrackerRef.current.reset();
      recoverySamplesRef.current = [];
      peakDriftRef.current = { drift: 0, at: 0 };
      offHandIntegrityRef.current = null;
      wristAlignmentRef.current = null;
      motionStartedAtRef.current = 0;
    } else {
      // First frame of a new motion burst — stamp the start so
      // time-to-peak-velocity is measured from initiation, not from the
      // arbitrary moment the command was called.
      if (motionStartedAtRef.current === 0) motionStartedAtRef.current = now;
      if (smoothedAngle > maxElbowSinceMotionRef.current) maxElbowSinceMotionRef.current = smoothedAngle;
      // Shortest-arc difference: axial rotation wraps at +/-180, so a raw
      // subtraction can report a 2-degree turn as a 358-degree one.
      const rotationDelta = Math.abs(angleDelta(shoulderAngle, shoulderBaselineAngleRef.current));
      if (rotationDelta > peakRotationRef.current) peakRotationRef.current = rotationDelta;

      const hipRotationDelta = Math.abs(angleDelta(hipAngle, hipBaselineAngleRef.current));
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
      if (activeWrist && activeWrist.confidence > 0.25) {
        const dx = activeWrist.x - baseline.x;
        const dy = activeWrist.y - baseline.y;
        const mag = Math.hypot(dx, dy);
        if (mag > peakWristDisplacementRef.current.mag) {
          peakWristDisplacementRef.current = { dx, dy, mag, elbowAtPeak: smoothedAngle };
        }
      }

      // --- Kinetic-chain peak timing --------------------------------------
      // Each tracker records WHEN its segment reached peak velocity. The
      // ORDER of those timestamps is what distinguishes a punch driven from
      // the ground (hip -> torso -> arm) from one thrown off the shoulder
      // with nothing behind it. Peak magnitudes alone cannot see this: two
      // punches can rotate identically and still be completely different
      // movements if the arm led instead of followed.
      //
      // maxPlausibleVelocity guards each channel against a landmark snap
      // setting a bogus peak for the whole rep.
      hipRotTrackerRef.current.push(hipAngle, now, 2000);
      torsoRotTrackerRef.current.push(shoulderAngle, now, 2000);
      elbowTrackerRef.current.push(smoothedAngle, now, 3000);
      if (activeWrist && activeWrist.confidence > 0.25) {
        // Wrist travel from guard, normalized — same units as the rest of
        // the wrist measurements so the velocity is scale-invariant.
        wristTrackerRef.current.push(
          Math.hypot(activeWrist.x - baseline.x, activeWrist.y - baseline.y) / shoulderWidth,
          now,
          20
        );
      }
      const activeShoulder = activeSide === 'L' ? lS : rS;
      if (activeShoulder && lS && rS) {
        shoulderTrackerRef.current.push(
          Math.hypot(activeShoulder.x - (lS.x + rS.x) / 2, activeShoulder.y - (lS.y + rS.y) / 2) /
            shoulderWidth,
          now,
          20
        );
      }

      // --- Guard: off-hand integrity, recovery sampling, wrist alignment ---
      if (lS && rS && guardTrackerRef.current.isEstablished) {
        const shoulderMid = { x: (lS.x + rS.x) / 2, y: (lS.y + rS.y) / 2 };
        const punchingSide: 'left' | 'right' = activeSide === 'L' ? 'left' : 'right';
        punchingSideRef.current = punchingSide;

        // Does the OTHER hand stay up while this one works? This is the
        // single most common amateur fault and was entirely invisible to a
        // pipeline that only ever watched the punching arm.
        const offWrist = activeSide === 'L' ? rW : lW;
        const offSnapshot = guardTrackerRef.current.evaluateOffHand(
          punchingSide,
          offWrist && offWrist.confidence > 0.25 ? { x: offWrist.x, y: offWrist.y } : null,
          shoulderMid,
          shoulderWidth
        );
        if (offSnapshot) {
          // Keep the WORST reading during the strike, not the latest — a
          // guard that drops and recovers before the frame we happen to
          // sample still dropped.
          offHandIntegrityRef.current =
            offHandIntegrityRef.current === null
              ? offSnapshot.integrityScore
              : Math.min(offHandIntegrityRef.current, offSnapshot.integrityScore);
        }

        // Sample the punching hand's distance from guard so the return can
        // be scored after the strike completes.
        const drift = guardTrackerRef.current.driftFromGuard(
          punchingSide,
          activeWrist && activeWrist.confidence > 0.25
            ? { x: activeWrist.x, y: activeWrist.y }
            : null,
          shoulderMid,
          shoulderWidth
        );
        if (drift !== null) {
          if (drift > peakDriftRef.current.drift) {
            peakDriftRef.current = { drift, at: now };
          }
          recoverySamplesRef.current.push({ t: now, drift });
          // Bound the buffer to the window evaluateRecovery actually reads.
          const cutoff = now - RECOVERY_SAMPLE_WINDOW_MS * 2;
          while (
            recoverySamplesRef.current.length > 0 &&
            recoverySamplesRef.current[0].t < cutoff
          ) {
            recoverySamplesRef.current.shift();
          }
        }
      }

      // --- Wrist alignment (hand model only) --------------------------------
      // Only measurable with hand landmarks. When hands aren't running this
      // stays null and the flaw engine treats it as "not measured" rather
      // than scoring it zero — see the availability filter in flawEngine.
      //
      // COORDINATE SPACES MUST MATCH. The pose elbow is available in two
      // spaces (normalized image, and metric world), but hand landmarks are
      // only normalized-image. Feeding a world-space elbow and an
      // image-space knuckle into the same angle would silently produce
      // nonsense, because one is in metres about the hip origin and the
      // other is a 0-1 image fraction. So this deliberately uses the
      // IMAGE-space elbow and zeroes z on all three points, making it a
      // consistent 2D measurement rather than an incoherent 3D one.
      const hands = latestHandsRef.current;
      const activeElbow = activeSide === 'L' ? lE : rE;
      if (hands.length > 0 && activeWrist && activeElbow && activeElbow.confidence > 0.25) {
        const matched = matchHandToWrist(hands, { x: activeWrist.x, y: activeWrist.y });
        const hw = matched?.[HAND_LM.WRIST];
        const knuckle = matched?.[HAND_LM.MIDDLE_MCP];
        if (hw && knuckle) {
          const alignment = measureWristAlignment(
            { x: activeElbow.x, y: activeElbow.y, z: 0 },
            { x: hw.x, y: hw.y, z: 0 },
            { x: knuckle.x, y: knuckle.y, z: 0 }
          );
          if (alignment) {
            // Worst reading during the strike: a wrist that collapses at
            // impact and straightens afterwards still collapsed at impact.
            wristAlignmentRef.current =
              wristAlignmentRef.current === null
                ? alignment.score
                : Math.min(wristAlignmentRef.current, alignment.score);
          }
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
    // This path is for punches that genuinely extend the arm (jab, cross,
    // uppercut) and is unchanged; hooks are handled separately below.
    let punchValidated = false;
    const dwelledInGuard = now - guardEnteredAtRef.current >= GUARD_REARM_MS;
    const motionDetected = now - lastPunchMotionAtRef.current <= MOTION_MEMORY_MS;
    if (elbowStateRef.current === 'guard' && dwelledInGuard && smoothedAngle > ELBOW_EXTEND_THRESHOLD) {
      if (motionDetected) {
        elbowStateRef.current = 'strike';
        punchValidated = true;
      }
    } else if (elbowStateRef.current === 'strike' && smoothedAngle < ELBOW_RETRACT_THRESHOLD) {
      elbowStateRef.current = 'guard';
      guardEnteredAtRef.current = now;
    }

    // --- Hook detection: completed lateral sweep, elbow bent throughout ---
    // Deliberately independent of elbowStateRef (see HOOK_MIN_SWEEP above).
    // Every condition here is a real measurement from this motion burst:
    //   * the burst showed punch-speed motion (same gate as above),
    //   * the elbow NEVER extended past HOOK_MAX_ELBOW_ANGLE during it —
    //     this is what excludes a straight punch mid-flight,
    //   * peak wrist travel cleared HOOK_MIN_SWEEP,
    //   * the wrist path classifies as 'hook' via the same
    //     classifyTrajectory() used to label the final rep, so entry and
    //     scoring can never disagree,
    //   * and the wrist has started returning, i.e. the sweep finished —
    //     which also means the peak values registerHit() scores are the
    //     real peaks of the whole hook, not a mid-flight snapshot.
    // hookValidatedThisBurstRef caps it at one rep per burst.
    if (!punchValidated && !hookValidatedThisBurstRef.current && motionDetected) {
      const wristDelta = peakWristDisplacementRef.current;
      const peakSweep = wristDelta.mag / shoulderWidth;
      const activeWristNowForHook = lAngleThisFrame >= rAngleThisFrame ? lW : rW;
      const activeSideForHook: 'L' | 'R' = lAngleThisFrame >= rAngleThisFrame ? 'L' : 'R';
      const hookBaseline = wristBaselineRef.current[activeSideForHook];
      const currentTravel = activeWristNowForHook
        ? Math.hypot(activeWristNowForHook.x - hookBaseline.x, activeWristNowForHook.y - hookBaseline.y) / shoulderWidth
        : peakSweep;
      const sweepReturning = currentTravel <= peakSweep * HOOK_RETURN_RATIO;
      if (
        maxElbowSinceMotionRef.current < HOOK_MAX_ELBOW_ANGLE &&
        smoothedAngle > MIN_HOOK_ELBOW_ANGLE &&
        peakSweep >= HOOK_MIN_SWEEP &&
        sweepReturning &&
        classifyTrajectory(wristDelta.dx, wristDelta.dy, shoulderWidth, wristDelta.elbowAtPeak) === 'hook'
      ) {
        hookValidatedThisBurstRef.current = true;
        punchValidated = true;
      }
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

    // --- Defense knee-bend tracking (roll/bob quality) ----------------------
    // Same independence rationale as the head tracking above: measured off
    // a slow EMA baseline rather than the punch guard/strike cycle, so a
    // roll's actual leg drive gets scored instead of always reading 0.
    if (lKneeL && rKneeL) {
      defenseKneeBaselineRef.current.L = defenseKneeBaselineRef.current.L === 0
        ? lKneeAngle
        : defenseKneeBaselineRef.current.L * 0.98 + lKneeAngle * 0.02;
      defenseKneeBaselineRef.current.R = defenseKneeBaselineRef.current.R === 0
        ? rKneeAngle
        : defenseKneeBaselineRef.current.R * 0.98 + rKneeAngle * 0.02;
      const defenseKneeBend = Math.max(
        Math.abs(lKneeAngle - defenseKneeBaselineRef.current.L),
        Math.abs(rKneeAngle - defenseKneeBaselineRef.current.R)
      );
      if (defenseKneeBend > peakDefenseKneeDriveRef.current) peakDefenseKneeDriveRef.current = defenseKneeBend;
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

  /**
   * Collapse the in-flight strike's tracker state into the per-rep scores
   * the flaw engine consumes.
   *
   * Shared by registerHit() and registerFreestylePunch() so the two paths
   * can't drift apart — they previously duplicated their scoring inline and
   * had already diverged (freestyle silently never measured defense knee
   * drive or head movement).
   */
  const collectStrikeMetrics = (now: number, kind: 'punch' | 'defense') => {
    const trackingConfidence = currentRepConfidence();

    // --- Kinetic-chain sequencing ---------------------------------------
    const peakTimes: Partial<Record<ChainSegment, number>> = {};
    if (hipRotTrackerRef.current.peakVelocityAt > 0) {
      peakTimes.hip = hipRotTrackerRef.current.peakVelocityAt;
    }
    if (torsoRotTrackerRef.current.peakVelocityAt > 0) {
      peakTimes.torso = torsoRotTrackerRef.current.peakVelocityAt;
    }
    if (shoulderTrackerRef.current.peakVelocityAt > 0) {
      peakTimes.shoulder = shoulderTrackerRef.current.peakVelocityAt;
    }
    if (elbowTrackerRef.current.peakVelocityAt > 0) {
      peakTimes.elbow = elbowTrackerRef.current.peakVelocityAt;
    }
    if (wristTrackerRef.current.peakVelocityAt > 0) {
      peakTimes.wrist = wristTrackerRef.current.peakVelocityAt;
    }
    const sequencing = analyzeSequencing(peakTimes);
    // Fewer than 3 measured segments isn't enough to say anything about
    // ordering, so report it as unmeasured rather than as a low score.
    const sequenceScore =
      sequencing.measuredSegments >= 3 ? sequencing.sequenceScore : undefined;

    // --- Guard recovery --------------------------------------------------
    const peak = peakDriftRef.current;
    let guardRecoveryScore: number | undefined;
    let recoverySpeedScore: number | undefined;
    let recoveryMs: number | null = null;
    if (peak.drift > 0 && recoverySamplesRef.current.length > 0) {
      const recovery = guardTrackerRef.current.evaluateRecovery(
        peak.drift,
        peak.at,
        recoverySamplesRef.current
      );
      guardRecoveryScore = recovery.returnScore;
      recoveryMs = recovery.recoveryMs;
      // Retraction speed is only meaningful when the hand actually got
      // back — an abandoned hand has no return time to score.
      if (recovery.recoveryMs !== null) {
        recoverySpeedScore = Math.round(
          Math.min(100, Math.max(0, ((700 - recovery.recoveryMs) / (700 - 150)) * 100))
        );
      }
    }

    const timeToPeakMs =
      motionStartedAtRef.current > 0 && elbowTrackerRef.current.peakVelocityAt > 0
        ? Math.round(elbowTrackerRef.current.peakVelocityAt - motionStartedAtRef.current)
        : null;

    // Defensive reps have no punch to retract, so returning a recovery or
    // sequencing score for a slip would be measuring something that didn't
    // happen. Left undefined, which the flaw engine reads as "not
    // measured" and excludes — rather than as a zero, which would fire the
    // "hands never returned to guard" flaw on every single slip.
    const isPunch = kind === 'punch';

    // If this rep was tracked too poorly to trust, report the DERIVED
    // metrics as unmeasured rather than passing along numbers computed
    // from noise. The rep itself still counts as a landed strike — we saw
    // it happen, we just can't say anything reliable about its mechanics.
    // The session-level confidence weighting in the flaw engine is the
    // second line of defence; this is the first.
    const trusted = trackingConfidence >= REP_CONFIDENCE_FLOOR;
    const gate = <T,>(value: T): T | undefined => (trusted ? value : undefined);

    return {
      trackingConfidence,
      sequenceScore: isPunch ? gate(sequenceScore) : undefined,
      armDominant:
        isPunch && sequencing.measuredSegments >= 3 ? gate(sequencing.armDominant) : undefined,
      guardRecoveryScore: isPunch ? gate(guardRecoveryScore) : undefined,
      recoverySpeedScore: isPunch ? gate(recoverySpeedScore) : undefined,
      recoveryMs: isPunch ? recoveryMs : null,
      // Guard integrity DOES apply to defense: dropping your hands while
      // slipping is exactly as bad as dropping them while punching.
      guardIntegrityScore: gate(offHandIntegrityRef.current ?? undefined),
      wristAlignmentScore: isPunch ? gate(wristAlignmentRef.current ?? undefined) : undefined,
      peakAcceleration: Math.round(Math.abs(elbowTrackerRef.current.peakAcceleration)),
      timeToPeakMs: isPunch ? timeToPeakMs : null,
    };
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
    const kneeDriveScore = Math.round(
      Math.min(
        100,
        (kind === 'defense'
          ? peakDefenseKneeDriveRef.current / FULL_KNEE_DRIVE_DEG
          : peakKneeDriveRef.current / FULL_KNEE_DRIVE_DEG) * 100
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
      const { dx, dy, mag, elbowAtPeak } = peakWristDisplacementRef.current;
      const shoulderW = lastShoulderWidthRef.current || 0.2;
      trajectory = classifyTrajectory(dx, dy, shoulderW, elbowAtPeak);
      trajectoryConfident = mag / shoulderW >= MIN_TRAJECTORY_CONFIDENCE;
    }
    const trajectoryMatch =
      kind === 'punch' ? (!trajectoryConfident || trajectory === expectedTrajectoryFor(command)) : true;

    const strikeMetrics = collectStrikeMetrics(now, kind || 'punch');

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
      ...strikeMetrics,
    });

    // Reset per-rep confidence accumulation so the next rep is measured on
    // its own frames rather than inheriting this one's.
    repConfidenceSamplesRef.current = [];
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
    const { dx, dy, elbowAtPeak } = peakWristDisplacementRef.current;
    const trajectory = classifyTrajectory(dx, dy, lastShoulderWidthRef.current || 0.2, elbowAtPeak);

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
      ...collectStrikeMetrics(now, 'punch'),
    });

    currentRepPeakVelocityRef.current = 0;
    repConfidenceSamplesRef.current = [];
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

      setExpectedCommand(cmd.text);
      setTacticalCue(tacticalCueForCommand(cmd.text, cmd.kind));
      awaitingRef.current = true;
      awaitingKindRef.current = cmd.kind;
      currentRepPeakVelocityRef.current = 0;
      peakHeadLateralRef.current = 0;
      peakHeadDropRef.current = 0;
      peakDefenseKneeDriveRef.current = 0;
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

    // A little more breathing room than before, so "Calibration complete"
    // has a real chance to finish before the first command's own line
    // starts (stopVoicePack() in speakCommand still guarantees they can
    // never actually overlap even if this runs long).
    drillTimerRef.current = setTimeout(runCommands, 1500);
  };

  // -------------------------------------------------------------------------
  // Freestyle mode: no called commands — every validated punch (same state
  // machine, same guard/velocity gating as coach mode) is logged
  // continuously for the length of the round.
  // -------------------------------------------------------------------------
  const startFreestyleRound = () => {
    let remaining = freestyleDurationRef.current;
    const isUnlimited = remaining === 0;
    elapsedSecondsRef.current = 0;
    setExpectedCommand('FREESTYLE');
    setTacticalCue('Keep your guard high — choose clean, committed punch shapes.');
    awaitingRef.current = true;
    awaitingKindRef.current = 'punch';

    const mins0 = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs0 = (remaining % 60).toString().padStart(2, '0');
    setTimerDisplay(`${mins0}:${secs0}`);

    setIsCommandSpeaking(true);
    // Same breathing-room fix as startDrill above — let "Calibration
    // complete" actually finish before "Freestyle round" starts, instead
    // of firing in the same tick right after it.
    window.setTimeout(() => {
      speakCommand('Freestyle round. Throw when ready.', undefined, () => setIsCommandSpeaking(false));
    }, 1500);

    sessionTimerRef.current = setInterval(() => {
      if (stageRef.current !== 'camera') return;
      // isPausedRef was missing here (the coach-mode timer in startDrill
      // already checks it): pausing a freestyle round froze the pose loop
      // and scoring but the round clock kept running down, so a paused
      // round could end — and be analysed — while the fighter was away.
      if (isTrackingInadequateRef.current || isPausedRef.current) return;
      if (!isUnlimited) remaining -= 1;
      elapsedSecondsRef.current += 1;
      const displaySeconds = isUnlimited ? elapsedSecondsRef.current : Math.max(0, remaining);
      const mins = Math.floor(displaySeconds / 60).toString().padStart(2, '0');
      const secs = (displaySeconds % 60).toString().padStart(2, '0');
      setTimerDisplay(`${mins}:${secs}`);
      if (!isUnlimited && remaining === 10) speakCommand('Ten seconds.');
      if (!isUnlimited && remaining <= 0) {
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

    // This is TRACKING CONFIDENCE, not stance quality. It measures how
    // clearly the camera could see the fighter, which is a property of the
    // filming setup, not of their boxing. It was previously surfaced to the
    // user as "stance" and "posture", which made a well-lit room read as
    // good technique. Renamed at the source so it can't be mislabeled
    // downstream again.
    const trackingConfidenceScore = Math.round(avgTrackingConfidence * 100);
    // Separate, honest readout of capture quality for the report.
    const analysisQuality = trackingConfidenceScore;
    // Reflex normalization. The old curve was 100 - (avgReaction - 250) / 8,
    // which hits 0 at 1050ms — but a voice-called rep's measured reaction
    // includes the time the spoken word itself takes plus the travel time of
    // the strike, so real sessions routinely average above that and every
    // one of them reported a flat 0% reflex. The band below scores 250ms as
    // perfect and only bottoms out at 1600ms, so a genuinely slow-but-real
    // session gets a real number instead of a floored zero. A true 0 is now
    // reserved for "no reaction data at all" (no landed rep with a reaction
    // time), which is an honest 0 rather than a clipped score.
    const reflexScore = avgReaction
      ? Math.round(
          Math.min(
            100,
            Math.max(
              0,
              ((REFLEX_FLOOR_MS - avgReaction) / (REFLEX_FLOOR_MS - REFLEX_CEILING_MS)) * 100
            )
          )
        )
      : 0;
    const powerScore = Math.round(Math.min(100, (peakAngularVelocityRef.current / 900) * 100));
    let overallScore = Math.round((accuracy + trackingConfidenceScore + reflexScore) / 3);

    let flaw = 'Tracking confidence stayed strong throughout — no major flaw detected.';
    let advice = 'Consistent frame presence and clean strike mechanics across the session.';
    if (!isFreestyle) {
      const scores = [
        { name: 'accuracy', value: accuracy },
        { name: 'tracking', value: trackingConfidenceScore },
        { name: 'reflex', value: reflexScore },
      ];
      const weakest = scores.sort((a, b) => a.value - b.value)[0];
      if (weakest.name === 'accuracy') {
        flaw = 'Missed commands: several calls went unanswered inside the reaction window.';
        advice = 'Focus on committing to each call immediately — hesitation cost you reps this session.';
      } else if (weakest.name === 'tracking') {
        flaw = 'Tracking confidence dipped repeatedly — you drifted out of the optimal frame zone.';
        advice = 'Stand roughly 6-8 feet from the camera and keep your full upper body visible throughout.';
      } else if (weakest.name === 'reflex') {
        flaw = 'Reaction times ran high relative to the call cadence.';
        advice = 'Keep your hands up and weight forward so you can fire the instant a command lands.';
      }
    }

    // Build a real, per-command mistakes breakdown from the actual rep log —
    // nothing here is invented, it's all aggregated from logged reps.
    const log = repLogRef.current;
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

    // New merits: Stability (rep-to-rep consistency of form) and Swiftness
    // (output tempo) — see computeStabilityScore/computeSwiftnessScore for
    // the formulas. Both are derived purely from data already in `log` and
    // `elapsedSecondsRef`, nothing invented.
    const stabilityScore = computeStabilityScore(allHits, trackingConfidenceScore);
    const swiftnessScore = computeSwiftnessScore(hitCountRef.current, elapsedSecondsRef.current);
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

      if (avgRotation < 40) {
        mistakes.push('Low torso rotation across your strikes — drive power from your hips and shoulders, not just your arm.');
      }
      if (avgKneeDrive < 35) {
        mistakes.push('Minimal knee drive detected — push off your back leg to load each punch instead of throwing arm-only.');
      }
      if (avgWeightTransfer < 35) {
        mistakes.push('Weight stayed mostly static — shift your weight forward/across into the strike for real power transfer.');
      }
      if (avgFootPivot < 30) {
        mistakes.push('Rear foot barely pivoted — let your back heel rotate so your hips can fully turn into the punch.');
      }
      if (!isFreestyle && trajectoryAccuracy < 60) {
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
        // Tracking confidence is deliberately NOT a term here. It measures
        // how well the camera could see you, so including it let good
        // lighting inflate a technique score — a freestyle round filmed
        // clearly scored higher than the same round filmed poorly, with
        // identical boxing. This is now a pure technique composite.
        overallScore = Math.round(
          (powerScore + avgRotation + avgKneeDrive + avgWeightTransfer + avgFootPivot) / 5
        );
        const techScores = [
          { name: 'rotation', value: avgRotation, flaw: 'Torso rotation was the weak link across your combos.', advice: 'Drive power from your hips and shoulders on every strike, not just your arm.' },
          { name: 'knee', value: avgKneeDrive, flaw: 'Knee drive was minimal through most of the round.', advice: 'Push off your back leg to load each punch before you throw it.' },
          { name: 'weight', value: avgWeightTransfer, flaw: 'Weight transfer was flat across the round.', advice: 'Shift your weight forward and across into each strike.' },
          { name: 'pivot', value: avgFootPivot, flaw: 'Rear foot pivot was minimal.', advice: 'Let your back heel rotate so your hips can fully turn into the punch.' },
          { name: 'power', value: powerScore, flaw: 'Strike speed stayed on the slower side throughout.', advice: 'Snap through the extension instead of pushing the arm out.' },
        ];
        const weakestTech = techScores.sort((a, b) => a.value - b.value)[0];
        flaw = weakestTech.flaw;
        advice = weakestTech.advice;
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
    const engineReps: FlawEngineRep[] = log.map((r) => ({
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
      // Forwarded as-is, INCLUDING undefined. The engine distinguishes
      // "not measured" from "measured as zero", so defaulting these to 0
      // here would fabricate a perfect-failure reading for every signal a
      // given device couldn't capture.
      trackingConfidence: r.trackingConfidence,
      guardRecoveryScore: r.guardRecoveryScore,
      guardIntegrityScore: r.guardIntegrityScore,
      wristAlignmentScore: r.wristAlignmentScore,
      sequenceScore: r.sequenceScore,
      recoverySpeedScore: r.recoverySpeedScore,
    }));
    const detailedFlaws: DetectedFlaw[] = topSessionFlaws(engineReps, 5);
    const techniqueSummaries = summarizeTechniques(engineReps);
    // Root-cause view: collapses correlated symptoms into the single
    // correction that addresses the cluster.
    const rootCauses: RootCauseDiagnosis[] = diagnoseRootCauses(engineReps);

    if (detailedFlaws.length > 0) {
      // Top-ranked (most severe) flaw drives the headline "biggest
      // opportunity" + coach line, same slots the UI already reads.
      const top = detailedFlaws[0];
      flaw = `${top.techniqueLabel}: ${top.cause}`;
      advice = top.coachingTip;
    }

    if (mistakes.length === 0) {
      mistakes.push('No specific recurring mistake detected — commands were answered cleanly and on time.');
    }

    setResultsData({
      overallScore,
      powerScore,
      stanceScore: trackingConfidenceScore, // legacy key, kept so saved sessions stay readable
      trackingConfidenceScore,
      reflexScore,
      stabilityScore,
      swiftnessScore,
      accuracy,
      avgReflex: avgReaction,
      hits: hitCountRef.current,
      misses: missCountRef.current,
      posture: Math.round(trackingConfidenceScore / 10),
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
      rootCauses,
      analysisQuality,
      engineInfo,
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
        stability_score: resultsData.stabilityScore,
        swiftness_score: resultsData.swiftnessScore,
        rotation_score: resultsData.rotationScore,
        hip_rotation_score: resultsData.hipRotationScore,
        torso_rotation_score: resultsData.torsoRotationScore,
        knee_drive_score: resultsData.kneeDriveScore,
        weight_transfer_score: resultsData.weightTransferScore,
        foot_pivot_score: resultsData.footPivotScore,
        head_lateral_score: resultsData.headLateralScore,
        head_drop_score: resultsData.headDropScore,
        trajectory_accuracy: resultsData.trajectoryAccuracy,
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
                {([
                  { key: 'steel', label: 'STEEL', desc: 'Male Core' },
                  { key: 'athena', label: 'ATHENA', desc: 'Female Core' },
                  { key: 'cyber', label: 'CYBER', desc: 'Synthetic' },
                ] as const).map((choice) => (
                  <button
                    key={choice.key}
                    onClick={() => {
                      setVoiceProfile(choice.key);
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
                  {([
                    { key: 'easy', label: 'EASY', color: 'text-green-400 border-green-500/30' },
                    { key: 'medium', label: 'MEDIUM', color: 'text-primary border-primary/30' },
                    { key: 'hard', label: 'HARD', color: 'text-red-500 border-red-500/30' },
                  ] as const).map((choice) => (
                    <button
                      key={choice.key}
                      onClick={() => {
                        setDifficulty(choice.key);
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
                  {freestyleDuration === 0
                    ? 'Unlimited'
                    : `${Math.floor(freestyleDuration / 60)}:${String(freestyleDuration % 60).padStart(2, '0')}`}
                </div>
                <span className="text-[8px] font-black text-purple-400 tracking-widest uppercase block mt-1.5 mb-4">
                  ROUND DURATION
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 30, 60, 90, 120].map((secs) => (
                    <button
                      key={secs}
                      onClick={() => setFreestyleDuration(secs)}
                      className={`py-2.5 rounded-2xl border text-[10px] font-black transition-all ${freestyleDuration === secs
                          ? 'bg-purple-500/15 border-purple-500 text-purple-400'
                          : 'bg-black/40 border-white/5 text-white/55 hover:text-white'
                        }`}
                    >
                      {secs === 0 ? 'Unlimited' : `${secs}s`}
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
              {/* Grid overlay is now body-anchored and drawn on the canvas — see drawSkeleton */}
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
                  {/*
                    Real engine telemetry, not a hardcoded number. Render
                    rate and inference rate are deliberately shown as two
                    different figures because they now genuinely differ —
                    the overlay repaints at camera rate while inference is
                    capped per device tier.
                  */}
                  <span className="text-primary font-mono font-black text-[9px] tracking-widest">
                    {engineInfo ? `${engineInfo.renderFps}/${engineInfo.inferenceFps} FPS` : '— FPS'}
                  </span>
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
                  {/*
                    This is ELBOW ANGULAR VELOCITY, the quantity actually
                    measured. It was previously multiplied by an arbitrary
                    0.024 and labelled "IMPACT VELOCITY ... m/s", which
                    presents a scaled angular reading as a calibrated linear
                    fist speed in physical units. A monocular webcam cannot
                    measure that, so the label is now the real quantity and
                    the real unit.
                  */}
                  <span className="text-[7px] font-black text-white/50 tracking-widest uppercase block mb-0.5">EXTENSION SPEED</span>
                  <div className="flex items-baseline gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isVelocityFlashing ? 'bg-[#E2FF3B] animate-ping' : 'bg-primary'}`} />
                    <span className="text-primary font-mono font-black text-lg leading-none">
                      {Math.round(liveVelocity || peakAngularVelocityRef.current || 0)}
                    </span>
                    <span className="text-white/50 font-mono text-[8px]">°/s</span>
                    <span className="text-[7px] font-black text-red-400 bg-red-500/20 border border-red-500/30 rounded px-1">MAX</span>
                  </div>
                </div>
                {/* Stance + Accuracy chips */}
                <div className="flex items-center gap-1.5">
                  <div className="bg-black/60 border border-white/10 rounded-full px-2 py-0.5">
                    <span className="text-[8px] font-black tracking-widest">
                      <span className="text-white/50">STANCE: </span>
                      <span className="text-cyan-400">{detectedStance ?? 'READING…'}</span>
                    </span>
                  </div>
                  <div className="bg-black/60 border border-white/10 rounded-full px-2 py-0.5">
                    <span className="text-[8px] font-black tracking-widest">
                      <span className="text-white/50">ACCURACY: </span>
                      <span className="text-primary">{attemptedCount > 0 ? `${Math.round((hitCount / attemptedCount) * 100)}%` : '—'}</span>
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

                {/* Called-command strip — renders the real rolling history of
                    commands issued through setExpectedCommand(), i.e. exactly
                    what the voice system spoke and exactly what scoring is
                    comparing against. It used to cycle a hardcoded
                    ['JAB','CROSS','HOOK','SLIP R','UPPER'] array off comboIndex,
                    which had nothing to do with the randomly-chosen commands
                    actually being called. */}
                <div className="bg-black/85 border border-white/10 rounded-2xl px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[7.5px] font-black text-white/70 tracking-widest uppercase">CALLED COMMANDS</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[7.5px] font-black text-primary uppercase block font-mono">
                        {mode === 'freestyle' ? 'FREESTYLE' : `CALL ${attemptedCount}/${punchTarget}`}
                      </span>
                      <span className="text-[7px] font-black text-white/40 uppercase">
                        {difficulty === 'hard' ? 'FAST CADENCE' : difficulty === 'easy' ? 'RELAXED CADENCE' : 'STEADY CADENCE'}
                      </span>
                    </div>
                  </div>
                  {/* Real called-command pills: last one is the live call */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {commandHistoryDisplay.length === 0 ? (
                      <div className="flex-shrink-0 px-2.5 py-1.5 rounded-full border border-white/10 bg-black/60 text-white/40 text-[8px] font-black font-mono tracking-wide">
                        AWAITING FIRST CALL
                      </div>
                    ) : (
                      commandHistoryDisplay.map((step, i) => {
                        const isCurrent = i === commandHistoryDisplay.length - 1;
                        const isDefenseCall = DEFENSE_COMMANDS.some((c) => c.text === step);
                        return (
                          <div
                            key={`${step}-${i}`}
                            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[8px] font-black font-mono tracking-wide transition-all duration-200 ${
                              isCurrent
                                ? 'bg-primary/25 border-primary text-primary shadow-[0_0_12px_rgba(226,255,59,0.5)] scale-105'
                                : isDefenseCall
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400/70'
                                : 'bg-[#101e08]/90 border-[#84CC16]/60 text-[#84CC16]'
                            }`}
                          >
                            <span className="text-[7px] opacity-70">{isCurrent ? '▶' : '✓'}</span>
                            <span>{step}</span>
                          </div>
                        );
                      })
                    )}
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
                <h1 className="text-xl font-black italic uppercase text-white leading-none">
                  BIOMECHANICAL INTEL
                </h1>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[9px] font-black tracking-widest uppercase">
                ON-DEVICE
              </div>
            </header>

            <GlassCard className="p-6 border-primary/20 bg-black/40">
              <div className="text-left mb-4 pb-4 border-b border-white/5">
                <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">
                  Overall Performance
                </span>
                <h3 className="text-2xl font-black uppercase text-white leading-none italic">
                  {resultsData.overallScore >= 80 ? 'STRONG SESSION' : resultsData.overallScore >= 55 ? 'SOLID EFFORT' : 'NEEDS WORK'}
                </h3>
              </div>

              <div className="grid grid-cols-4 gap-2.5 mt-2">
                {[
                  { label: 'Overall', val: `${resultsData.overallScore}%` },
                  { label: 'Power', val: `${resultsData.powerScore}%` },
                  { label: 'Tracking', val: `${resultsData.stanceScore}%` },
                  resultsData.isFreestyle
                    ? { label: 'Rotation', val: `${resultsData.rotationScore}%` }
                    : { label: 'Reflex', val: `${resultsData.reflexScore}%` },
                ].map((pill, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl py-3 text-center">
                    <div className="text-sm font-black text-white leading-none mb-1">
                      {pill.val}
                    </div>
                    <span className="text-[7px] font-black text-white/30 uppercase tracking-wider block">
                      {pill.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3.5 mt-3.5">
                {(resultsData.isFreestyle
                  ? [
                      { val: `${resultsData.hits}`, label: 'Punches Thrown' },
                      { val: `${resultsData.kneeDriveScore}%`, label: 'Knee Drive' },
                      { val: `${resultsData.weightTransferScore}%`, label: 'Weight Transfer' },
                    ]
                  : [
                      { val: `${resultsData.hits}/${resultsData.hits + resultsData.misses}`, label: 'Commands Hit' },
                      { val: resultsData.avgReflex ? `${resultsData.avgReflex}ms` : 'N/A', label: 'Avg Reaction' },
                      { val: `${resultsData.accuracy}%`, label: 'Accuracy' },
                    ]
                ).map((pill, idx) => (
                  <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-2xl py-2.5 text-center">
                    <div className="text-xs font-black text-primary leading-none mb-0.5">
                      {pill.val}
                    </div>
                    <span className="text-[6px] font-black text-white/40 uppercase tracking-widest block">
                      {pill.label}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Performance Merits — five circular-progress cards, arranged
                vertically. Overall/Power/Reflex reuse the exact scores
                already computed above (no new formula for these); Stability
                and Swiftness are genuinely new formulas (see
                computeStabilityScore / computeSwiftnessScore) built from
                data the capture loop was already recording. */}
            <GlassCard className="p-5 border-primary/20 bg-black/40">
              <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-4">
                Performance Merits
              </span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Overall', value: resultsData.overallScore },
                  { label: 'Power', value: resultsData.powerScore },
                  { label: 'Reflex', value: resultsData.reflexScore },
                  { label: 'Stability', value: resultsData.stabilityScore },
                ].map((merit) => (
                  <div
                    key={merit.label}
                    className="flex flex-col items-center gap-2 bg-white/[0.02] border border-white/5 rounded-2xl py-4"
                  >
                    <ProgressRing progress={merit.value ?? 0} size={76} strokeWidth={6} />
                    <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">
                      {merit.label}
                    </span>
                  </div>
                ))}
                <div className="col-span-2 flex flex-col items-center gap-2 bg-white/[0.02] border border-white/5 rounded-2xl py-4">
                  <ProgressRing progress={resultsData.swiftnessScore ?? 0} size={76} strokeWidth={6} />
                  <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">
                    Swiftness
                  </span>
                </div>
              </div>
            </GlassCard>

            <div className="flex items-center gap-3 p-4 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <span className="text-[7px] font-black text-red-500 uppercase tracking-widest block mb-0.5">
                  BIGGEST OPPORTUNITY
                </span>
                <p className="text-xs font-bold text-white/80 leading-normal">
                  {resultsData.flaw}
                </p>
              </div>
            </div>

            {resultsData.mistakes && resultsData.mistakes.length > 0 && (
              <GlassCard className="p-5 border-white/5 bg-black/40">
                <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-3">
                  What Went Wrong
                </span>
                <ul className="flex flex-col gap-2.5">
                  {resultsData.mistakes.map((m: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-white/60 font-semibold leading-snug">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            {/*
              Root-cause view sits ABOVE the flaw list on purpose. The flaw
              list answers "what did the camera measure", this answers "what
              is actually wrong" — and several measured flaws usually roll up
              into one correction. Showing the cluster first is how a coach
              would order it.
            */}
            {resultsData.rootCauses && resultsData.rootCauses.length > 0 && (
              <GlassCard className="p-5 border-white/5 bg-black/40">
                <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">
                  Root Cause Analysis
                </span>
                <p className="text-[8px] text-white/30 uppercase tracking-wider mb-3">
                  Correlated faults grouped into the single correction that fixes them
                </p>
                <div className="flex flex-col gap-3">
                  {resultsData.rootCauses.slice(0, 3).map((rc: RootCauseDiagnosis, idx: number) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-white uppercase tracking-wide">
                          {rc.label}
                        </span>
                        <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">
                          {rc.confidence}% confidence
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-primary leading-snug mb-1.5">
                        {rc.primaryFix}
                      </p>
                      <p className="text-[9px] text-white/40 leading-snug mb-1.5">
                        Drill: {rc.drill}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {rc.indicators.map((ind, i2) => (
                          <span
                            key={i2}
                            className="text-[7px] font-bold text-white/35 bg-white/[0.03] border border-white/5 rounded px-1.5 py-0.5"
                          >
                            {ind.techniqueLabel} {ind.metric.replace('Score', '')} {ind.measuredValue}%
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/*
              Capture quality is reported SEPARATELY from performance. It
              describes how well the camera could see you, not how well you
              boxed — conflating the two is what made the old "stance score"
              misleading.
            */}
            {typeof resultsData.analysisQuality === 'number' && (
              <GlassCard className="p-5 border-white/5 bg-black/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-primary tracking-widest uppercase">
                    Capture Quality
                  </span>
                  <span className="text-[11px] font-black text-white">
                    {resultsData.analysisQuality}%
                  </span>
                </div>
                <p className="text-[8px] text-white/30 uppercase tracking-wider">
                  How clearly the camera tracked you — not a measure of your boxing
                  {resultsData.engineInfo
                    ? ` · ${resultsData.engineInfo.model} model · ${resultsData.engineInfo.inferenceFps}fps · ${resultsData.engineInfo.delegate}`
                    : ''}
                </p>
                {resultsData.analysisQuality < 60 && (
                  <p className="text-[9px] text-orange-400/80 leading-snug mt-2">
                    Tracking was weak this session, so the technique findings below carry
                    lower confidence. Stand 6-8 feet from the camera with your full body
                    in frame and even lighting for a more reliable read.
                  </p>
                )}
              </GlassCard>
            )}

            {resultsData.detailedFlaws && resultsData.detailedFlaws.length > 0 && (
              <GlassCard className="p-5 border-white/5 bg-black/40">
                <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">
                  Detailed Flaw Breakdown
                </span>
                <p className="text-[8px] text-white/30 uppercase tracking-wider mb-3">
                  Ranked by severity — each one matched against measured technique, not guessed
                </p>
                <div className="flex flex-col gap-3">
                  {resultsData.detailedFlaws.map((f: DetectedFlaw, idx: number) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-white uppercase tracking-wide">
                          {f.techniqueLabel}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                            f.severity === 'major'
                              ? 'bg-red-500/15 text-red-400'
                              : f.severity === 'moderate'
                              ? 'bg-orange-500/15 text-orange-400'
                              : 'bg-yellow-500/15 text-yellow-400'
                          }`}
                        >
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/60 leading-snug mb-2">
                        {f.cause}{' '}
                        <span className="text-white/30">
                          (measured {f.measuredValue}% vs target {f.targetValue}%, over {f.sampleSize} reps
                          {typeof f.confidence === 'number' ? `, ${f.confidence}% confidence` : ''})
                        </span>
                      </p>
                      <p className="text-[10px] font-bold text-primary leading-snug mb-1">
                        Fix: {f.coachingTip}
                      </p>
                      <p className="text-[9px] text-white/40 leading-snug">
                        Drill: {f.correctiveExercise} — {f.recommendedFrequency}
                      </p>
                      <p className="text-[9px] text-white/30 leading-snug mt-0.5">
                        Target: {f.progressionTarget}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {resultsData.techniqueSummaries && resultsData.techniqueSummaries.length > 1 && (
              <GlassCard className="p-5 border-white/5 bg-black/40">
                <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-3">
                  Strongest / Weakest Techniques
                </span>
                <div className="flex flex-col gap-1.5">
                  {resultsData.techniqueSummaries.map((t: TechniqueSummary, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5"
                    >
                      <span className="text-[10px] font-bold text-white/80 uppercase tracking-wide">
                        {idx === 0 ? '💪 ' : idx === resultsData.techniqueSummaries.length - 1 ? '⚠️ ' : ''}
                        {t.label}
                      </span>
                      <span className="text-[10px] font-black text-primary">{t.avgScore}%</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {resultsData.log && resultsData.log.length > 0 && (
              <GlassCard className="p-5 border-white/5 bg-black/40">
                <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">
                  Full-Body Biomechanics
                </span>
                <p className="text-[8px] text-white/30 uppercase tracking-wider mb-3">
                  Measured from real landmark motion, not estimated
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Hip Rotation', val: resultsData.hipRotationScore ?? resultsData.rotationScore },
                    { label: 'Torso Rotation', val: resultsData.torsoRotationScore ?? resultsData.rotationScore },
                    { label: 'Knee Drive', val: resultsData.kneeDriveScore },
                    { label: 'Weight Transfer', val: resultsData.weightTransferScore },
                    { label: 'Rear Foot Pivot', val: resultsData.footPivotScore },
                    ...(resultsData.headLateralScore || resultsData.headDropScore
                      ? [
                          { label: 'Head Lateral (Slip)', val: resultsData.headLateralScore ?? 0 },
                          { label: 'Head Drop (Roll)', val: resultsData.headDropScore ?? 0 },
                        ]
                      : []),
                  ].map((m, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[7px] font-black text-white/40 uppercase tracking-wider">{m.label}</span>
                        <span className="text-[10px] font-black text-white">{m.val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, m.val)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 px-1">
                  <span className="text-[7px] font-black text-white/30 uppercase tracking-wider">
                    Punch Trajectory Accuracy
                  </span>
                  <span className="text-[10px] font-black text-primary">{resultsData.trajectoryAccuracy}%</span>
                </div>
              </GlassCard>
            )}

            {resultsData.log && resultsData.log.length > 0 && (
              <GlassCard className="p-5 border-white/5 bg-black/40">
                <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">
                  Strike Speed Per Rep
                </span>
                <p className="text-[8px] text-white/30 uppercase tracking-wider mb-2">
                  Yellow = hit · Red = missed · Height = elbow extension speed
                </p>
                <SpeedPowerChart log={resultsData.log} />

                {resultsData.log.filter((r: RepLogEntry) => r.hit).length >= 2 && (
                  <>
                    <span className="text-[9px] font-black text-primary tracking-widest uppercase block mt-5 mb-1">
                      Reaction Time Trend
                    </span>
                    <p className="text-[8px] text-white/30 uppercase tracking-wider mb-2">
                      Lower point = slower response that rep
                    </p>
                    <ReactionTrendChart log={resultsData.log} />
                  </>
                )}
              </GlassCard>
            )}

            {resultsData.log && resultsData.log.length > 0 && (
              <GlassCard className="p-5 border-white/5 bg-black/40">
                <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-3">
                  Punch-By-Punch Log
                </span>
                <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {resultsData.log.map((r: RepLogEntry) => (
                    <div
                      key={r.index}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[10px] font-bold ${r.hit ? 'bg-white/[0.02] border-white/5' : 'bg-red-500/[0.03] border-red-500/10'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-white/30 font-mono w-5">{r.index}.</span>
                        <span className="text-white/80 uppercase tracking-wide">{r.command}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[7px] uppercase tracking-widest ${r.hit ? 'bg-primary/15 text-primary' : 'bg-red-500/15 text-red-400'
                            }`}
                        >
                          {r.hit ? 'HIT' : 'MISS'}
                        </span>
                        {r.hit && r.kind === 'punch' && !r.trajectoryMatch && (
                          <span
                            title={`Thrown as a ${r.trajectory} path`}
                            className="px-1.5 py-0.5 rounded-full text-[7px] uppercase tracking-widest bg-orange-500/15 text-orange-400"
                          >
                            WRONG PATH
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-white/40 font-mono text-[9px]">
                        <span title="Elbow extension speed">{r.peakVelocity}°/s</span>
                        <span title="Estimated power (derived from speed)">{r.estimatedPower}% pwr</span>
                        <span title="Reaction time">{r.reactionMs !== null ? `${r.reactionMs}ms` : '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <div className="glass-card p-5 border-white/5 bg-black/40 flex items-start gap-4 rounded-3xl">
              <div className="w-11 h-11 rounded-full border border-red-500/30 bg-red-500/5 text-red-500 flex items-center justify-center text-lg flex-shrink-0">
                🤖
              </div>
              <div className="text-left flex-1">
                <span className="text-[7px] font-black text-red-500 tracking-wider uppercase block mb-1">
                  COACH FEEDBACK
                </span>
                <p className="text-xs font-semibold text-white/60 leading-relaxed italic">
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