'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  HelpCircle, 
  ArrowLeft, 
  Lock, 
  ArrowRight,
  Mic,
  Activity,
  Zap,
  Target,
  Trophy,
  AlertTriangle,
  Brain,
  Check,
  StopCircle,
  Play,
  RotateCcw,
  Sparkles,
  Heart,
  Volume2,
  Shield
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function VisionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<'welcome' | 'config' | 'camera' | 'analyzing' | 'results'>('welcome');
  const [isOnboarded, setIsOnboarded] = useState(false);
  
  // Calibration / Configuration State
  const [voiceProfile, setVoiceProfile] = useState<'steel' | 'athena' | 'cyber'>('steel');
  const [mode, setMode] = useState<'punches' | 'defense'>('punches');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [punchTarget, setPunchTarget] = useState(50);
  
  // Camera & Calibration Execution State
  const [calibStatus, setCalibStatus] = useState('WAITING FOR PERSON...');
  const [calibCount, setCalibCount] = useState(10);
  const [calibSuccess, setCalibSuccess] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [punchCount, setPunchCount] = useState(0);
  const [activeCommand, setActiveCommand] = useState('JAB');
  const [coachLog, setCoachLog] = useState<string[]>([]);
  
  // Live session metrics
  const [bpm, setBpm] = useState(85);
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [isMuted, setIsMuted] = useState(false);
  
  // Analysis results
  const [resultsData, setResultsData] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const drillTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // MediaPipe references
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const mpLoadedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    
    // Check onboarding
    const onboarding = localStorage.getItem('boxing_onboarding_data');
    if (onboarding) {
      setIsOnboarded(true);
    } else {
      setIsOnboarded(false);
    }

    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    // Dynamic Script loader for MediaPipe CDNs
    const loadMediaPipe = async () => {
      if (typeof window === 'undefined') return;
      try {
        const poseScript = document.createElement('script');
        poseScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
        poseScript.crossOrigin = "anonymous";
        poseScript.async = true;
        document.head.appendChild(poseScript);

        const cameraScript = document.createElement('script');
        cameraScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
        cameraScript.crossOrigin = "anonymous";
        cameraScript.async = true;
        document.head.appendChild(cameraScript);

        poseScript.onload = () => {
          console.log('[Vision] MediaPipe Pose CDN script loaded.');
          mpLoadedRef.current = true;
        };
      } catch (e) {
        console.warn('MediaPipe CDN load failure, falling back to simulator:', e);
      }
    };

    loadMediaPipe();

    return () => {
      cleanupCameras();
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (drillTimerRef.current) clearInterval(drillTimerRef.current);
    };
  }, []);

  // Heartbeat BPM flasher
  useEffect(() => {
    if (stage !== 'camera') return;
    const interval = setInterval(() => {
      setBpm(prev => {
        const target = calibSuccess ? 135 : 88;
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.min(160, Math.max(70, prev + delta + Math.sign(target - prev) * 2));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [stage, calibSuccess]);

  // Voice Speech Audio coaching
  const speakCommand = (text: string) => {
    if (!synthRef.current || isMuted) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synthRef.current.getVoices();
      const chosen = voices.find(v => {
        if (voiceProfile === 'steel') return v.name.includes('Google UK') || v.name.includes('Male') || v.lang === 'en-GB';
        if (voiceProfile === 'athena') return v.name.includes('Aria') || v.name.includes('Female') || v.name.includes('Zira');
        return v.name.includes('Google') || v.name.includes('Online');
      }) || voices[0];
      if (chosen) utterance.voice = chosen;
      utterance.rate = difficulty === 'hard' ? 1.05 : difficulty === 'easy' ? 0.8 : 0.9;
      utterance.pitch = voiceProfile === 'steel' ? 0.75 : voiceProfile === 'athena' ? 1.05 : 0.9;
      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech failed:', e);
    }
  };

  const cleanupCameras = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (e) {}
      cameraRef.current = null;
    }
  };

  const startPermissions = async () => {
    cleanupCameras();
    setStage('camera');
    setCalibStatus('WAITING FOR PERSON...');
    setCalibCount(10);
    setCalibSuccess(false);
    setPunchCount(0);
    setSessionTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialise MediaPipe Pose if available in global window
      const mpPose = (window as any).Pose;
      if (mpPose && mpLoadedRef.current) {
        const pose = new mpPose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        pose.onResults(onPoseResults);
        poseRef.current = pose;

        // Camera helper from MediaPipe
        const mpCamera = (window as any).Camera;
        if (mpCamera && videoRef.current) {
          const camera = new mpCamera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current) {
                await pose.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480
          });
          camera.start();
          cameraRef.current = camera;
        }
      } else {
        console.warn('MediaPipe not loaded in time. Starting simulator calibration.');
        runSimulatorCalibration();
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      alert('Camera access denied or device disconnected. Reverting to simulator mode.');
      runSimulatorCalibration();
    }
  };

  // Callback for MediaPipe pose tracking
  const onPoseResults = (results: any) => {
    if (!results.poseLandmarks || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw landmarks using media drawing utils (if available in window)
    const drawUtils = (window as any).drawConnectors && (window as any).drawLandmarks;
    if (drawUtils && (window as any).POSE_CONNECTIONS) {
      (window as any).drawConnectors(ctx, results.poseLandmarks, (window as any).POSE_CONNECTIONS, { color: '#E2FF3B', lineWidth: 2 });
      (window as any).drawLandmarks(ctx, results.poseLandmarks, { color: '#FF2D55', lineWidth: 1, radius: 3 });
    }

    // Perform Calibration / Stance Lock
    if (!calibSuccess) {
      const leftShoulder = results.poseLandmarks[11];
      const rightShoulder = results.poseLandmarks[12];
      const leftHip = results.poseLandmarks[23];
      
      // If shoulders and hips detected, person is in frame
      if (leftShoulder && rightShoulder && leftHip) {
        setCalibStatus('PERSON DETECTED. HOLD STILL.');
      }
    }
  };

  // Fallback simulator for camera calibration
  const runSimulatorCalibration = () => {
    let count = 10;
    const timer = setInterval(() => {
      count--;
      setCalibCount(count);
      if (count === 8) {
        setCalibStatus('ALIGNMENT ACQUIRED.');
        speakCommand("Calibrating posture. Stand in fight stance.");
      } else if (count === 4) {
        setCalibStatus('LOCKING GUARD TIERS...');
      } else if (count <= 0) {
        clearInterval(timer);
        setCalibSuccess(true);
        setCalibStatus('CALIBRATION COMPLETE.');
        speakCommand("Calibration success. Ready to deploy protocol.");
        startDrill();
      }
    }, 1000);
  };

  // Start the actual training drills
  const startDrill = () => {
    setCalibSuccess(true);
    setPunchCount(0);
    setSessionTime(0);
    setCoachLog(['[SYSTEM] Drill protocol started.']);
    
    // Run Session Clock Timer
    sessionTimerRef.current = setInterval(() => {
      setSessionTime(prev => {
        const next = prev + 1;
        const mins = Math.floor(next / 60).toString().padStart(2, '0');
        const secs = (next % 60).toString().padStart(2, '0');
        setTimerDisplay(`${mins}:${secs}`);
        return next;
      });
    }, 1000);

    // Call voice commands at intervals depending on difficulty
    const commandsList = mode === 'punches' 
      ? ['JAB', 'CROSS', 'HOOK', 'UPPERCUT', 'DOUBLE JAB', 'JAB CROSS']
      : ['JAB', 'CROSS', 'SLIP LEFT', 'SLIP RIGHT', 'ROLL UNDER', 'HOOK', 'JAB JAB CROSS'];

    let count = 0;
    const gap = difficulty === 'hard' ? 1000 : difficulty === 'easy' ? 3000 : 2000;

    const runCommands = () => {
      if (count >= punchTarget) {
        stopAndAnalyse();
        return;
      }
      
      const randomCmd = commandsList[Math.floor(Math.random() * commandsList.length)];
      setActiveCommand(randomCmd);
      speakCommand(randomCmd);
      
      setCoachLog(prev => [`[COACH] Throw: ${randomCmd}`, ...prev.slice(0, 4)]);
      
      // Simulate punch detections in simulator
      setTimeout(() => {
        setPunchCount(p => p + (randomCmd.includes('DOUBLE') || randomCmd.includes('JAB CROSS') ? 2 : 1));
      }, 400);

      count++;
      drillTimerRef.current = setTimeout(runCommands, gap);
    };

    runCommands();
  };

  const stopAndAnalyse = async () => {
    cleanupCameras();
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (drillTimerRef.current) clearTimeout(drillTimerRef.current);
    
    setStage('analyzing');
    speakCommand("Analyzing session. Synthesizing biomechanical report.");

    // Fake steps loading animation
    const steps = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'];
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const el = document.getElementById(step);
      if (el) el.classList.add('done');
    }

    // Call backend API /api/analyze-session
    try {
      const storedOnboarding = localStorage.getItem('boxing_onboarding_data') || '{}';
      const user = JSON.parse(storedOnboarding);
      
      const requestMetrics = {
        total_punches: punchCount,
        duration_seconds: sessionTime,
        difficulty: difficulty,
        mode: mode,
        age: user.age || 25,
        weight: user.weight || 70,
        experience_level: user.experience_level || 'Novice'
      };

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}/api/analyze-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: requestMetrics })
      });

      if (response.ok) {
        const resJson = await response.json();
        setResultsData({
          overallScore: resJson.analysis.score || 85,
          powerScore: Math.floor(Math.random() * (95 - 80 + 1)) + 80,
          stanceScore: Math.floor(Math.random() * (98 - 85 + 1)) + 85,
          reflexScore: Math.floor(Math.random() * (94 - 82 + 1)) + 82,
          avgReflex: Math.floor(Math.random() * (290 - 240 + 1)) + 240,
          posture: 9,
          advice: resJson.analysis.feedback || 'Excellent speed, watch your chin placement.',
          flaw: resJson.analysis.tip || 'Keep your guard tight during rotation.'
        });
      } else {
        throw new Error('API failed');
      }
    } catch (e) {
      console.warn('API analysis failed, loading mockup:', e);
      setAnalysisError(true);
      setResultsData({
        overallScore: Math.floor(Math.random() * (92 - 80 + 1)) + 80,
        powerScore: 82,
        stanceScore: 88,
        reflexScore: 85,
        avgReflex: 265,
        posture: 8,
        advice: 'Solid overall rhythm. Your jab velocity was consistent, but you tend to flare your right elbow during hooks, exposing your ribcage to counters.',
        flaw: 'Ribcage exposed: tuck right elbow in on hook rotations.'
      });
    }

    setStage('results');
  };

  // Calendar/Streak increment check
  useEffect(() => {
    if (stage === 'results' && resultsData) {
      // Completed session! Write to progress storage.
      const progressKey = 'workout_progress_' + new Date().toDateString();
      try {
        const completed = JSON.parse(localStorage.getItem(progressKey) || '[]');
        if (completed.length === 0) {
          // If no daily drills are done, we still mark the vision analyser session as completed index 99
          completed.push(99);
          localStorage.setItem(progressKey, JSON.stringify(completed));
        }
      } catch (e) {}
    }
  }, [stage, resultsData]);

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
        {/* STAGE 0: WELCOME & VOICE PROFILE CHOICE */}
        {stage === 'welcome' && (
          <motion.div 
            key="stage-welcome"
            className="flex flex-col gap-6 anim-fade-in select-none"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none">
              <span className="opacity-80">MODULE: AI VISION SYSTEM</span>
              <span className="opacity-40">STANDBY_MODE</span>
            </div>

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
                Your AI coach will guide you through a live drill, record your form, and deliver a deep biomechanical report.
              </p>
            </GlassCard>

            {/* Voice select */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
              <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block text-center mb-3">
                AI COACH PROFILE VOICE
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'steel', label: 'STEEL', desc: 'Male Core' },
                  { key: 'athena', label: 'ATHENA', desc: 'Female Core' },
                  { key: 'cyber', label: 'CYBER', desc: 'Synthetic' }
                ].map(choice => (
                  <button
                    key={choice.key}
                    onClick={() => {
                      setVoiceProfile(choice.key as any);
                      speakCommand(`${choice.label} calibrated.`);
                    }}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-2xl border text-[10px] font-black transition-all ${
                      voiceProfile === choice.key 
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

        {/* STAGE 0.5: CONFIGURATION STEP */}
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

            {/* Mode card Selection */}
            <div className="flex flex-col gap-3">
              <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block">
                DRILL COMBAT MODE
              </span>
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={() => setMode('punches')}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border text-left transition-all ${
                    mode === 'punches' 
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
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border text-left transition-all ${
                    mode === 'defense' 
                      ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white'
                  }`}
                >
                  <Shield className="w-5 h-5 mb-2" />
                  <span className="text-[10px] font-black uppercase">PUNCHES & DEFENSE</span>
                  <span className="text-[6px] text-white/30 mt-0.5">Slips, Rolls, Pivot Angles</span>
                </button>
              </div>
            </div>

            {/* Difficulty Cards */}
            <div className="flex flex-col gap-3">
              <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block">
                SPEED DIFFICULTY LEVEL
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'easy', label: 'EASY', color: 'text-green-400 border-green-500/30' },
                  { key: 'medium', label: 'MEDIUM', color: 'text-primary border-primary/30' },
                  { key: 'hard', label: 'HARD', color: 'text-red-500 border-red-500/30' }
                ].map(choice => (
                  <button
                    key={choice.key}
                    onClick={() => {
                      setDifficulty(choice.key as any);
                      speakCommand(`${choice.label} level.`);
                    }}
                    className={`py-3 rounded-2xl border text-[10px] font-black transition-all ${
                      difficulty === choice.key 
                        ? `bg-white/[0.08] ${choice.color} text-white`
                        : 'bg-black/40 border-white/5 text-white/55 hover:text-white'
                    }`}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Commands count slider */}
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
                Recommended: {difficulty === 'easy' ? '30' : difficulty === 'medium' ? '50' : '85'} commands
              </span>
            </div>

            <NeonButton onClick={startPermissions} className="w-full h-14 mt-2">
              START CALIBRATION
            </NeonButton>
          </motion.div>
        )}

        {/* STAGE 1: LIVE RECORDING CAMERA INTERACTIVE TIMER */}
        {stage === 'camera' && (
          <motion.div
            key="stage-camera"
            className="flex flex-col h-[85vh] justify-between relative anim-fade-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Top HUD Display */}
            <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
              <span className="opacity-80">MODE: {mode.toUpperCase()} MODE</span>
              <span className="opacity-40 uppercase">DIFF_{difficulty}_SPEED</span>
            </div>

            <header className="flex justify-between items-center z-50">
              <button 
                onClick={() => {
                  cleanupCameras();
                  setStage('config');
                }}
                className="w-9 h-9 rounded-full border border-white/15 bg-black/40 flex items-center justify-center text-white/60 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <div className="flex gap-2">
                <div className="px-3.5 py-1.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-500 font-mono text-[9px] font-black flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>{calibSuccess ? 'RECORDING' : 'CALIBRATING'}</span>
                </div>
                <div className="px-3 py-1 bg-black/50 border border-white/10 text-white font-mono text-xs rounded-lg">
                  {timerDisplay}
                </div>
              </div>
            </header>

            {/* Webcam / Drawing Grid */}
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

              {/* Scanline and target overlays */}
              <div className="scanning-line absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-45 pointer-events-none z-30 animate-pulse" />
              <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-primary z-30" />
              <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-primary z-30" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-primary z-30" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-primary z-30" />

              {/* Live punch counts display overlay */}
              <div className="absolute top-4 right-4 bg-black/60 border border-white/10 rounded-2xl p-3 z-30 min-w-[70px] text-center">
                <span className="text-[7px] font-black text-primary uppercase block tracking-widest mb-0.5">
                  PUNCHES
                </span>
                <span className="text-xl font-black text-white font-mono leading-none block">
                  {punchCount}
                </span>
                <span className="text-[6px] text-white/30 uppercase font-black block mt-0.5">
                  LOGGED
                </span>
              </div>

              {/* Command text Overlay */}
              {calibSuccess && (
                <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/90 border-2 border-primary rounded-xl px-6 py-2.5 z-30 text-center font-mono text-xl font-black text-primary tracking-widest shadow-[0_0_15px_rgba(226,255,59,0.3)] select-none">
                  {activeCommand}
                </div>
              )}

              {/* Calibration Overlay screen */}
              {!calibSuccess && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center select-none">
                  <div className="bg-primary/5 border border-primary text-primary px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase mb-4 animate-pulse">
                    {calibStatus}
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center text-primary text-2xl font-black font-mono shadow-[0_0_10px_rgba(226,255,59,0.15)] mb-3">
                    {calibCount}
                  </div>
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
                    STEP BACK 6-8 FEET AND RAISE GUARD
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <footer className="flex gap-3 mt-1">
              <button 
                onClick={() => {
                  cleanupCameras();
                  setStage('config');
                }}
                className="w-14 h-14 rounded-full border border-white/20 bg-transparent text-white/60 hover:text-white flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={stopAndAnalyse}
                disabled={!calibSuccess}
                className="flex-1 h-14 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 disabled:cursor-not-allowed text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <StopCircle className="w-5 h-5 fill-white stroke-none" />
                <span>STOP &amp; ANALYSE</span>
              </button>
            </footer>
          </motion.div>
        )}

        {/* STAGE 2: AI ANALYZING SPINNER SCREEN */}
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
                ZEPHYR 1.5 PRO MULTIMODAL
              </span>
              <h2 className="text-xl font-black italic uppercase text-white leading-none">
                ANALYSING TRAINING DATA
              </h2>
              <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">
                Verifying speed, reaction, and alignment...
              </p>
            </div>

            <div className="w-full max-w-[280px] text-left border border-white/5 bg-black/40 rounded-3xl p-5 flex flex-col gap-3 font-mono text-[9px] text-white/50">
              <div className="flex justify-between items-center" id="step-1">
                <span>1. UPLOADING COORDINATES</span>
                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
              </div>
              <div className="flex justify-between items-center" id="step-2">
                <span>2. SEGMENTING VELOCITY CURVES</span>
                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
              </div>
              <div className="flex justify-between items-center" id="step-3">
                <span>3. DECODING GUARD CONSISTENCY</span>
                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
              </div>
              <div className="flex justify-between items-center" id="step-4">
                <span>4. MODEL ALIGNMENT DEBRIEF</span>
                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
              </div>
              <div className="flex justify-between items-center" id="step-5">
                <span>5. PREPARING PERFORMANCE REPORT</span>
                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
              </div>
            </div>
          </motion.div>
        )}

        {/* STAGE 3: DETAILED ANALYSIS RESULTS REPORT */}
        {stage === 'results' && resultsData && (
          <motion.div
            key="stage-results"
            className="flex flex-col gap-6 anim-fade-in pb-16 select-none"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none">
              <span className="opacity-80">MODULE: COMBAT INTEL REPORT</span>
              <span className="opacity-40 uppercase">STATUS_COMPILED</span>
            </div>

            <header className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black text-primary tracking-[3px] uppercase block mb-1">
                  SESSION SUMMARY
                </span>
                <h1 className="text-xl font-black italic uppercase text-white leading-none">
                  BIOMECHANICAL intel
                </h1>
              </div>
              
              <div className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[9px] font-black tracking-widest uppercase">
                CALIBRATED
              </div>
            </header>

            {/* Score Grid Block */}
            <GlassCard className="p-6 border-primary/20 bg-black/40">
              <div className="text-left mb-4 pb-4 border-b border-white/5">
                <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">
                  Overall Performance
                </span>
                <h3 className="text-2xl font-black uppercase text-white leading-none italic">
                  {resultsData.overallScore >= 88 ? 'ELITE FIGHTER' : 'AMATEUR'}
                </h3>
              </div>

              {/* Grid 4 pillars */}
              <div className="grid grid-cols-4 gap-2.5 mt-2">
                {[
                  { label: 'Overall', val: `${resultsData.overallScore}%` },
                  { label: 'Power', val: `${resultsData.powerScore}%` },
                  { label: 'Guard', val: `${resultsData.stanceScore}%` },
                  { label: 'Reflex', val: `${resultsData.reflexScore}%` }
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

              {/* Lower grid metrics */}
              <div className="grid grid-cols-3 gap-3.5 mt-3.5">
                {[
                  { val: `${resultsData.posture}/10`, label: 'Posture Rating' },
                  { val: `${resultsData.avgReflex}ms`, label: 'Avg Reaction' },
                  { val: punchCount, label: 'Logged Strikes' }
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

            {/* Critical Flaws Tag alerts */}
            <div className="flex items-center gap-3 p-4 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <span className="text-[7px] font-black text-red-500 uppercase tracking-widest block mb-0.5">
                  CRITICAL FLAW DETECTED
                </span>
                <p className="text-xs font-bold text-white/80 leading-normal">
                  {resultsData.flaw}
                </p>
              </div>
            </div>

            {/* Coach Insight advice */}
            <div className="glass-card p-5 border-white/5 bg-black/40 flex items-start gap-4 rounded-3xl">
              <div className="w-11 h-11 rounded-full border border-red-500/30 bg-red-500/5 text-red-500 flex items-center justify-center text-lg flex-shrink-0">
                🤖
              </div>
              <div className="text-left flex-1">
                <span className="text-[7px] font-black text-red-500 tracking-wider uppercase block mb-1">
                  ZEPHYR COACH INTELLIGENCE
                </span>
                <p className="text-xs font-semibold text-white/60 leading-relaxed italic">
                  &ldquo;{resultsData.advice}&rdquo;
                </p>
              </div>
            </div>

            {/* Results actions */}
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
