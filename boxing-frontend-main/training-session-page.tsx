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
  Target,
  Maximize2,
  X,
  Plus,
  Minus,
  Layers,
  Info,
  ChevronRight
} from 'lucide-react';
import { getDailyWorkout } from '@/lib/workout-data';
import { getProtocolBlock, loadCachedDrills, markDrillComplete, markProtocolFullyComplete } from '@/lib/protocol-session';
import type { ProtocolSessionDrill, Workout } from '@/types';
import { NeonButton } from '@/components/ui/NeonButton';
import { ExerciseVisualGuide, getTargetMuscle } from '@/components/ui/ExerciseVisualGuide';

// Reps-type drills store their prescription as a string like "3 sets of 12 reps".
// This pulls the real numbers back out so we can drive an actual set-by-set flow.
function parseSetsAndReps(drill: ProtocolSessionDrill | null): { totalSets: number; repsPerSet: number | null } {
  if (!drill) return { totalSets: 1, repsPerSet: null };
  if (drill.type === 'timer') {
    return { totalSets: Math.max(1, drill.sets || 1), repsPerSet: null };
  }
  const match = drill.reps?.match(/(\d+)\s*sets?\s*of\s*(\d+)/i);
  if (match) {
    return { totalSets: Math.max(1, parseInt(match[1], 10)), repsPerSet: parseInt(match[2], 10) };
  }
  return { totalSets: 1, repsPerSet: null };
}

const SET_REST_SECONDS = 10;
const PREP_SECONDS = 15;
const SECONDS_PER_REP_ESTIMATE = 3;
const MIN_ACTIVE_SECONDS = 20;

