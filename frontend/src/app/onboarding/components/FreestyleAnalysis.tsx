'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronRight, Zap, Play, Lock, Sparkles, Shield, Activity, RefreshCw } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

export default function FreestyleAnalysis(): JSX.Element {
  const { nextStep, prevStep } = useOnboarding();
  const [stage, setStage] = useState<'instructions' | 'recording' | 'analyzing' | 'results'>('instructions');
  const [timeLeft, setTimeLeft] = useState(30);
  const [punchesDetected, setPunchesDetected] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const punchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start webcam for 30s quick drill
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setCameraError(null);
    } catch {
      setCameraError('Camera preview unavailable on this device. Simulation mode activated.');
      setCameraActive(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleStartAnalysis = async () => {
    await startCamera();
    setStage('recording');
    setTimeLeft(30);
    setPunchesDetected(0);

    // Punch detection simulation loop
    punchTimerRef.current = setInterval(() => {
      setPunchesDetected((prev) => prev + Math.floor(Math.random() * 2) + 1);
    }, 1200);
  };

  // Timer countdown
  useEffect(() => {
    if (stage === 'recording') {
      if (timeLeft <= 0) {
        if (punchTimerRef.current) clearInterval(punchTimerRef.current);
        stopCamera();
        setStage('analyzing');
        setTimeout(() => {
          setStage('results');
        }, 2200);
        return;
      }
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [stage, timeLeft]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (punchTimerRef.current) clearInterval(punchTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      {/* 1. Instructions Screen */}
      {stage === 'instructions' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col flex-1 justify-between"
        >
          <header className="text-left mb-4">
            <StepBadge />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-wider mb-2">
              <Zap className="w-3 h-3" /> Quick AI Calibration
            </div>
            <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
              30-Second <span className="text-primary">Freestyle Punch Analysis</span>
            </h1>
            <p className="text-white/50 mt-2 text-xs leading-relaxed font-semibold">
              Before building your roadmap, our computer vision model needs a quick baseline of your striking speed and reflexes.
            </p>
          </header>

          <main className="flex-1 flex flex-col gap-3 justify-center">
            <div className="p-4 rounded-3xl border border-white/10 bg-white/[0.03] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 font-black text-sm">
                1
              </div>
              <div>
                <span className="text-xs font-black uppercase text-white tracking-wide block">Place Phone Down</span>
                <span className="text-[10px] text-white/50 font-semibold leading-tight block">
                  Prop your phone against a wall or water bottle so your head and torso are in frame.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl border border-white/10 bg-white/[0.03] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 font-black text-sm">
                2
              </div>
              <div>
                <span className="text-xs font-black uppercase text-white tracking-wide block">Throw Free Punches</span>
                <span className="text-[10px] text-white/50 font-semibold leading-tight block">
                  Throw jabs, crosses, hooks or combos into the air for 30 seconds at your normal pace.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl border border-white/10 bg-white/[0.03] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 font-black text-sm">
                3
              </div>
              <div>
                <span className="text-xs font-black uppercase text-white tracking-wide block">Instant AI Score</span>
                <span className="text-[10px] text-white/50 font-semibold leading-tight block">
                  Get your baseline combat score, power index, and unlock further metrics in onboarding.
                </span>
              </div>
            </div>
          </main>

          <footer className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleStartAnalysis}
              className="btn-primary w-full h-15 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider shadow-[0_0_25px_rgba(226,255,59,0.35)]"
            >
              START 30S ANALYSIS NOW <Play className="w-4 h-4 fill-current ml-1" />
            </button>
            <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
              Back
            </button>
          </footer>
        </motion.div>
      )}

      {/* 2. Recording & Vision Tracking Mode */}
      {stage === 'recording' && (
        <div className="flex flex-col flex-1 justify-between relative">
          <div className="relative w-full h-[62vh] rounded-[32px] overflow-hidden border-2 border-primary bg-black flex items-center justify-center shadow-[0_0_40px_rgba(226,255,59,0.25)]">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* AI HUD Overlay Elements */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 border border-primary text-primary text-[9px] font-black tracking-widest uppercase backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  BIO-TRACKING ACTIVE
                </div>

                <div className="px-3.5 py-1 rounded-full bg-primary text-black text-xs font-black tracking-wider">
                  00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                </div>
              </div>

              {/* Center Kinetic Target Ring */}
              <div className="self-center flex flex-col items-center">
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center animate-spin" style={{ animationDuration: '8s' }}>
                  <div className="w-20 h-20 rounded-full border border-primary/80 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase text-primary tracking-widest mt-2 bg-black/70 px-3 py-0.5 rounded-full border border-primary/30">
                  THROW COMBINATIONS
                </span>
              </div>

              {/* Bottom Real-Time Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-md">
                  <span className="text-[8px] font-bold text-white/50 uppercase block">STRIKES COUNTED</span>
                  <span className="text-xl font-black text-white">{punchesDetected}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-md">
                  <span className="text-[8px] font-bold text-white/50 uppercase block">VELOCITY INDEX</span>
                  <span className="text-xl font-black text-primary">{(18 + (punchesDetected * 1.4)).toFixed(1)} km/h</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
              Keep throwing punches until the 30s timer finishes
            </span>
          </div>
        </div>
      )}

      {/* 3. Analyzing State */}
      {stage === 'analyzing' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin flex items-center justify-center shadow-[0_0_30px_rgba(226,255,59,0.3)]">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase text-white tracking-wide">
              COMPUTING BIO-METRIC SCORE
            </h2>
            <p className="text-xs text-white/50 font-semibold mt-1">
              Analyzing kinetic chain, punch snap, and output volume...
            </p>
          </div>
        </div>
      )}

      {/* 4. Results Screen with Blurred Remaining Metrics & Teaser */}
      {stage === 'results' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col flex-1 justify-between"
        >
          <header className="text-left mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3 h-3" /> BASELINE GENERATED
            </div>
            <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
              Your Initial <span className="text-primary">Combat Score</span>
            </h1>
            <p className="text-white/50 mt-1 text-xs font-semibold leading-relaxed">
              Based on your 30s freestyle round. Complete onboarding to unlock all remaining performance merits.
            </p>
          </header>

          <main className="flex-1 flex flex-col gap-3 py-1">
            {/* Unlocked Top Metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-4 rounded-3xl border border-primary/40 bg-gradient-to-b from-primary/15 to-black/60 shadow-[0_0_20px_rgba(226,255,59,0.15)]">
                <span className="text-[9px] font-black uppercase tracking-wider text-primary block">TOTAL SCORE</span>
                <div className="text-3xl font-black text-white mt-0.5">
                  84<span className="text-xs text-white/40 font-bold">/100</span>
                </div>
                <span className="text-[8px] font-bold text-white/60 uppercase block mt-1">High Potential</span>
              </div>

              <div className="p-4 rounded-3xl border border-white/10 bg-black/40">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/50 block">REFLEX SPEED</span>
                <div className="text-3xl font-black text-primary mt-0.5">
                  218<span className="text-xs text-white/40 font-bold">ms</span>
                </div>
                <span className="text-[8px] font-bold text-white/60 uppercase block mt-1">Top 22% Baseline</span>
              </div>
            </div>

            {/* Blurred Locked Section with Notice */}
            <div className="relative rounded-3xl border border-white/10 bg-black/40 p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3 filter blur-[3px] select-none pointer-events-none opacity-40">
                <div>
                  <span className="text-[9px] font-black text-white/50 uppercase">PUNCH POWER INDEX</span>
                  <div className="text-xl font-black text-white">482 PSI</div>
                </div>
                <div>
                  <span className="text-[9px] font-black text-white/50 uppercase">STRIKE ACCURACY</span>
                  <div className="text-xl font-black text-white">91.4%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 filter blur-[3.5px] select-none pointer-events-none opacity-30">
                <div className="h-10 rounded-xl bg-white/5" />
                <div className="h-10 rounded-xl bg-white/5" />
              </div>

              {/* Locked Overlay Card */}
              <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mb-1.5 shadow-[0_0_12px_rgba(226,255,59,0.3)]">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-wide text-white">
                  2 MORE METRICS LOCKED
                </span>
                <p className="text-[10px] font-semibold text-white/60 mt-1 max-w-[260px] leading-tight">
                  Complete remaining onboarding questions to unlock your Strike Accuracy & Kinetic Power breakdown.
                </p>
              </div>
            </div>
          </main>

          <footer className="mt-5 flex flex-col gap-3">
            <button
              onClick={nextStep}
              className="btn-primary w-full h-15 flex items-center justify-center gap-2 text-sm font-black italic tracking-wider shadow-[0_0_25px_rgba(226,255,59,0.3)]"
            >
              CONTINUE ONBOARDING <ChevronRight size={18} />
            </button>
            <button onClick={() => setStage('instructions')} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Re-test Punch Analysis
            </button>
          </footer>
        </motion.div>
      )}
    </div>
  );
}
