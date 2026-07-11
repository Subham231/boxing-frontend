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
  ShieldAlert
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

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
}

// Reference angular velocity (deg/sec) used to normalize speed into a 0-100
// "power" estimate. This is a heuristic scale, not a calibrated force unit —
// a monocular camera has no way to measure actual impact force.
const POWER_REFERENCE_VELOCITY = 900;

function estimatePower(peakVelocity: number): number {
  return Math.round(Math.min(100, Math.max(0, (peakVelocity / POWER_REFERENCE_VELOCITY) * 100)));
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

function angleAt(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (magAB === 0 || magCB === 0) return 0;
  const cos = (ab.x * cb.x + ab.y * cb.y) / (magAB * magCB);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

export default function VisionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<Stage>('welcome');

  // Configuration
  const [voiceProfile, setVoiceProfile] = useState<'steel' | 'athena' | 'cyber'>('steel');
  const [mode, setMode] = useState<'punches' | 'defense'>('punches');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [punchTarget, setPunchTarget] = useState(50);

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
  const isMuted = false;
  const [isTrackingInadequate, setIsTrackingInadequate] = useState(false);
  const elapsedSecondsRef = useRef(0);

  // Results
  const [resultsData, setResultsData] = useState<any>(null);
  const [insufficientData, setInsufficientData] = useState(false);

  // ---- Refs mirroring state so the MediaPipe callback (a stale closure
  // captured once per session) always reads current values -----------------
  const stageRef = useRef<Stage>('welcome');
  const modeRef = useRef(mode);
  const difficultyRef = useRef(difficulty);
  const punchTargetRef = useRef(punchTarget);
  const isMutedRef = useRef(isMuted);
  const voiceProfileRef = useRef(voiceProfile);
  const calibSuccessRef = useRef(false);
  const isTrackingInadequateRef = useRef(false);

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { punchTargetRef.current = punchTarget; }, [punchTarget]);
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
  const prevElbowExtendedRef = useRef(false);
  const prevMaxElbowAngleRef = useRef(0);
  const prevAngleTsRef = useRef<number | null>(null);
  const peakAngularVelocityRef = useRef(0);
  const prevNoseOffsetRef = useRef(0);
  const hitCountRef = useRef(0);
  const missCountRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const attemptedRef = useRef(0);
  const currentRepPeakVelocityRef = useRef(0);
  const repLogRef = useRef<RepLogEntry[]>([]);
  const activeCommandTextRef = useRef('');

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
  const speakCommand = (text: string) => {
    if (!synthRef.current || isMutedRef.current) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synthRef.current.getVoices();
      const profile = voiceProfileRef.current;
      const chosen = voices.find((v) => {
        if (profile === 'steel') return v.name.includes('Google UK') || v.name.includes('Male') || v.lang === 'en-GB';
        if (profile === 'athena') return v.name.includes('Aria') || v.name.includes('Female') || v.name.includes('Zira');
        return v.name.includes('Google') || v.name.includes('Online');
      }) || voices[0];
      if (chosen) utterance.voice = chosen;
      utterance.rate = difficultyRef.current === 'hard' ? 1.05 : difficultyRef.current === 'easy' ? 0.8 : 0.9;
      utterance.pitch = profile === 'steel' ? 0.75 : profile === 'athena' ? 1.05 : 0.9;
      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech failed:', e);
    }
  };

  // -------------------------------------------------------------------------
  // Skeleton drawing
  // -------------------------------------------------------------------------
  const drawSkeleton = (landmarks: PoseLandmark[], ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)';
    ctx.shadowColor = 'rgba(6, 182, 212, 0.9)';
    ctx.shadowBlur = 10;

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

    ctx.shadowBlur = 14;
    ctx.fillStyle = '#06b6d4';
    const jointIndices = [LM.NOSE, ...SKELETON_CONNECTIONS.flat()];
    const seen = new Set<number>();
    for (const idx of jointIndices) {
      if (seen.has(idx)) continue;
      seen.add(idx);
      const p = landmarks[idx];
      if (!p || (p.visibility ?? 1) < 0.35) continue;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
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
        if (video && video.readyState >= 2 && poseRef.current) {
          try {
            await poseRef.current.send({ image: video });
          } catch (sendErr) {
            console.warn('Pose detection frame failed:', sendErr);
          }
        }
        rafIdRef.current = requestAnimationFrame(detectLoop);
      };
      rafIdRef.current = requestAnimationFrame(detectLoop);
      // Live preview + skeleton render immediately; calibration itself only
      // begins once the user taps "Start Analysis" (see beginCalibration()).
    } catch (err) {
      console.error('Camera access failed:', err);
      setEngineStatus('failed');
      setCameraError('Camera access was denied, no camera is available, or the selected device could not be opened. Grant camera permission, pick a different source, and try again.');
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

    let maxElbowAngle = 0;
    if (lS && lE && lW && (lW.visibility ?? 1) > 0.4) {
      maxElbowAngle = Math.max(maxElbowAngle, angleAt(lS, lE, lW));
    }
    if (rS && rE && rW && (rW.visibility ?? 1) > 0.4) {
      maxElbowAngle = Math.max(maxElbowAngle, angleAt(rS, rE, rW));
    }

    if (prevAngleTsRef.current !== null) {
      const dtSec = (now - prevAngleTsRef.current) / 1000;
      if (dtSec > 0) {
        const angularVel = Math.abs(maxElbowAngle - prevMaxElbowAngleRef.current) / dtSec;
        if (angularVel > peakAngularVelocityRef.current && angularVel < 3000) {
          peakAngularVelocityRef.current = angularVel;
        }
        if (awaitingRef.current && angularVel > currentRepPeakVelocityRef.current && angularVel < 3000) {
          currentRepPeakVelocityRef.current = angularVel;
        }
      }
    }
    prevAngleTsRef.current = now;
    prevMaxElbowAngleRef.current = maxElbowAngle;

    const extendedNow = maxElbowAngle > 165;
    const punchRisingEdge = extendedNow && !prevElbowExtendedRef.current;
    prevElbowExtendedRef.current = extendedNow;

    let noseOffset = 0;
    if (nose && lS && rS) {
      const shoulderMidX = (lS.x + rS.x) / 2;
      const shoulderWidth = Math.abs(lS.x - rS.x) || 0.001;
      noseOffset = (nose.x - shoulderMidX) / shoulderWidth;
    }
    const defenseTriggered = Math.abs(noseOffset) > 0.45 && Math.abs(noseOffset - prevNoseOffsetRef.current) > 0.15;
    prevNoseOffsetRef.current = noseOffset;

    if (!awaitingRef.current) return;

    if (awaitingKindRef.current === 'punch' && punchRisingEdge) {
      registerHit(now);
    } else if (awaitingKindRef.current === 'defense' && defenseTriggered) {
      registerHit(now);
    }
  };

  const registerHit = (now: number) => {
    const kind = awaitingKindRef.current;
    awaitingRef.current = false;
    awaitingKindRef.current = null;
    const reaction = now - commandTimestampRef.current;
    reactionTimesRef.current.push(reaction);
    hitCountRef.current += 1;
    setHitCount(hitCountRef.current);

    const peakVelocity = Math.round(currentRepPeakVelocityRef.current);
    repLogRef.current.push({
      index: repLogRef.current.length + 1,
      command: activeCommandTextRef.current,
      kind: kind || 'punch',
      hit: true,
      reactionMs: Math.round(reaction),
      peakVelocity,
      estimatedPower: estimatePower(peakVelocity),
    });
  };

  // -------------------------------------------------------------------------
  // Drill / command loop
  // -------------------------------------------------------------------------
  const startDrill = () => {
    sessionTimerRef.current = setInterval(() => {
      if (isTrackingInadequateRef.current) return;
      elapsedSecondsRef.current += 1;
      const mins = Math.floor(elapsedSecondsRef.current / 60).toString().padStart(2, '0');
      const secs = (elapsedSecondsRef.current % 60).toString().padStart(2, '0');
      setTimerDisplay(`${mins}:${secs}`);
    }, 1000);

    const gap = difficultyRef.current === 'hard' ? 2200 : difficultyRef.current === 'easy' ? 4000 : 3000;

    const runCommands = () => {
      if (stageRef.current !== 'camera') return;

      if (isTrackingInadequateRef.current) {
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
        });
      }

      if (attemptedRef.current >= punchTargetRef.current) {
        stopAndAnalyse();
        return;
      }

      const pool = modeRef.current === 'punches'
        ? PUNCH_COMMANDS
        : [...PUNCH_COMMANDS, ...DEFENSE_COMMANDS];
      const cmd = pool[Math.floor(Math.random() * pool.length)];

      setActiveCommand(cmd.text);
      activeCommandTextRef.current = cmd.text;
      speakCommand(cmd.text);

      awaitingRef.current = true;
      awaitingKindRef.current = cmd.kind;
      commandTimestampRef.current = performance.now();
      currentRepPeakVelocityRef.current = 0;
      attemptedRef.current += 1;
      setAttemptedCount(attemptedRef.current);

      drillTimerRef.current = setTimeout(runCommands, gap + REACTION_WINDOW_PAD_MS);
    };

    drillTimerRef.current = setTimeout(runCommands, 800);
  };

  const stopAndAnalyse = async () => {
    if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (calibTickRef.current) clearInterval(calibTickRef.current);

    // If the session was stopped mid-command, don't silently drop that rep —
    // log it as a miss so the punch-by-punch record stays complete and honest.
    if (awaitingRef.current) {
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

    const totalAttempts = hitCountRef.current + missCountRef.current;

    if (totalAttempts < 3) {
      setInsufficientData(true);
      setStage('results');
      return;
    }

    const accuracy = Math.round((hitCountRef.current / totalAttempts) * 100);
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
    const overallScore = Math.round((accuracy + stanceScore + reflexScore) / 3);

    let flaw = 'Tracking confidence stayed strong throughout — no major flaw detected.';
    let advice = 'Consistent frame presence and clean strike mechanics across the session.';
    const scores = [
      { name: 'accuracy', value: accuracy },
      { name: 'stance', value: stanceScore },
      { name: 'reflex', value: reflexScore },
    ];
    const weakest = scores.sort((a, b) => a.value - b.value)[0];
    if (weakest.name === 'accuracy') {
      flaw = 'Missed commands: several calls went unanswered inside the reaction window.';
      advice = 'Focus on committing to each call immediately — hesitation cost you reps this session.';
    } else if (weakest.name === 'stance') {
      flaw = 'Tracking confidence dipped repeatedly — you drifted out of the optimal frame zone.';
      advice = 'Stand roughly 6-8 feet from the camera and keep your full upper body visible throughout.';
    } else if (weakest.name === 'reflex') {
      flaw = 'Reaction times ran high relative to the call cadence.';
      advice = 'Keep your hands up and weight forward so you can fire the instant a command lands.';
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

    const hitsOnly = log.filter((r) => r.hit && r.reactionMs !== null);
    if (hitsOnly.length > 0) {
      const slowest = hitsOnly.reduce((a, b) => ((a.reactionMs ?? 0) > (b.reactionMs ?? 0) ? a : b));
      if ((slowest.reactionMs ?? 0) > 700) {
        mistakes.push(`Slowest reaction was on ${slowest.command} at ${slowest.reactionMs}ms — noticeably behind your average.`);
      }
      const weakestStrike = hitsOnly.reduce((a, b) => (a.peakVelocity < b.peakVelocity ? a : b));
      if (weakestStrike.peakVelocity < POWER_REFERENCE_VELOCITY * 0.35) {
        mistakes.push(`Weakest strike was ${weakestStrike.command} at ${weakestStrike.peakVelocity}°/s — extend fully through the target.`);
      }
    }
    if (mistakes.length === 0) {
      mistakes.push('No specific recurring mistake detected — commands were answered cleanly and on time.');
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
    });
    setInsufficientData(false);
    setStage('results');
  };

  useEffect(() => {
    if (stage === 'results' && (resultsData || insufficientData)) {
      const progressKey = 'workout_progress_' + new Date().toDateString();
      try {
        const completed = JSON.parse(localStorage.getItem(progressKey) || '[]');
        if (!completed.includes(99)) {
          completed.push(99);
          localStorage.setItem(progressKey, JSON.stringify(completed));
        }
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
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={() => setMode('punches')}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border text-left transition-all ${mode === 'punches'
                      ? 'bg-primary/15 border-primary text-primary shadow-[0_0_12px_rgba(226,255,59,0.2)]'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white'
                    }`}
                >
                  <Target className="w-5 h-5 mb-2" />
                  <span className="text-[10px] font-black uppercase">PUNCHES ONLY</span>
                  <span className="text-[6px] text-white/30 mt-0.5">Jab, Cross, Hook, Uppercut</span>
                </button>

                <button
                  onClick={() => setMode('defense')}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border text-left transition-all ${mode === 'defense'
                      ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white'
                    }`}
                >
                  <Shield className="w-5 h-5 mb-2" />
                  <span className="text-[10px] font-black uppercase">PUNCHES &amp; DEFENSE</span>
                  <span className="text-[6px] text-white/30 mt-0.5">Slips, Rolls, Head Movement</span>
                </button>
              </div>
            </div>

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

            <div className="flex flex-col gap-3">
              <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block">
                CAMERA SOURCE
              </span>
              {cameraDevices.length === 0 ? (
                <div className="bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-[10px] text-white/40 font-bold uppercase text-center">
                  No cameras found — grant camera permission and reopen this page.
                </div>
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

            <NeonButton onClick={startCalibration} className="w-full h-14 mt-2">
              START CALIBRATION
            </NeonButton>
          </motion.div>
        )}

        {stage === 'camera' && (
          <motion.div
            key="stage-camera"
            className="flex flex-col h-[85vh] justify-between relative anim-fade-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
              <span className="opacity-80">MODE: {mode.toUpperCase()} MODE</span>
              <span className="opacity-40 uppercase">DIFF_{difficulty}_SPEED</span>
            </div>

            <header className="flex justify-between items-center z-50">
              <button
                onClick={backToConfig}
                className="w-9 h-9 rounded-full border border-white/15 bg-black/40 flex items-center justify-center text-white/60 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex gap-2">
                <div className={`px-3.5 py-1.5 rounded-full border font-mono text-[9px] font-black flex items-center gap-1.5 ${isTrackingInadequate
                    ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                    : 'border-red-500/20 bg-red-500/10 text-red-500'
                  }`}>
                  <div className={`w-2 h-2 rounded-full ${isTrackingInadequate ? 'bg-yellow-400 animate-pulse' : 'bg-red-500 animate-ping'}`} />
                  <span>{isTrackingInadequate ? 'PAUSED' : calibSuccess ? 'RECORDING' : awaitingUserStart ? 'READY' : 'CALIBRATING'}</span>
                </div>
                <div className="px-3 py-1 bg-black/50 border border-white/10 text-white font-mono text-xs rounded-lg">
                  {timerDisplay}
                </div>
              </div>
            </header>

            <div className="flex-1 my-4 rounded-3xl border border-white/15 bg-zinc-950 overflow-hidden relative shadow-inner">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-10"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-20 pointer-events-none"
              />

              <div className="scanning-line absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-45 pointer-events-none z-30 animate-pulse" />
              <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-primary z-30" />
              <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-primary z-30" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-primary z-30" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-primary z-30" />

              <div className="absolute top-4 right-4 bg-black/60 border border-white/10 rounded-2xl p-3 z-30 min-w-[70px] text-center">
                <span className="text-[7px] font-black text-primary uppercase block tracking-widest mb-0.5">
                  HITS
                </span>
                <span className="text-xl font-black text-white font-mono leading-none block">
                  {hitCount}
                </span>
                <span className="text-[6px] text-white/30 uppercase font-black block mt-0.5">
                  MISS {missCount}
                </span>
                <span className="text-[6px] text-primary/70 uppercase font-black block mt-1 pt-1 border-t border-white/10">
                  {attemptedCount}/{punchTarget}
                </span>
              </div>

              {calibSuccess && !isTrackingInadequate && activeCommand && (
                <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/90 border-2 border-primary rounded-xl px-6 py-2.5 z-30 text-center font-mono text-xl font-black text-primary tracking-widest shadow-[0_0_15px_rgba(226,255,59,0.3)] select-none">
                  {activeCommand}
                </div>
              )}

              {isTrackingInadequate && calibSuccess && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center select-none">
                  <ShieldAlert className="w-8 h-8 text-yellow-400 mb-3 animate-pulse" />
                  <div className="bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 px-4 py-2 rounded-xl text-[11px] font-black tracking-wide uppercase mb-2 max-w-[260px]">
                    ⚠️ Insufficient Tracking Data
                  </div>
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider max-w-[240px]">
                    Position your full upper body in frame. Scoring is paused — no data is being guessed.
                  </p>
                </div>
              )}

              {awaitingUserStart && (
                <div className="absolute inset-0 bg-black/40 z-40 flex flex-col items-center justify-end p-6 pb-8 text-center select-none">
                  <div className="bg-black/70 border border-primary/40 text-primary px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase mb-2">
                    CAMERA FEED LIVE — CHECK YOUR FRAMING
                  </div>
                  <div className="text-[8px] text-white/40 font-bold uppercase tracking-wider mb-4">
                    SOURCE: {cameraDevices.find((d) => d.deviceId === selectedDeviceId)?.label || 'Default Camera'}
                  </div>
                  <div className="flex gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[8px] font-black uppercase tracking-widest">
                      {mode === 'punches' ? 'Punches Only' : 'Punches & Defense'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[8px] font-black uppercase tracking-widest">
                      {difficulty} Speed
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[8px] font-black uppercase tracking-widest">
                      {punchTarget} Commands
                    </span>
                  </div>
                  <button
                    onClick={beginCalibration}
                    className="w-20 h-20 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_0_25px_rgba(226,255,59,0.45)] active:scale-95 transition-transform"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest leading-tight">
                      START<br />ANALYSIS
                    </span>
                  </button>
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider mt-4 max-w-[260px]">
                    Step back 6-8 feet, get in frame, then tap start when you&apos;re ready.
                  </p>
                </div>
              )}

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
            </div>

            <footer className="flex gap-3 mt-1">
              <button
                onClick={backToConfig}
                className="w-14 h-14 rounded-full border border-white/20 bg-transparent text-white/60 hover:text-white flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                onClick={stopSessionEarly}
                disabled={!calibSuccess}
                className="flex-1 h-14 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 disabled:cursor-not-allowed text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <StopCircle className="w-5 h-5 fill-white stroke-none" />
                <span>STOP &amp; ANALYSE</span>
              </button>
            </footer>

            {engineStatus === 'failed' && cameraError && (
              <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8 text-center gap-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
                <h3 className="text-white font-black uppercase text-sm">Camera / Model Unavailable</h3>
                <p className="text-white/50 text-xs max-w-[260px]">{cameraError}</p>
                <div className="flex gap-3 mt-2">
                  <button onClick={backToConfig} className="px-4 py-2 rounded-full border border-white/20 text-white/70 text-xs font-black uppercase">
                    Back
                  </button>
                  <button onClick={startCalibration} className="px-4 py-2 rounded-full bg-primary text-black text-xs font-black uppercase">
                    Retry
                  </button>
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
                  { label: 'Reflex', val: `${resultsData.reflexScore}%` },
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
                {[
                  { val: `${resultsData.hits}/${resultsData.hits + resultsData.misses}`, label: 'Commands Hit' },
                  { val: resultsData.avgReflex ? `${resultsData.avgReflex}ms` : 'N/A', label: 'Avg Reaction' },
                  { val: `${resultsData.accuracy}%`, label: 'Accuracy' },
                ].map((pill, idx) => (
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