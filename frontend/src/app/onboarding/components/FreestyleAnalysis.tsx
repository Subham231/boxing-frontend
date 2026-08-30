'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Play, Lock, Zap, Flame, Activity, SkipForward, X } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

/* ─────────────────────────────────────────────────────────────
   Pose skeleton constants (MediaPipe BlazePose 33-landmark)
───────────────────────────────────────────────────────────── */
const LM = { NOSE:0,L_SHOULDER:11,R_SHOULDER:12,L_ELBOW:13,R_ELBOW:14,L_WRIST:15,R_WRIST:16,L_HIP:23,R_HIP:24,L_KNEE:25,R_KNEE:26,L_ANKLE:27,R_ANKLE:28,L_HEEL:29,R_HEEL:30,L_FOOT_INDEX:31,R_FOOT_INDEX:32 };
const SK: [number,number][] = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
const CORE = [11,12,23,24];

/* ─────────────────────────────────────────────────────────────
   Biomechanical constants (mirrors main vision page exactly)
───────────────────────────────────────────────────────────── */
const V_THR  = 0.6;   // visibility threshold
const EXT    = 155;   // deg — webcam pose landmarks rarely reach a perfect 165° extension
const RET    = 135;   // deg — must drop back below this to re-arm
const MIN_AV = 180;   // deg/sec; tolerate 30fps landmark smoothing without slow arm raises
const ALPHA  = 0.45;  // exponential smoothing factor
const MIN_WS = 0.35;  // shoulder-widths/sec minimum wrist speed
const MOTION_MEMORY_MS = 350;
const REARM  = 70;    // ms dwell in guard before re-arming
const PREF_V = 900;   // reference velocity for power 0-100

type PL = { x: number; y: number; z?: number; visibility?: number };

function ang(a: PL, b: PL, c: PL): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const m = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (m === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, (ab.x*cb.x + ab.y*cb.y)/m))) * 180) / Math.PI;
}

function pow100(v: number): number {
  return Math.round(Math.min(100, Math.max(0, (v / PREF_V) * 100)));
}

type Stage = 'instructions' | 'setup' | 'recording' | 'analyzing' | 'results';

interface PunchRep {
  peakVelocity: number;
  power: number;
  rotation: number;
  knee: number;
  weight: number;
  foot: number;
}

export interface MiniAnalysisResult {
  totalScore: number;
  powerScore: number;
  stanceScore: number;
  reflexScore: number;
  rotationScore: number;
  punchCount: number;
  peakVelocity: number;
  avgVelocity: number;
}

