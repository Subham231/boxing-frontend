'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Check, 
  Heart, 
  Flame, 
  Mic, 
  Target
} from 'lucide-react';
import { getDailyWorkout } from '@/lib/workout-data';
import { getProtocolBlock, loadCachedDrills, markDrillComplete, markProtocolFullyComplete } from '@/lib/protocol-session';
import type { ProtocolSessionDrill, Workout } from '@/types';

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface SessionWorkout extends Omit<Workout, 'drills' | 'focus'> {
  focus?: string;
  drills: ProtocolSessionDrill[];
}

function SessionTimerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const drillIndex = parseInt(searchParams.get('index') || '0', 10);
  const source = searchParams.get('source') || 'daily';
  const dayIdx = searchParams.get('day');
  const pIdx = searchParams.get('p');
  const autostart = searchParams.get('autostart') === '1';
  
  const isProtocol = source === 'protocol' && dayIdx !== null && pIdx !== null;

  const [workout, setWorkout] = useState<SessionWorkout | null>(null);
  const [currentDrill, setCurrentDrill] = useState<ProtocolSessionDrill | null>(null);
  
  // Game loops
  const [phase, setPhase] = useState<'idle' | 'prep' | 'active' | 'rest'>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  
  // Simulated stats
  const [bpm, setBpm] = useState(90);
  const [calories, setCalories] = useState(0);
  
  // Voice Telemetry
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // References
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Speech synthesis voice setting
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check speech synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    // Get workout data
    let sessionWorkout: SessionWorkout | null = null;
    if (isProtocol) {
      try {
        const protocol = getProtocolBlock(dayIdx!, pIdx!);
        const drills = loadCachedDrills(dayIdx!, pIdx!);
        if (protocol) {
          sessionWorkout = {
            title: protocol.title || 'Protocol Block',
            drills,
          };
        }
      } catch (e) {
        console.error('Failed to parse protocol drills:', e);
      }
    } else {
      sessionWorkout = getDailyWorkout();
    }

    if (!sessionWorkout || !sessionWorkout.drills || drillIndex >= sessionWorkout.drills.length) {
      router.replace('/training');
      return;
    }

    setWorkout(sessionWorkout);
    const drill = sessionWorkout.drills[drillIndex];
    setCurrentDrill(drill);

    if (drill.type === 'timer') {
      const dur = drill.duration || 60;
      setTotalTime(dur);
      setTimeLeft(dur);
    } else {
      // Reps based
      setTotalTime(0);
      setTimeLeft(0);
    }

    // Autostart sequence
    if (autostart) {
      setTimeout(() => {
        handleStart();
      }, 500);
    }

    // Initialize Web Speech API for voice triggers
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as WindowWithSpeechRecognition).SpeechRecognition || (window as WindowWithSpeechRecognition).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setVoiceSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onresult = (event) => {
          const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
          console.log('[Voice Engine] Detected:', command);
          if (command.includes('start') || command.includes('begin')) {
            handleStart();
          } else if (command.includes('pause') || command.includes('hold')) {
            setIsPaused(true);
          } else if (command.includes('resume') || command.includes('play')) {
            setIsPaused(false);
          } else if (command.includes('stop') || command.includes('end') || command.includes('finish')) {
            handleMainAction();
          }
        };

        rec.onerror = (e) => {
          console.warn('[Voice Engine] Error:', e.error);
        };

        recognitionRef.current = rec;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [drillIndex, source, dayIdx, pIdx, autostart, router]);

  // Voice Speech Command Toggler
  const toggleVoice = () => {
    if (!voiceSupported || !recognitionRef.current) return;
    if (voiceActive) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setVoiceActive(false);
    } else {
      try {
        recognitionRef.current.start();
        setVoiceActive(true);
      } catch (e) {
        console.error('[Voice Engine] Start failed:', e);
      }
    }
  };

  // Heartbeat & Calories Loop
  useEffect(() => {
    const timer = setInterval(() => {
      if (phase === 'active' && !isPaused) {
        // Higher intensity
        setBpm(prev => {
          const target = Math.floor(Math.random() * (145 - 130 + 1)) + 130;
          return prev + Math.sign(target - prev) * 2;
        });
        setCalories(prev => prev + 0.22);
      } else if (phase === 'prep' || phase === 'rest') {
        setBpm(prev => {
          const target = Math.floor(Math.random() * (110 - 95 + 1)) + 95;
          return prev + Math.sign(target - prev) * 2;
        });
      } else {
        // Idle
        setBpm(prev => {
          const target = Math.floor(Math.random() * (95 - 80 + 1)) + 80;
          return prev + Math.sign(target - prev) * 2;
        });
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [phase, isPaused]);

  // Main countdown timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isPaused || phase === 'idle') return;

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          if (phase === 'prep') {
            // Transition from prep to active
            setPhase('active');
            return currentDrill?.type === 'timer' ? currentDrill.duration || 60 : 0;
          }
          if (phase === 'active') {
            // Transition from active to rest
            handleDrillDone();
            return 0;
          }
          if (phase === 'rest') {
            // Transition from rest to next drill
            const nextIdx = drillIndex + 1;
            const query = `index=${nextIdx}&source=${source}${dayIdx ? `&day=${dayIdx}` : ''}${pIdx ? `&p=${pIdx}` : ''}&autostart=1`;
            router.replace(`/training/session?${query}`);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, isPaused, currentDrill, drillIndex, source, dayIdx, pIdx]);

  // Say verbal tips
  const speakInstruction = (text: string) => {
    if (!synthRef.current) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synthRef.current.getVoices();
      const ukVoice = voices.find(v => v.name.includes('Google UK') || v.lang === 'en-GB');
      if (ukVoice) utterance.voice = ukVoice;
      utterance.rate = 0.85;
      utterance.pitch = 0.7;
      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  };

  const handleStart = () => {
    setPhase('prep');
    setTimeLeft(15);
    speakInstruction("Get ready. Next drill: " + currentDrill?.name);
  };

  const handleMainAction = () => {
    if (phase === 'idle') {
      handleStart();
    } else {
      handleDrillDone();
    }
  };

  const handleDrillDone = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // Save completion index in local storage
    if (!isProtocol) {
      const progressKey = 'workout_progress_' + new Date().toDateString();
      try {
        const completed = JSON.parse(localStorage.getItem(progressKey) || '[]');
        if (!completed.includes(drillIndex)) {
          completed.push(drillIndex);
          localStorage.setItem(progressKey, JSON.stringify(completed));
        }

        // Handle planner analytics tracking
        if (currentDrill?.isPlanner) {
          const dateKey = new Date().toDateString();
          const trackerKey = 'planner_drills_completed_' + dateKey;
          const plannerCompleted = JSON.parse(localStorage.getItem(trackerKey) || '[]');
          if (!plannerCompleted.some((d: { name?: string }) => d.name === currentDrill.name)) {
            plannerCompleted.push({
              name: currentDrill.name,
              completed_at: Date.now(),
              impact: currentDrill.impact || 'Standard',
            });
            localStorage.setItem(trackerKey, JSON.stringify(plannerCompleted));
          }
        }
      } catch (e) {
        console.error('Failed to save completion:', e);
      }
    } else {
      // Protocol specific completion (if needed)
      try {
        markDrillComplete(dayIdx!, pIdx!, drillIndex);
      } catch (e) {
        console.error('Failed to save protocol progress:', e);
      }
    }

    const nextIdx = drillIndex + 1;
    if (workout && nextIdx >= workout.drills.length) {
      // Fully completed workout session!
      if (isProtocol) {
        markProtocolFullyComplete(dayIdx!, pIdx!);
        router.replace('/planner');
      } else {
        router.replace('/training');
      }
      return;
    }

    // Set Phase to rest
    setPhase('rest');
    setTimeLeft(15); // Rest period
    speakInstruction("Rest period. Take fifteen seconds to reset.");
  };

  const handleTerminate = () => {
    if (confirm('Terminate session? Completed drills will be saved.')) {
      router.replace('/training');
    }
  };

  // Compute circular ring stroke metrics
  const progressRingPercent = useMemo(() => {
    if (phase === 'idle') return 100;
    if (phase === 'prep' || phase === 'rest') {
      return (timeLeft / 15) * 100;
    }
    if (totalTime === 0) return 100;
    return (timeLeft / totalTime) * 100;
  }, [phase, timeLeft, totalTime]);

  const circumference = 120 * 2 * Math.PI; // radius 120
  const ringOffset = useMemo(() => {
    return circumference - (progressRingPercent / 100) * circumference;
  }, [progressRingPercent, circumference]);

  // Display labels based on phase
  const statusLabel = useMemo(() => {
    if (phase === 'prep') return 'GET READY';
    if (phase === 'active') return 'ACTIVE SET';
    if (phase === 'rest') return 'REST PERIOD';
    return 'READY';
  }, [phase]);

  const formattedTime = useMemo(() => {
    if (phase === 'idle' && currentDrill?.type === 'reps') {
      return currentDrill.reps;
    }
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [timeLeft, phase, currentDrill]);

  if (!currentDrill) return null;

  return (
    <div className="flex flex-col h-[85vh] justify-between relative anim-fade-in select-none">
      {/* HUD telemetries */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none">
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${voiceActive ? 'bg-primary animate-ping' : 'bg-white/10'}`} />
          <span className={voiceActive ? 'text-primary' : 'text-white/30'}>
            VOICE {voiceActive ? 'LIVE' : 'OFF'}
          </span>
        </div>
        <span className="text-white/60">
          DRILL {drillIndex + 1} OF {workout?.drills.length || '--'}
        </span>
      </div>

      {/* Progress Bar top */}
      <div className="w-full h-1.5 bg-white/5 border border-white/10 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-gradient-to-r from-primary to-white transition-all duration-300"
          style={{ width: `${((drillIndex) / (workout?.drills.length || 1)) * 100}%` }}
        />
      </div>

      {/* Main card visual display */}
      <div className="relative rounded-3xl h-36 border border-white/10 bg-black/40 overflow-hidden shadow-2xl mb-4">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 transition-all duration-1000"
          style={{ backgroundImage: `url('https://placehold.co/600x400/0c0c0e/18181b/png?text=${encodeURIComponent(currentDrill.name)}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        <div className="absolute top-4 right-4 bg-primary text-black font-black text-[8px] px-2 py-0.5 rounded-full tracking-widest">
          LIVE
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <h2 className="text-base font-black uppercase text-white truncate mb-0.5">
            {currentDrill.name}
          </h2>
          <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
            {currentDrill.instruction}
          </p>
        </div>
      </div>

      {/* Circle Timer */}
      <div className="flex-1 flex flex-col items-center justify-center relative py-6">
        {/* Heart Telemetry Pill */}
        <div className="absolute top-4 left-2 px-3 py-1 bg-black/60 border border-red-500/20 text-red-500 rounded-full text-[10px] font-black tracking-widest flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
          <Heart className="w-3 h-3 fill-red-500 animate-pulse" />
          <span>{bpm} BPM</span>
        </div>

        {/* Calories Telemetry Pill */}
        <div className="absolute bottom-4 right-2 px-3 py-1 bg-black/60 border border-primary/20 text-primary rounded-full text-[10px] font-black tracking-widest flex items-center gap-1.5 shadow-[0_0_10px_rgba(226,255,59,0.1)]">
          <Flame className="w-3 h-3" />
          <span>{Math.floor(calories)} KCAL</span>
        </div>

        {/* Big Ring */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
            <circle 
              className="text-white/[0.02]" 
              stroke="currentColor" 
              strokeWidth="10" 
              fill="transparent" 
              r="120" 
              cx="130" 
              cy="130" 
            />
            <circle 
              className="text-primary transition-all duration-300 ease-out" 
              stroke="currentColor" 
              strokeWidth="10" 
              strokeDasharray={circumference}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              fill="transparent" 
              r="120" 
              cx="130" 
              cy="130" 
              style={{ filter: 'drop-shadow(0 0 10px rgba(226, 255, 59, 0.6))' }}
            />
          </svg>

          {/* Central Values */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 rounded-full border border-primary/20 bg-black/80 flex items-center justify-center mb-2 overflow-hidden shadow-inner scanline">
              <Target className="w-7 h-7 text-primary/40" />
            </div>
            
            <span className={`font-mono text-3xl font-black tracking-tighter text-white leading-none ${currentDrill.type === 'reps' && phase === 'idle' ? 'text-lg px-2' : ''}`}>
              {formattedTime}
            </span>
            <span className="text-[8px] font-black tracking-widest text-white/40 uppercase mt-1">
              {phase === 'active' && currentDrill.type === 'reps' ? 'REPS SET' : statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Voice engine trigger button */}
      {voiceSupported && (
        <div className="flex justify-center mb-4">
          <button 
            onClick={toggleVoice}
            className={`px-4 py-1.5 rounded-full border text-[10px] font-black tracking-widest flex items-center gap-1.5 transition-all ${
              voiceActive 
                ? 'bg-primary text-black border-primary shadow-[0_0_12px_rgba(226,255,59,0.3)]' 
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span>{voiceActive ? 'VOICE COMMANDS ACTIVE' : 'ENABLE VOICE COMMANDS'}</span>
          </button>
        </div>
      )}

      {/* Control Buttons */}
      <footer className="flex flex-col gap-3">
        {phase === 'idle' ? (
          <NeonButton onClick={handleStart} className="w-full h-14">
            START SET
          </NeonButton>
        ) : (
          <div className="flex gap-3">
            <button 
              onClick={() => setIsPaused(p => !p)}
              className="flex-1 h-14 rounded-full border border-white/20 bg-transparent text-white font-black tracking-widest uppercase hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
              <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
            </button>
            
            <button 
              onClick={handleMainAction}
              className="flex-1 h-14 rounded-full bg-primary text-black font-black tracking-widest uppercase hover:bg-primary/95 shadow-[0_0_20px_rgba(226,255,59,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>FINISH</span>
            </button>
          </div>
        )}

        {phase !== 'idle' && (
          <button 
            onClick={handleTerminate}
            className="w-full h-10 border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all rounded-full font-black text-xs uppercase tracking-widest"
          >
            TERMINATE SESSION
          </button>
        )}
      </footer>
    </div>
  );
}

export default function SessionTimerPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center py-10 text-white/40">
        Calibrating Timer...
      </div>
    }>
      <SessionTimerContent />
    </Suspense>
  );
}