function computeActiveDuration(drill: ProtocolSessionDrill | null, repsPerSet: number | null): number {
  if (!drill) return MIN_ACTIVE_SECONDS;
  if (drill.type === 'timer') return drill.duration || 60;
  if (repsPerSet) return Math.max(MIN_ACTIVE_SECONDS, repsPerSet * SECONDS_PER_REP_ESTIMATE);
  return MIN_ACTIVE_SECONDS;
}

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
  const [phase, setPhase] = useState<'idle' | 'prep' | 'active' | 'set_rest' | 'drill_confirm'>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(60);
  const [isPaused, setIsPaused] = useState(false);

  // Set tracking within the current drill
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  // Simulated stats
  const [bpm, setBpm] = useState(90);
  const [calories, setCalories] = useState(0);

  // Manual rep counter for reps-type drills
  const [repsCompleted, setRepsCompleted] = useState(0);

  // Fullscreen reference guide modal
  const [isGuideExpanded, setIsGuideExpanded] = useState(false);

  // Voice Telemetry
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // References
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Speech synthesis voice setting
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const { totalSets, repsPerSet } = useMemo(() => parseSetsAndReps(currentDrill), [currentDrill]);

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
    setRepsCompleted(0);
    setCurrentSetIndex(0);
    setPhase('idle');

    const { repsPerSet } = parseSetsAndReps(drill);
    const dur = computeActiveDuration(drill, repsPerSet);
    setTotalTime(dur);
    setTimeLeft(0);

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
        } catch { }
      }
    };
  }, [drillIndex, source, dayIdx, pIdx, autostart, router]);

  // Voice Speech Command Toggler
  const toggleVoice = () => {
    if (!voiceSupported || !recognitionRef.current) return;
    if (voiceActive) {
      try {
        recognitionRef.current.stop();
      } catch { }
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
      } else if (phase === 'prep' || phase === 'set_rest') {
        setBpm(prev => {
          const target = Math.floor(Math.random() * (110 - 95 + 1)) + 95;
          return prev + Math.sign(target - prev) * 2;
        });
      } else {
        // Idle / confirm
        setBpm(prev => {
          const target = Math.floor(Math.random() * (95 - 80 + 1)) + 80;
          return prev + Math.sign(target - prev) * 2;
        });
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [phase, isPaused]);

  // Main countdown timer — drives prep -> active (per set) -> set_rest -> active
  // (next set) -> drill_confirm (only once ALL sets of this drill are done).
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isPaused || phase === 'idle' || phase === 'drill_confirm') return;

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          if (phase === 'prep') {
            // First set of this drill is starting
            setPhase('active');
            setRepsCompleted(0);
            return computeActiveDuration(currentDrill, repsPerSet);
          }
          if (phase === 'active') {
            handleSetDone();
            return 0;
          }
          if (phase === 'set_rest') {
            // Next set of the SAME drill
            setPhase('active');
            setRepsCompleted(0);
            return computeActiveDuration(currentDrill, repsPerSet);
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, isPaused, currentDrill, repsPerSet, drillIndex, source, dayIdx, pIdx]);

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
    setTimeLeft(PREP_SECONDS);
    speakInstruction("Get ready. Next up: " + currentDrill?.name);
  };

  const handleMainAction = () => {
    if (phase === 'idle') {
      handleStart();
    } else if (phase === 'active') {
      handleSetDone();
    }
  };

  // Persists completion for the CURRENT drill (called once, when its last set finishes)
  const saveDrillCompletion = () => {
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
      try {
        markDrillComplete(dayIdx!, pIdx!, drillIndex);
      } catch (e) {
        console.error('Failed to save protocol progress:', e);
      }
    }
  };

  // Called when a single SET's active countdown finishes (or the user taps Finish).
  const handleSetDone = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const isLastSet = currentSetIndex + 1 >= totalSets;

    if (!isLastSet) {
      // More sets of the SAME exercise remain — short rest, then straight into the next set.
      setCurrentSetIndex(i => i + 1);
      setPhase('set_rest');
      setTimeLeft(SET_REST_SECONDS);
      speakInstruction(`Set complete. ${SET_REST_SECONDS} second rest.`);
      return;
    }

    // All sets of this drill are done.
    saveDrillCompletion();

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

    // Gate on an explicit confirmation instead of auto-advancing — shows the
    // next exercise's full details before it starts.
    setPhase('drill_confirm');
    speakInstruction('Set complete. Review your next exercise when ready.');
  };

  const nextDrillPreview = workout?.drills[drillIndex + 1] || null;

  const handleContinueToNextDrill = () => {
    const nextIdx = drillIndex + 1;
    const query = `index=${nextIdx}&source=${source}${dayIdx ? `&day=${dayIdx}` : ''}${pIdx ? `&p=${pIdx}` : ''}&autostart=1`;
    router.replace(`/training/session?${query}`);
  };

  const handleEndFromConfirm = () => {
    if (isProtocol) {
      router.replace('/planner');
    } else {
      router.replace('/training');
    }
  };

  const handleTerminate = () => {
    if (confirm('Terminate session? Completed drills will be saved.')) {
      router.replace('/training');
    }
  };

  // Compute circular ring stroke metrics
  const progressRingPercent = useMemo(() => {
    if (phase === 'idle' || phase === 'drill_confirm') return 100;
    if (phase === 'prep') {
      return (timeLeft / PREP_SECONDS) * 100;
    }
    if (phase === 'set_rest') {
      return (timeLeft / SET_REST_SECONDS) * 100;
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
    if (phase === 'active') return `SET ${currentSetIndex + 1} OF ${totalSets}`;
    if (phase === 'set_rest') return `REST — SET ${currentSetIndex + 2} OF ${totalSets} NEXT`;
    return 'READY';
  }, [phase, currentSetIndex, totalSets]);

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

      {/* Main exercise reference visual — video/animated guide, click to expand */}
      <button
        type="button"
        onClick={() => setIsGuideExpanded(true)}
        className="relative rounded-3xl h-72 border border-white/10 bg-black/40 overflow-hidden shadow-2xl mb-4 w-full text-left group"
      >
        <div className="absolute inset-0">
          <ExerciseVisualGuide name={currentDrill.name} instruction={currentDrill.instruction} videoUrl={currentDrill.videoUrl} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
        <div className="absolute top-4 right-4 bg-primary text-black font-black text-[8px] px-2 py-0.5 rounded-full tracking-widest">
          LIVE
        </div>
        <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/70 group-hover:text-primary group-hover:border-primary/50 transition-all">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
        <div className="absolute bottom-4 left-5 right-5 pointer-events-none">
          <h2 className="text-lg font-black uppercase text-white truncate mb-0.5">
            {currentDrill.name}
          </h2>
          <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
            {currentDrill.instruction}
          </p>
        </div>
      </button>

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
              {currentDrill.type === 'reps' && phase === 'active' ? repsCompleted : formattedTime}
            </span>
            <span className="text-[8px] font-black tracking-widest text-white/40 uppercase mt-1 px-2 text-center">
              {phase === 'active' && currentDrill.type === 'reps' && repsPerSet
                ? `TARGET ${repsPerSet} REPS`
                : statusLabel}
            </span>
          </div>
        </div>

        {totalSets > 1 && (phase === 'active' || phase === 'set_rest' || phase === 'prep') && (
          <div className="flex items-center gap-1.5 mt-3">
            {Array.from({ length: totalSets }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${i < currentSetIndex ? 'bg-primary' : i === currentSetIndex ? 'bg-primary/60 ring-2 ring-primary/20' : 'bg-white/10'
                  }`}
              />
            ))}
          </div>
        )}

        {currentDrill.type === 'reps' && phase === 'active' && (
          <div className="flex items-center gap-4 mt-5">
            <button
              type="button"
              onClick={() => setRepsCompleted((r) => Math.max(0, r - 1))}
              className="w-11 h-11 rounded-full border border-white/15 bg-white/5 text-white/60 flex items-center justify-center active:scale-95 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Tap To Log Reps</span>
            <button
              type="button"
              onClick={() => setRepsCompleted((r) => r + 1)}
              className="w-11 h-11 rounded-full border border-primary/40 bg-primary/10 text-primary flex items-center justify-center active:scale-95 transition-all shadow-[0_0_12px_rgba(226,255,59,0.15)]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Voice engine trigger button */}
      {voiceSupported && (
        <div className="flex justify-center mb-4">
          <button
            onClick={toggleVoice}
            className={`px-4 py-1.5 rounded-full border text-[10px] font-black tracking-widest flex items-center gap-1.5 transition-all ${voiceActive
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
        ) : phase === 'drill_confirm' ? null : (
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
              <span>FINISH SET</span>
            </button>
          </div>
        )}

        {phase !== 'idle' && phase !== 'drill_confirm' && (
          <button
            onClick={handleTerminate}
            className="w-full h-10 border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all rounded-full font-black text-xs uppercase tracking-widest"
          >
            TERMINATE SESSION
          </button>
        )}
      </footer>

      {phase === 'drill_confirm' && nextDrillPreview && (() => {
        const nextPlan = parseSetsAndReps(nextDrillPreview);
        return (
          <div className="fixed inset-0 z-[90] bg-black/95 flex flex-col p-5 overflow-y-auto">
            <div className="text-center mb-4">
              <span className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">
                Set Complete — Up Next
              </span>
              <h2 className="text-xl font-black uppercase text-white">{nextDrillPreview.name}</h2>
            </div>

            <div className="rounded-3xl h-64 border border-white/10 bg-black/40 overflow-hidden mb-4">
              <ExerciseVisualGuide
                name={nextDrillPreview.name}
                instruction={nextDrillPreview.instruction}
                videoUrl={nextDrillPreview.videoUrl}
              />
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-start gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Target Muscle</span>
                  <span className="text-xs font-bold text-white">{getTargetMuscle(nextDrillPreview.name, nextDrillPreview.instruction)}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Form</span>
                  <span className="text-xs font-bold text-white leading-relaxed">{nextDrillPreview.instruction}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <Layers className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Sets &amp; Reps</span>
                  <span className="text-xs font-bold text-white">
                    {nextDrillPreview.type === 'timer'
                      ? `${nextPlan.totalSets} ${nextPlan.totalSets === 1 ? 'round' : 'rounds'} of ${nextDrillPreview.duration || 60}s`
                      : nextPlan.repsPerSet
                        ? `${nextPlan.totalSets} sets of ${nextPlan.repsPerSet} reps`
                        : nextDrillPreview.reps}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <NeonButton onClick={handleContinueToNextDrill} className="w-full h-14">
                CONTINUE <ChevronRight className="w-4 h-4 ml-1 inline" />
              </NeonButton>
              <button
                onClick={handleEndFromConfirm}
                className="w-full h-11 border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all rounded-full font-black text-xs uppercase tracking-widest"
              >
                END SESSION HERE
              </button>
            </div>
          </div>
        );
      })()}

      <AnimatePresence>
        {isGuideExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4"
            onClick={() => setIsGuideExpanded(false)}
          >
            <button
              type="button"
              onClick={() => setIsGuideExpanded(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white/70 hover:text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div
              className="w-full max-w-md aspect-[3/4] max-h-[75vh] rounded-3xl border border-primary/20 overflow-hidden bg-black/60"
              onClick={(e) => e.stopPropagation()}
            >
              <ExerciseVisualGuide
                name={currentDrill.name}
                instruction={currentDrill.instruction}
                videoUrl={currentDrill.videoUrl}
                expanded
              />
            </div>
            <div className="text-center mt-6">
              <h2 className="text-xl font-black uppercase text-white">{currentDrill.name}</h2>
              <p className="text-xs text-primary font-bold uppercase tracking-wider mt-1">{currentDrill.instruction}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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