export default function FreestyleAnalysis(): JSX.Element {
  const { nextStep, prevStep } = useOnboarding();
  const ONBOARDING_ANALYSIS_KEY = 'boxing_onboarding_analysis_used';
  const analysisDay = () => new Date().toISOString().slice(0, 10);
  const [stage, setStage] = useState<Stage>('instructions');
  const [timeLeft, setTimeLeft] = useState(30);
  const [punchCount, setPunchCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [startingCamera, setStartingCamera] = useState(false);
  const [calibDone, setCalibDone] = useState(false);
  const [calibText, setCalibText] = useState('SEARCHING FOR YOU...');
  const [tracking, setTracking] = useState(false);
  const [result, setResult] = useState<MiniAnalysisResult | null>(null);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const poseRef    = useRef<any>(null);
  const rafRef     = useRef<number | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const calibRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detection refs (mirrors vision page — stale-closure safe)
  const calibDoneR     = useRef(false);
  const stageR         = useRef<Stage>('instructions');
  const punchesR       = useRef(0);
  const trackingR      = useRef(false);
  const goodHoldR      = useRef(0);
  const badHoldR       = useRef(0);
  const lastTsR        = useRef<number|null>(null);
  const repLogR        = useRef<PunchRep[]>([]);
  const trackSampR     = useRef<number[]>([]);
  const peakAvR        = useRef(0);

  // DO NOT replace this with a single-frame angle check. Straight arms at
  // rest also measure near 180°, which would permanently block punch counts.
  // Elbow state machine refs
  const smoothAngR     = useRef(0);
  const prevAngR       = useRef(0);
  const prevAngTsR     = useRef<number|null>(null);
  const elbowStateR    = useRef<'guard'|'strike'>('guard');
  const guardAtR       = useRef(0);
  const wristSpeedR    = useRef(0);
  const lastPunchMotionR = useRef(0);
  const prevWristR     = useRef<{x:number;y:number}|null>(null);
  const repPeakVR      = useRef(0);
  const angHistR       = useRef<number[]>([]);

  // Kinetic chain refs
  const shBlineR       = useRef(0);
  const peakRotR       = useRef(0);
  const kneeBlineR     = useRef({L:0,R:0});
  const peakKneeR      = useRef(0);
  const hipBlineR      = useRef(0);
  const peakHipR       = useRef(0);
  const footBlineR     = useRef({L:0,R:0});
  const peakFootR      = useRef(0);
  const wristBlineR    = useRef({L:{x:0,y:0},R:{x:0,y:0}});
  const lastSwR        = useRef(0.2);

  useEffect(() => { stageR.current = stage; }, [stage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const used = localStorage.getItem(ONBOARDING_ANALYSIS_KEY) === analysisDay();
      if (used) {
        setPermissionNotice('This onboarding analysis can only be used once. Continue to the next step.');
      }
    }
  }, [ONBOARDING_ANALYSIS_KEY]);

  const markOnboardingAnalysisUsed = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_ANALYSIS_KEY, analysisDay());
    }
  }, [ONBOARDING_ANALYSIS_KEY]);

  /* ── cleanup ─────────────────────────────────────────────── */
  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (calibRef.current) { clearInterval(calibRef.current); calibRef.current = null; }
    try { poseRef.current?.close(); } catch {}
    poseRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  /* ── skeleton draw (same cyan glow as main app) ─────────── */
  function drawSkeleton(lm: PL[], ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h);

    // Grid overlay — matches main analysis HUD
    ctx.strokeStyle = 'rgba(226,255,59,0.06)';
    ctx.lineWidth = 1;
    const cols = 6; const rows = 8;
    for (let i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo((w/cols)*i,0); ctx.lineTo((w/cols)*i,h); ctx.stroke(); }
    for (let j = 1; j < rows; j++) { ctx.beginPath(); ctx.moveTo(0,(h/rows)*j); ctx.lineTo(w,(h/rows)*j); ctx.stroke(); }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(6,182,212,0.6)';
    ctx.shadowColor  = 'rgba(6,182,212,0.9)';
    ctx.shadowBlur   = 10;
    for (const [i,j] of SK) {
      const a = lm[i]; const b = lm[j];
      if (!a || !b || (a.visibility??1)<0.35 || (b.visibility??1)<0.35) continue;
      ctx.beginPath(); ctx.moveTo(a.x*w, a.y*h); ctx.lineTo(b.x*w, b.y*h); ctx.stroke();
    }
    ctx.shadowBlur = 14; ctx.fillStyle = '#06b6d4';
    const seen = new Set<number>();
    for (const [i,j] of SK) {
      for (const idx of [i,j]) {
        if (seen.has(idx)) continue; seen.add(idx);
        const p = lm[idx];
        if (!p || (p.visibility??1)<0.35) continue;
        ctx.beginPath(); ctx.arc(p.x*w, p.y*h, 4, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  /* ── per-frame analysis (mirrors main vision page exactly) ─ */
  const analyzeFrame = useCallback((lm: PL[], now: number) => {
    const lS=lm[LM.L_SHOULDER],rS=lm[LM.R_SHOULDER];
    const lE=lm[LM.L_ELBOW],rE=lm[LM.R_ELBOW];
    const lW=lm[LM.L_WRIST],rW=lm[LM.R_WRIST];
    const lH=lm[LM.L_HIP],rH=lm[LM.R_HIP];
    const lK=lm[LM.L_KNEE],rK=lm[LM.R_KNEE];
    const lA=lm[LM.L_ANKLE],rA=lm[LM.R_ANKLE];
    const lHeel=lm[LM.L_HEEL],rHeel=lm[LM.R_HEEL];
    const lFt=lm[LM.L_FOOT_INDEX],rFt=lm[LM.R_FOOT_INDEX];

    let lAng=0, rAng=0;
    if (lS&&lE&&lW&&(lW.visibility??1)>0.4) lAng=ang(lS,lE,lW);
    if (rS&&rE&&rW&&(rW.visibility??1)>0.4) rAng=ang(rS,rE,rW);
    const maxA = Math.max(lAng,rAng);

    const hist = angHistR.current;
    hist.push(maxA); if (hist.length>3) hist.shift();
    const median = hist.length===3 ? [...hist].sort((a,b)=>a-b)[1] : maxA;
    smoothAngR.current = smoothAngR.current===0 ? median : smoothAngR.current + ALPHA*(median-smoothAngR.current);
    const sa = smoothAngR.current;

    const dt = lastTsR.current ? now - lastTsR.current : 33;
    let av = 0;
    if (prevAngTsR.current !== null) {
      const dtS = (now - prevAngTsR.current) / 1000;
      if (dtS > 0) {
        av = Math.abs(sa - prevAngR.current) / dtS;
        if (av < 3000) { if (av>peakAvR.current) peakAvR.current=av; if (av>repPeakVR.current) repPeakVR.current=av; }
      }
    }

    const sw = lS&&rS ? Math.hypot(lS.x-rS.x,lS.y-rS.y)||0.001 : 0.001;
    if (lS&&rS) lastSwR.current = sw;
    const actW = lAng>=rAng ? lW : rW;
    if (actW&&(actW.visibility??1)>0.4 && prevAngTsR.current!==null) {
      const dtS=(now-prevAngTsR.current)/1000;
      if (prevWristR.current&&dtS>0) {
        wristSpeedR.current = (Math.hypot(actW.x-prevWristR.current.x, actW.y-prevWristR.current.y)/sw)/dtS;
      }
      prevWristR.current = {x:actW.x, y:actW.y};
    }

    prevAngTsR.current = now; prevAngR.current = sa;

    // Shoulder line for rotation
    let shAng = shBlineR.current;
    if (lS&&rS) shAng = (Math.atan2(rS.y-lS.y, rS.x-lS.x)*180)/Math.PI;

    const lKA = lH&&lK&&lA ? ang(lH,lK,lA) : kneeBlineR.current.L;
    const rKA = rH&&rK&&rA ? ang(rH,rK,rA) : kneeBlineR.current.R;
    const hipX = lH&&rH ? (lH.x+rH.x)/2 : hipBlineR.current;

    const lFv = lHeel&&lFt&&(lHeel.visibility??1)>0.4&&(lFt.visibility??1)>0.4;
    const rFv = rHeel&&rFt&&(rHeel.visibility??1)>0.4&&(rFt.visibility??1)>0.4;
    const lFA = lFv ? (Math.atan2(lFt!.y-lHeel!.y, lFt!.x-lHeel!.x)*180)/Math.PI : footBlineR.current.L;
    const rFA = rFv ? (Math.atan2(rFt!.y-rHeel!.y, rFt!.x-rHeel!.x)*180)/Math.PI : footBlineR.current.R;

    if (elbowStateR.current==='guard') {
      shBlineR.current = shAng; peakRotR.current = 0;
      kneeBlineR.current = {L:lKA,R:rKA}; peakKneeR.current = 0;
      hipBlineR.current = hipX; peakHipR.current = 0;
      if (lFv) footBlineR.current.L = lFA; if (rFv) footBlineR.current.R = rFA; peakFootR.current = 0;
      if (lW&&(lW.visibility??1)>0.4) wristBlineR.current.L={x:lW.x,y:lW.y};
      if (rW&&(rW.visibility??1)>0.4) wristBlineR.current.R={x:rW.x,y:rW.y};
    } else {
      const rd=Math.abs(shAng-shBlineR.current); if(rd>peakRotR.current) peakRotR.current=rd;
      const kd=Math.max(Math.abs(lKA-kneeBlineR.current.L),Math.abs(rKA-kneeBlineR.current.R)); if(kd>peakKneeR.current) peakKneeR.current=kd;
      const wd=Math.abs(hipX-hipBlineR.current)/sw; if(wd>peakHipR.current) peakHipR.current=wd;
      const fd=Math.max(lFv?Math.abs(lFA-footBlineR.current.L):0, rFv?Math.abs(rFA-footBlineR.current.R):0); if(fd>peakFootR.current) peakFootR.current=fd;
    }

    // State machine GUARD→STRIKE→GUARD
    const dwell = now-guardAtR.current >= REARM;
    if (av>=MIN_AV || wristSpeedR.current>=MIN_WS) lastPunchMotionR.current=now;
    if (elbowStateR.current==='guard' && dwell && sa>EXT) {
      const motionDetected = now-lastPunchMotionR.current <= MOTION_MEMORY_MS;
      if (motionDetected) {
        elbowStateR.current='strike';
        // Validated punch — log it
        const pv = Math.round(repPeakVR.current);
        const rScore = Math.round(Math.min(100,(peakRotR.current/22)*100));
        const kScore = Math.round(Math.min(100,(peakKneeR.current/18)*100));
        const wScore = Math.round(Math.min(100,(peakHipR.current/0.12)*100));
        const fScore = Math.round(Math.min(100,(peakFootR.current/20)*100));
        repLogR.current.push({ peakVelocity:pv, power:pow100(pv), rotation:rScore, knee:kScore, weight:wScore, foot:fScore });
        punchesR.current += 1;
        setPunchCount(punchesR.current);
        repPeakVR.current = 0;
      }
    } else if (elbowStateR.current==='strike' && sa<RET) {
      elbowStateR.current='guard'; guardAtR.current=now;
    }
  }, []);

  /* ── MediaPipe pose results callback ───────────────────────── */
  const onPoseResults = useCallback((results: any) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w=canvas.width, h=canvas.height;
    const lm: PL[]|undefined = results.poseLandmarks;
    const now = performance.now();
    const dt  = lastTsR.current ? now-lastTsR.current : 33;
    lastTsR.current = now;

    if (!lm||lm.length===0) { ctx.clearRect(0,0,w,h); trackingR.current=false; badHoldR.current+=dt; goodHoldR.current=0; return; }
    const minVis = Math.min(...CORE.map(i=>lm[i]?.visibility??0));
    trackingR.current = minVis>=V_THR;
    drawSkeleton(lm, ctx, w, h);
    if (trackingR.current) { trackSampR.current.push(minVis); goodHoldR.current+=dt; badHoldR.current=0; }
    else { goodHoldR.current=0; badHoldR.current+=dt; }
    if (calibDoneR.current && stageR.current==='recording') analyzeFrame(lm, now);
  }, [analyzeFrame]);

  /* ── start camera + MediaPipe ──────────────────────────────── */
  const startCamera = async () => {
    if (typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_ANALYSIS_KEY) === analysisDay()) {
      setPermissionNotice('This onboarding analysis has already been used once. Continue without repeating it.');
      setCameraError('Your daily onboarding analysis is already complete. Continue onboarding to keep going.');
      return;
    }
    if (startingCamera) return;

    setStartingCamera(true);
    setCameraError(null);
    setPermissionNotice(null);
    setCalibDone(false); calibDoneR.current=false;
    punchesR.current=0; setPunchCount(0);
    repLogR.current=[]; trackSampR.current=[]; peakAvR.current=0;
    elbowStateR.current='guard'; smoothAngR.current=0; prevAngR.current=0;
    prevAngTsR.current=null; guardAtR.current=0; wristSpeedR.current=0;
    prevWristR.current=null; repPeakVR.current=0; angHistR.current=[]; lastPunchMotionR.current=0;
    goodHoldR.current=0; badHoldR.current=0; lastTsR.current=null;

    try {
      // Secure context required for getUserMedia
      if (!navigator.mediaDevices || !window.isSecureContext) {
        setPermissionNotice('Camera access needs a secure connection. Please switch to HTTPS or continue without analysis.');
        setCameraError('Camera requires a secure (HTTPS) connection. Please ensure you are using HTTPS and try again.');
        setStage('setup');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}, audio:false });
      streamRef.current = stream;
      setStage('recording');
      // Wait for video element to mount
      let videoEl: HTMLVideoElement|null = null;
      const deadline = Date.now()+5000;
      while (Date.now()<deadline) { if (videoRef.current) { videoEl=videoRef.current; break; } await new Promise(r=>setTimeout(r,30)); }
      if (!videoEl) throw new Error('video-mount');
      videoEl.srcObject = stream;
      if (videoEl.readyState < 1) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('video-metadata-timeout')), 5000);
          videoEl!.onloadedmetadata = () => {
            window.clearTimeout(timeout);
            resolve();
          };
        });
      }
      if (canvasRef.current) {
        canvasRef.current.width = videoEl.videoWidth || 640;
        canvasRef.current.height = videoEl.videoHeight || 480;
      }
      try { await videoEl.play(); } catch {}

      // Load MediaPipe
      if (!(window as any).Pose) {
        await new Promise<void>((res,rej) => {
          const s=document.createElement('script');
          s.src='https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
          s.crossOrigin='anonymous'; s.async=true;
          s.onload=()=>res(); s.onerror=()=>rej(new Error('mp-load'));
          document.head.appendChild(s);
        });
      }
      // Wait up to 6s for Pose class
      const start=Date.now();
      while (Date.now()-start<6000) { if((window as any).Pose) break; await new Promise(r=>setTimeout(r,150)); }
      if (!(window as any).Pose) throw new Error('mp-timeout');

      const mpPose=(window as any).Pose;
      const pose = new mpPose({ locateFile:(f:string)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
      pose.setOptions({ modelComplexity:1, smoothLandmarks:true, enableSegmentation:false, minDetectionConfidence:0.5, minTrackingConfidence:0.5 });
      pose.onResults(onPoseResults);
      poseRef.current = pose;

      const loop = async () => {
        const v = videoRef.current;
        if (v&&v.readyState>=2&&poseRef.current) { try { await poseRef.current.send({image:v}); } catch {} }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      setTracking(false);
      setCalibText('SEARCHING FOR YOU...');

      // Calibration tick
      calibRef.current = setInterval(() => {
        if (calibDoneR.current) return;
        if (trackingR.current) {
          goodHoldR.current += 150;
          setCalibText('DETECTED — HOLD STILL...');
          setTracking(true);
          if (goodHoldR.current >= 2000) {
            calibDoneR.current = true;
            setCalibDone(true);
            setCalibText('CALIBRATED!');
            if(calibRef.current){clearInterval(calibRef.current);calibRef.current=null;}
            startCountdown();
          }
        } else {
          goodHoldR.current = 0;
          setCalibText('SEARCHING FOR YOU...');
          setTracking(false);
        }
      }, 150);

    } catch (err: any) {
      cleanup();
      const n = err?.name || '';
      if (n === 'NotAllowedError' || n === 'PermissionDeniedError') {
        setPermissionNotice('Camera and mic permission is required. Turn on the browser popup to continue.');
        setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (n === 'NotFoundError' || n === 'OverconstrainedError') {
        setPermissionNotice('No usable camera was detected. Try another device or continue without camera analysis.');
        setCameraError('No camera found or camera not accessible. Please check your device has a working camera.');
      } else if (err?.message === 'mp-timeout' || err?.message === 'mp-load') {
        setPermissionNotice('AI model failed to load. Please retry or continue without analysis.');
        setCameraError('AI model failed to load. Check your internet connection and try again.');
      } else if (err?.message === 'video-mount' || err?.message === 'video-metadata-timeout') {
        setPermissionNotice('Camera did not initialize. Try again or continue without the analysis step.');
        setCameraError('Camera initialization failed. Please refresh the page and try again.');
      } else {
        setPermissionNotice('Could not start camera. Please try again or skip this step.');
        setCameraError('Could not start camera. Please try again or skip this step.');
      }
      setStage('setup');
    } finally {
      setStartingCamera(false);
    }
  };

  /* ── 30s countdown ──────────────────────────────────────────── */
  const startCountdown = () => {
    let t = 30;
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) {
        if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
        finishSession();
      }
    }, 1000);
  };

  /* ── compute results (same formula as main vision page) ──────── */
  const finishSession = () => {
    cleanup();
    markOnboardingAnalysisUsed();
    setStage('analyzing');
    setTimeout(() => {
      const log = repLogR.current;
      const total = punchesR.current;
      const avgVis = trackSampR.current.length ? trackSampR.current.reduce((a,b)=>a+b,0)/trackSampR.current.length : 0;
      const stanceScore = Math.round(avgVis*100);
      const powerScore = Math.round(Math.min(100,(peakAvR.current/PREF_V)*100));

      let avgRot=0,avgKnee=0,avgWt=0,avgFt=0;
      if (log.length>0) {
        avgRot=log.reduce((s,r)=>s+r.rotation,0)/log.length;
        avgKnee=log.reduce((s,r)=>s+r.knee,0)/log.length;
        avgWt=log.reduce((s,r)=>s+r.weight,0)/log.length;
        avgFt=log.reduce((s,r)=>s+r.foot,0)/log.length;
      }
      const rotationScore = Math.round(avgRot);
      const peakV = log.length>0 ? Math.max(...log.map(r=>r.peakVelocity)) : 0;
      const avgV  = log.length>0 ? Math.round(log.reduce((s,r)=>s+r.peakVelocity,0)/log.length) : 0;

      const totalScore = total<3 ? 0 :
        Math.round((powerScore+stanceScore+rotationScore+Math.round(avgKnee)+Math.round(avgWt)+Math.round(avgFt))/6);

      const res: MiniAnalysisResult = { totalScore, powerScore, stanceScore, reflexScore:0, rotationScore, punchCount:total, peakVelocity:peakV, avgVelocity:avgV };
      // Persist for AnalysisMeritsReveal
      try { localStorage.setItem('sparai_mini_analysis', JSON.stringify(res)); } catch {}
      setResult(res);
      setStage('results');
    }, 2400);
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <AnimatePresence>
        {permissionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 left-2 right-2 z-50 mx-auto rounded-2xl border border-primary/30 bg-[#101010]/95 px-3 py-2 text-center shadow-[0_0_25px_rgba(226,255,59,0.15)] sm:left-1/2 sm:right-auto sm:w-[calc(100%-2rem)] sm:max-w-sm sm:-translate-x-1/2"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Permission needed</p>
            <p className="mt-1 text-[11px] font-semibold text-white/80 leading-snug">{permissionNotice}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">

        {/* ── INSTRUCTIONS ─────────────────────────────────── */}
        {stage === 'instructions' && (
          <motion.div key="inst" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-15}} className="flex flex-col flex-1 justify-between gap-3">
            <div className="flex flex-col gap-3">
              <header className="text-left">
                <StepBadge />
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-wider mb-2">
                  <Zap className="w-3 h-3" /> 30-SECOND AI ANALYSIS
                </div>
                <h1 className="text-2xl font-black italic uppercase leading-[0.93] tracking-tighter text-white">
                  Freestyle <span className="text-primary">Punch Analysis</span>
                </h1>
                <p className="text-white/50 mt-1.5 text-[11px] leading-relaxed font-semibold">
                  On-device AI scores your punch speed, power & mechanics. Nothing leaves your device.
                </p>
              </header>

              {/* Compact steps — 2 lines each max */}
              <div className="flex flex-col gap-2">
                {[
                  { n:'1', text:'Stand 6–8 ft away at 45° angle to camera' },
                  { n:'2', text:'Full upper body (head to waist) must be visible' },
                  { n:'3', text:'Throw real punches freely for 30 seconds' },
                ].map(s => (
                  <div key={s.n} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-black text-sm shrink-0">{s.n}</div>
                    <span className="text-[11px] font-semibold text-white/70 leading-snug">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mt-1">
              <button
                onClick={() => setStage('setup')}
                className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider shadow-[0_0_25px_rgba(226,255,59,0.3)]"
              >
                SET UP CAMERA <Play className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={() => { nextStep(); }}
                className="w-full h-12 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20 transition-colors rounded-2xl"
              >
                <SkipForward className="w-4 h-4" /> SKIP — CONTINUE WITHOUT ANALYSIS
              </button>
              <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">Back</button>
            </div>
          </motion.div>
        )}

        {/* ── SETUP / LAUNCH ─────────────────────────────────── */}
        {stage === 'setup' && (
          <motion.div key="setup" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-15}} className="flex flex-col flex-1 justify-between gap-4">
            <header>
              <StepBadge />
              <h1 className="text-2xl font-black italic uppercase leading-[0.93] tracking-tighter text-white">
                Position <span className="text-primary">Camera</span>
              </h1>
              <p className="text-white/50 mt-1.5 text-xs leading-relaxed font-semibold">
                Place your phone at waist height, angled so you are at 45°. Step 6–8 feet away so your full upper body is in frame.
              </p>
            </header>

            {/* 45-degree diagram */}
            <div className="relative rounded-3xl bg-black border border-white/10 overflow-hidden aspect-video flex items-center justify-center">
              <svg viewBox="0 0 200 130" className="w-full h-full opacity-80">
                {/* floor */}
                <line x1="20" y1="110" x2="180" y2="110" stroke="rgba(226,255,59,0.3)" strokeWidth="1.5" strokeDasharray="4,3"/>
                {/* phone stand */}
                <rect x="88" y="95" width="24" height="14" rx="3" fill="none" stroke="#e2ff3b" strokeWidth="1.5"/>
                <line x1="100" y1="95" x2="100" y2="110" stroke="#e2ff3b" strokeWidth="1"/>
                <text x="100" y="122" textAnchor="middle" fill="rgba(226,255,59,0.6)" fontSize="7" fontWeight="bold">PHONE</text>
                {/* fighter silhouette (stick figure at 45deg left) */}
                <g transform="translate(38,30)">
                  <circle cx="8" cy="0" r="7" fill="none" stroke="#06b6d4" strokeWidth="1.5"/>
                  <line x1="8" y1="7" x2="8" y2="35" stroke="#06b6d4" strokeWidth="1.5"/>
                  <line x1="8" y1="15" x2="-2" y2="28" stroke="#06b6d4" strokeWidth="1.5"/>
                  <line x1="8" y1="15" x2="18" y2="22" stroke="#06b6d4" strokeWidth="1.5"/>
                  <line x1="8" y1="35" x2="2" y2="55" stroke="#06b6d4" strokeWidth="1.5"/>
                  <line x1="8" y1="35" x2="14" y2="55" stroke="#06b6d4" strokeWidth="1.5"/>
                </g>
                {/* 45deg arrow */}
                <line x1="100" y1="102" x2="52" y2="65" stroke="rgba(226,255,59,0.5)" strokeWidth="1" strokeDasharray="3,3"/>
                <text x="74" y="72" fill="rgba(226,255,59,0.8)" fontSize="9" fontWeight="bold">45°</text>
                {/* distance brace */}
                <line x1="46" y1="112" x2="88" y2="112" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                <text x="67" y="120" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6">6–8 FT</text>
              </svg>
            </div>

            {cameraError && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30">
                <p className="text-[10px] font-bold text-red-400 leading-snug">{cameraError}</p>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={startCamera}
                disabled={startingCamera}
                className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider shadow-[0_0_25px_rgba(226,255,59,0.35)] disabled:opacity-60"
              >
                {startingCamera ? 'STARTING CAMERA...' : 'START 30s ANALYSIS'} <Play className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={() => { nextStep(); }}
                className="w-full h-12 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20 transition-colors"
              >
                <SkipForward className="w-4 h-4" /> SKIP ANALYSIS
              </button>
              <button onClick={() => setStage('instructions')} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto flex items-center gap-1">
                ← Back to Instructions
              </button>
            </div>
          </motion.div>
        )}

        {/* ── RECORDING ─────────────────────────────────────── */}
        {stage === 'recording' && (
          <motion.div key="rec" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col flex-1 gap-3">
            {/* Camera viewport */}
            <div className="relative w-full rounded-[28px] overflow-hidden bg-black border-2 border-primary shadow-[0_0_40px_rgba(226,255,59,0.2)]" style={{aspectRatio:'4/5'}}>
              <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />

              {/* Top status bar */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black tracking-widest uppercase backdrop-blur-md ${calibDone ? 'bg-black/80 border-primary text-primary' : 'bg-black/80 border-white/20 text-white/70'}`}>
                  <span className={`w-2 h-2 rounded-full ${calibDone ? 'bg-primary animate-ping' : tracking ? 'bg-yellow-400 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
                  {calibDone ? 'BIO-TRACKING ACTIVE' : calibText}
                </div>
                {calibDone && (
                  <div className="px-3 py-1.5 rounded-full bg-primary text-black text-xs font-black tracking-wider shadow-[0_0_12px_rgba(226,255,59,0.4)]">
                    {timeLeft < 10 ? `0:0${timeLeft}` : `0:${timeLeft}`}
                  </div>
                )}
              </div>

              {/* Center target ring (shows while calibrating) */}
              {!calibDone && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-primary/50 animate-spin flex items-center justify-center" style={{animationDuration:'8s'}}>
                    <div className="w-16 h-16 rounded-full border border-primary/80 flex items-center justify-center">
                      <Zap className="w-7 h-7 text-primary animate-pulse" />
                    </div>
                  </div>
                  <span className="text-[8px] font-black uppercase text-primary tracking-widest bg-black/80 px-3 py-1 rounded-full border border-primary/30">
                    STEP INTO FRAME
                  </span>
                </div>
              )}

              {/* Bottom HUD (live metrics) */}
              {calibDone && (
                <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-2xl bg-black/85 border border-white/10 backdrop-blur-md">
                    <span className="text-[7px] font-bold text-white/50 uppercase block">STRIKES</span>
                    <span className="text-xl font-black text-white">{punchCount}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-black/85 border border-primary/20 backdrop-blur-md">
                    <span className="text-[7px] font-bold text-white/50 uppercase block">TIME LEFT</span>
                    <span className="text-xl font-black text-primary">{timeLeft}s</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={finishSession}
                className="absolute top-14 right-3 z-10 flex items-center gap-1.5 rounded-xl border border-red-400/50 bg-black/80 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-300 backdrop-blur-md"
              >
                <X className="w-3 h-3" /> Stop
              </button>
            </div>

            <p className="text-center text-[9px] text-white/40 font-bold uppercase tracking-wider">
              {calibDone ? 'THROW COMBINATIONS AT FULL SPEED — AI IS SCORING LIVE' : 'POSITION YOURSELF SO YOUR FULL UPPER BODY IS VISIBLE'}
            </p>
          </motion.div>
        )}

        {/* ── ANALYZING ──────────────────────────────────────── */}
        {stage === 'analyzing' && (
          <motion.div key="ana" initial={{opacity:0}} animate={{opacity:1}} className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin shadow-[0_0_30px_rgba(226,255,59,0.3)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase text-white tracking-wide">COMPUTING COMBAT SCORE</h2>
              <p className="text-[11px] text-white/50 font-semibold mt-1.5 leading-relaxed">
                Analyzing kinetic chain, punch velocity, torso rotation, and body mechanics...
              </p>
            </div>
            {[
              'Measuring peak angular velocity...',
              'Computing shoulder-rotation index...',
              'Calibrating power baseline...',
            ].map((t,i) => (
              <motion.div key={t} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.4+i*0.5}} className="flex items-center gap-2 text-[9px] font-bold text-white/40 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {t}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── RESULTS ───────────────────────────────────────── */}
        {stage === 'results' && result && (
          <motion.div key="res" initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} className="flex flex-col flex-1 justify-between gap-3">
            <header>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-wider mb-1.5">
                <Flame className="w-3 h-3 animate-pulse" /> BASELINE GENERATED
              </div>
              <h1 className="text-2xl font-black italic uppercase leading-[0.93] tracking-tighter text-white">
                Your Initial <span className="text-primary">Combat Score</span>
              </h1>
              <p className="text-white/50 mt-1 text-[10px] font-semibold leading-relaxed">
                {result.punchCount < 3
                  ? 'Not enough punches were detected for a full score.'
                  : 'Real AI-measured biomechanical score from your 30-second freestyle round.'}
              </p>
            </header>

            {result.punchCount < 3 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm font-black text-white/60 uppercase">Not Enough Data</p>
                <p className="text-[10px] text-white/40 font-semibold">Detected {result.punchCount} punch{result.punchCount!==1?'es':''}. Throw at least 3 validated punches to get your score.</p>
              </div>
            ) : (
              <>
                {/* Unlocked scores */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Total Score - hero */}
                  <div className="col-span-2 p-4 rounded-3xl border border-primary/50 bg-gradient-to-br from-primary/20 to-primary/5 shadow-[0_0_30px_rgba(226,255,59,0.2)] flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-wider text-primary">TOTAL COMBAT SCORE</span>
                      <div className="flex items-end gap-1.5 mt-0.5">
                        <span className="text-5xl font-black text-white leading-none">{result.totalScore}</span>
                        <span className="text-sm font-bold text-white/40 mb-1">/100</span>
                      </div>
                      <span className="text-[8px] font-bold text-white/60 uppercase mt-1">
                        {result.totalScore>=75?'HIGH POTENTIAL FIGHTER':result.totalScore>=50?'DEVELOPING COMBATANT':'BASELINE ESTABLISHED'}
                      </span>
                    </div>
                    <div className="ml-auto flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full border-2 border-primary/40 flex items-center justify-center" style={{background:`conic-gradient(#e2ff3b ${result.totalScore*3.6}deg, rgba(226,255,59,0.08) 0deg)`}}>
                        <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                          <span className="text-sm font-black text-primary">{result.totalScore}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-white/10 bg-black/40">
                    <span className="text-[8px] font-black uppercase tracking-wider text-white/50 block">PUNCH POWER</span>
                    <span className="text-2xl font-black text-primary">{result.powerScore}<span className="text-xs text-white/40 font-bold">/100</span></span>
                    <span className="text-[7px] text-white/40 font-bold uppercase block mt-0.5">Peak {result.peakVelocity}°/s</span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-white/10 bg-black/40">
                    <span className="text-[8px] font-black uppercase tracking-wider text-white/50 block">BODY MECHANICS</span>
                    <span className="text-2xl font-black text-white">{result.rotationScore}<span className="text-xs text-white/40 font-bold">/100</span></span>
                    <span className="text-[7px] text-white/40 font-bold uppercase block mt-0.5">{result.punchCount} punches tracked</span>
                  </div>
                </div>

                {/* Locked section — teaser */}
                <div className="relative rounded-3xl border border-white/10 bg-black/40 p-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/40">ADVANCED METRICS</span>
                    <span className="text-[7px] font-black text-primary/70 uppercase">COMPLETE ONBOARDING</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 filter blur-[4px] select-none pointer-events-none opacity-30">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[7px] text-white/40 uppercase block">STRIKE ACCURACY</span>
                      <span className="text-base font-black text-white">91.4%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[7px] text-white/40 uppercase block">KINETIC CHAIN</span>
                      <span className="text-base font-black text-white">482 PSI</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center">
                    <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(226,255,59,0.3)]">
                      <Lock className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wide text-white">2 MORE COMBAT MERITS LOCKED</span>
                    <p className="text-[9px] font-semibold text-white/60 mt-1 max-w-[240px] leading-snug">
                      Finish the remaining questions to unlock your Strike Accuracy & Kinetic Power breakdown.
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={nextStep}
                className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider shadow-[0_0_25px_rgba(226,255,59,0.3)]"
              >
                CONTINUE ONBOARDING <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* results with no data / skip */}
        {stage === 'results' && !result && (
          <motion.div key="skip" className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-white/50 text-sm font-bold uppercase">Analysis Unavailable</p>
            <button onClick={nextStep} className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm font-black">CONTINUE <ChevronRight size={18}/></button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
