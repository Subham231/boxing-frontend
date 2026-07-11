'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Trophy, 
  Settings, 
  Check, 
  RotateCcw, 
  Play, 
  ArrowLeft, 
  AlertTriangle, 
  Activity, 
  Flame,
  Target,
  CircleDot
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StreakManager } from '@/lib/streak-manager';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

const LB_RT = 'leaderboard_reflex_reaction_tap';
const LB_CF = 'leaderboard_reflex_combo_flash';

interface LeaderboardRecord {
  player_name: string;
  score: number;
  display_score: string;
}

export default function ReflexPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [playerName, setPlayerName] = useState('FIGHTER');
  const [promiseText, setPromiseText] = useState('FOCUS');

  // Assessment Overlay State
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessStep, setAssessStep] = useState<'start' | 's1-intro' | 's1-play' | 's2-intro' | 's2-play' | 'results'>('start');
  const [assessRoundCount, setAssessRoundCount] = useState(0);
  const [assessResults, setAssessResults] = useState<{ s1: number[]; s2: number[] }>({ s1: [], s2: [] });
  const [assessTargetActive, setAssessTargetActive] = useState(false);
  const [assessStartTime, setAssessStartTime] = useState(0);
  const [assessColor, setAssessColor] = useState('#222');
  const [assessShape, setAssessShape] = useState('');
  const [assessBaseline, setAssessBaseline] = useState<number | null>(null);
  const [assessRating, setAssessRating] = useState('');
  const [assessMessage, setAssessMessage] = useState('');

  // Weekly Tracker State
  const [weeklySessions, setWeeklySessions] = useState(0);
  const [weeklyCompleted, setWeeklyCompleted] = useState(false);

  // Game 1: Reaction Tap State
  const [rtActive, setRtActive] = useState(false);
  const [rtWaiting, setRtWaiting] = useState(false);
  const [rtTargetState, setRtTargetState] = useState<'wait' | 'ready' | 'hit' | 'slow'>('wait');
  const [rtLabel, setRtLabel] = useState('WAIT...');
  const [rtBest, setRtBest] = useState<number | null>(null);
  const [rtLastAvg, setRtLastAvg] = useState<number | null>(null);
  const [rtRound, setRtRound] = useState(0);
  const [rtTimes, setRtTimes] = useState<number[]>([]);
  const [rtRoundStatus, setRtRoundStatus] = useState<('correct' | 'wrong' | null)[]>([null, null, null, null, null]);

  // Game 2: Combo Flash State
  const [cfActive, setCfActive] = useState(false);
  const [cfWaiting, setCfWaiting] = useState(false);
  const [cfSequence, setCfSequence] = useState<string[]>([]);
  const [cfPlayerIdx, setCfPlayerIdx] = useState(0);
  const [cfLevel, setCfLevel] = useState(1);
  const [cfScore, setCfScore] = useState(0);
  const [cfBest, setCfBest] = useState<number | null>(null);
  const [cfStatusText, setCfStatusText] = useState('Press Start to play');
  const [cfActiveLightIdx, setCfActiveLightIdx] = useState<number | null>(null);
  const [cfTimerPercent, setCfTimerPercent] = useState(100);
  const [cfTimerDanger, setCfTimerDanger] = useState(false);
  const [cfLevelScores, setCfLevelScores] = useState<number[]>([]);
  const [cfLightSequence, setCfLightSequence] = useState<string[]>([]);

  // Leaderboard lists
  const [rtLeaderboard, setRtLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [cfLeaderboard, setCfLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [rtRank, setRtRank] = useState('PLAY TO RANK');
  const [cfRank, setCfRank] = useState('PLAY TO RANK');

  // Timers and Refs
  const rtTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rtFlashTimeRef = useRef<number>(0);
  const cfTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cfTimerMaxRef = useRef<number>(0);
  const cfTimerLeftRef = useRef<number>(0);
  const assessTimerRef = useRef<NodeJS.Timeout | null>(null);
  const assessIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Parse onboarding
    try {
      const data = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
      if (data.ring_name || data.ringName) {
        setPlayerName((data.ring_name || data.ringName).toUpperCase());
      }
      if (data.promise_trigger) {
        setPromiseText(data.promise_trigger.toUpperCase());
      }
    } catch (e) {}

    // Parse Best Scores
    const bestRT = localStorage.getItem('reflex_rt_best');
    if (bestRT) setRtBest(parseFloat(bestRT));

    const bestCF = localStorage.getItem('reflex_combo_best');
    if (bestCF) setCfBest(parseInt(bestCF));

    // Parse Weekly Sessions
    const weekKey = getWeekKey();
    try {
      const data = JSON.parse(localStorage.getItem('reflex_weekly_sessions') || '{}');
      const count = data[weekKey] || 0;
      setWeeklySessions(count);
      setWeeklyCompleted(count >= 2);
    } catch (e) {}

    // Check if Assessment Done
    if (!localStorage.getItem('reflex_assessment_done')) {
      setShowAssessment(true);
      setAssessStep('start');
    }

    // Load Leaderboards
    loadLeaderboards();
  }, []);

  const getWeekKey = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    return `${now.getFullYear()}_w${week}`;
  };

  const recordSession = () => {
    const weekKey = getWeekKey();
    try {
      const data = JSON.parse(localStorage.getItem('reflex_weekly_sessions') || '{}');
      const cur = data[weekKey] || 0;
      if (cur < 2) {
        const nextVal = cur + 1;
        data[weekKey] = nextVal;
        localStorage.setItem('reflex_weekly_sessions', JSON.stringify(data));
        setWeeklySessions(nextVal);
        setWeeklyCompleted(nextVal >= 2);
      }
    } catch (e) {}

    // Mark daily workout as progressed
    StreakManager.completeSession();
    StreakManager.syncWithSupabase().catch(console.error);
  };

  // Rank Labels
  const reactionRankLabel = useMemo(() => {
    if (!rtBest) return 'PLAY TO RANK';
    if (rtBest < 0.18) return '🏆 WORLD CLASS';
    if (rtBest < 0.22) return '⚡ ELITE TIER';
    if (rtBest < 0.28) return '🔥 PRO LEVEL';
    return 'AMATEUR TIER';
  }, [rtBest]);

  const loadLeaderboards = async () => {
    if (!supabase) return;
    try {
      // Reaction Tap Leaderboard
      const { data: rtData } = await supabase
        .from(LB_RT)
        .select('player_name, score, display_score')
        .order('score', { ascending: true })
        .limit(10);
      if (rtData) setRtLeaderboard(rtData);

      // Combo Flash Leaderboard
      const { data: cfData } = await supabase
        .from(LB_CF)
        .select('player_name, score, display_score')
        .order('score', { ascending: false })
        .limit(10);
      if (cfData) setCfLeaderboard(cfData);

      // Fetch user's own rankings if existing
      const pName = playerName;
      if (pName) {
        const { data: rtSingle } = await supabase
          .from(LB_RT)
          .select('score')
          .eq('player_name', pName)
          .maybeSingle();
        if (rtSingle) {
          // Find index
          const { count } = await supabase
            .from(LB_RT)
            .select('*', { count: 'exact', head: true })
            .lt('score', rtSingle.score);
          setRtRank(`#${(count || 0) + 1} RANK`);
        }

        const { data: cfSingle } = await supabase
          .from(LB_CF)
          .select('score')
          .eq('player_name', pName)
          .maybeSingle();
        if (cfSingle) {
          // Find index
          const { count } = await supabase
            .from(LB_CF)
            .select('*', { count: 'exact', head: true })
            .gt('score', cfSingle.score);
          setCfRank(`#${(count || 0) + 1} RANK`);
        }
      }
    } catch (e) {
      console.warn('Failed to load online leaderboards:', e);
    }
  };

  const submitOnlineScore = async (tableName: string, score: number, displayVal: string) => {
    if (!supabase) return;
    const name = playerName || 'FIGHTER';
    try {
      const { data: existing, error } = await supabase
        .from(tableName)
        .select('id, score')
        .eq('player_name', name)
        .maybeSingle();

      if (existing && !error) {
        const oldScore = existing.score;
        const isBetter = tableName === LB_RT ? score < oldScore : score > oldScore;
        if (isBetter) {
          await supabase
            .from(tableName)
            .update({ score, display_score: displayVal, created_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
      } else {
        await supabase
          .from(tableName)
          .insert([{ player_name: name, score, display_score: displayVal, created_at: new Date().toISOString() }]);
      }
      loadLeaderboards();
    } catch (e) {
      console.error('Failed to submit online score:', e);
    }
  };

  // =========================================================================
  // GAME 1: REACTION TAP LOGIC
  // =========================================================================
  const startReactionGame = () => {
    if (rtActive) return;
    setRtActive(true);
    setRtRound(0);
    setRtTimes([]);
    setRtRoundStatus([null, null, null, null, null]);
    scheduleNextRtTarget();
  };

  const scheduleNextRtTarget = () => {
    setRtTargetState('wait');
    setRtLabel('WAIT...');
    setRtWaiting(false);
    
    const delay = 1200 + Math.random() * 2400;
    rtTimerRef.current = setTimeout(() => {
      setRtTargetState('ready');
      setRtLabel('HIT!');
      rtFlashTimeRef.current = Date.now();
      setRtWaiting(true);

      // Automatically timeout after 2 seconds
      rtTimerRef.current = setTimeout(() => {
        setRtTargetState('slow');
        setRtLabel('TOO SLOW');
        setRtWaiting(false);
        setTimeout(() => handleRtNextRound(null), 800);
      }, 2000);
    }, delay);
  };

  const handleRtTap = () => {
    if (!rtWaiting) return;
    if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
    
    const elapsed = (Date.now() - rtFlashTimeRef.current) / 1000;
    setRtTargetState('hit');
    setRtLabel(`${elapsed.toFixed(3)}s`);
    setRtWaiting(false);

    // Save personal best
    const currentBest = rtBest;
    if (currentBest === null || elapsed < currentBest) {
      localStorage.setItem('reflex_rt_best', elapsed.toString());
      setRtBest(elapsed);
    }

    setTimeout(() => handleRtNextRound(elapsed), 600);
  };

  const handleRtNextRound = (time: number | null) => {
    const nextRoundIndex = rtRound;
    const nextRoundStatus = [...rtRoundStatus];
    nextRoundStatus[nextRoundIndex] = time !== null ? 'correct' : 'wrong';
    setRtRoundStatus(nextRoundStatus);

    const nextTimes = time !== null ? [...rtTimes, time] : rtTimes;
    setRtTimes(nextTimes);

    const nextRound = rtRound + 1;
    setRtRound(nextRound);

    if (nextRound >= 5) {
      // Game Over
      const avg = nextTimes.length > 0 ? nextTimes.reduce((a, b) => a + b, 0) / nextTimes.length : null;
      setRtLabel(avg ? `AVG: ${avg.toFixed(3)}s` : 'NO HITS');
      setRtActive(false);
      setRtLastAvg(avg);
      recordSession();
      if (avg) {
        submitOnlineScore(LB_RT, avg, avg.toFixed(3));
      }
    } else {
      scheduleNextRtTarget();
    }
  };

  // =========================================================================
  // GAME 2: COMBO FLASH LOGIC
  // =========================================================================
  const startComboGame = () => {
    if (cfActive) return;
    setCfActive(true);
    setCfLevel(1);
    setCfScore(0);
    setCfSequence([]);
    setCfLevelScores([]);
    setCfStatusText('WATCH THE COMBO...');
    nextComboRound([]);
  };

  const nextComboRound = (currSeq: string[]) => {
    setCfWaiting(false);
    stopComboTimer();
    setCfTimerPercent(100);
    setCfTimerDanger(false);

    const moves = ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'];
    const nextSeq = [...currSeq, moves[Math.floor(Math.random() * moves.length)]];
    setCfSequence(nextSeq);
    setCfPlayerIdx(0);
    setCfStatusText('WATCH THE COMBO...');
    flashComboSequence(nextSeq);
  };

  const flashComboSequence = (seq: string[]) => {
    setCfLightSequence([]);
    let i = 0;
    
    const flash = () => {
      if (i < seq.length) {
        setCfActiveLightIdx(i);
        setTimeout(() => {
          setCfActiveLightIdx(null);
          i++;
          setTimeout(flash, 250);
        }, 500);
      } else {
        setCfStatusText('NOW REPEAT IT!');
        setCfWaiting(true);
        // Start round timer: 2s base + 0.8s per move
        startComboTimer(2000 + seq.length * 800);
      }
    };
    setTimeout(flash, 600);
  };

  const startComboTimer = (ms: number) => {
    cfTimerMaxRef.current = ms;
    cfTimerLeftRef.current = ms;
    setCfTimerPercent(100);
    setCfTimerDanger(false);

    if (cfTimerIntervalRef.current) clearInterval(cfTimerIntervalRef.current);
    cfTimerIntervalRef.current = setInterval(() => {
      cfTimerLeftRef.current -= 100;
      const pct = Math.max(0, (cfTimerLeftRef.current / cfTimerMaxRef.current) * 100);
      setCfTimerPercent(pct);
      if (pct < 33) setCfTimerDanger(true);

      if (cfTimerLeftRef.current <= 0) {
        stopComboTimer();
        timeoutComboRound();
      }
    }, 100);
  };

  const stopComboTimer = () => {
    if (cfTimerIntervalRef.current) {
      clearInterval(cfTimerIntervalRef.current);
      cfTimerIntervalRef.current = null;
    }
  };

  const timeoutComboRound = () => {
    setCfWaiting(false);
    setCfStatusText('⌛ TIME UP! Game over.');
    setTimeout(() => endComboGame(false), 900);
  };

  const handleComboInput = (move: string) => {
    if (!cfWaiting) return;
    
    // Light up button feedback temporarily
    setCfLightSequence(prev => [...prev, move]);
    setTimeout(() => {
      setCfLightSequence(prev => prev.filter(m => m !== move));
    }, 150);

    const targetMove = cfSequence[cfPlayerIdx];
    if (move === targetMove) {
      const nextIdx = cfPlayerIdx + 1;
      setCfPlayerIdx(nextIdx);

      if (nextIdx === cfSequence.length) {
        // Success
        stopComboTimer();
        setCfWaiting(false);
        const levelPts = cfLevel * 10;
        const nextScore = cfScore + levelPts;
        setCfScore(nextScore);

        const nextLevelScores = [...cfLevelScores, levelPts];
        setCfLevelScores(nextLevelScores);

        const nextLvl = cfLevel + 1;
        setCfLevel(nextLvl);

        const avgNow = Math.round(nextLevelScores.reduce((a, b) => a + b, 0) / nextLevelScores.length);
        const currentBest = cfBest;
        if (currentBest === null || avgNow > currentBest) {
          localStorage.setItem('reflex_combo_best', avgNow.toString());
          setCfBest(avgNow);
        }

        setCfStatusText('⚡ PERFECT! Next level...');

        setTimeout(() => {
          if (nextLvl <= 8) {
            nextComboRound(cfSequence);
          } else {
            endComboGame(true);
          }
        }, 900);
      }
    } else {
      // Failed
      stopComboTimer();
      setCfWaiting(false);
      setCfStatusText('❌ WRONG COMBINATION! Game over.');
      setTimeout(() => endComboGame(false), 900);
    }
  };

  const endComboGame = (won: boolean) => {
    setCfActive(false);
    setCfWaiting(false);
    stopComboTimer();

    const avg = cfLevelScores.length > 0 ? Math.round(cfLevelScores.reduce((a, b) => a + b, 0) / cfLevelScores.length) : 0;
    setCfStatusText(won ? '🏆 CHAMPION! Max Level!' : `FINAL AVG: ${avg} pts/level`);
    recordSession();
    if (cfLevelScores.length > 0) {
      submitOnlineScore(LB_CF, avg, avg.toString());
    }
  };

  // =========================================================================
  // REFLEX CALIBRATION OVERLAY LOGIC
  // =========================================================================
  const advanceAssessStep = (next: typeof assessStep) => {
    setAssessStep(next);
  };

  const startAssessStage1 = () => {
    setAssessStep('s1-play');
    setAssessRoundCount(0);
    setAssessResults({ s1: [], s2: [] });
    runAssessStage1Round(0, []);
  };

  const runAssessStage1Round = (roundIdx: number, currentResults: number[]) => {
    setAssessColor('#222');
    setAssessShape('');
    setAssessTargetActive(false);

    const delay = 1200 + Math.random() * 2000;
    assessTimerRef.current = setTimeout(() => {
      setAssessColor('#ff2d55');
      setAssessStartTime(Date.now());
      setAssessTargetActive(true);

      // Automatically timeout
      assessTimerRef.current = setTimeout(() => {
        handleAssessRoundEnd('s1', roundIdx, null, currentResults);
      }, 1500);
    }, delay);
  };

  const startAssessStage2 = () => {
    setAssessStep('s2-play');
    setAssessRoundCount(0);
    runAssessStage2Round(0, []);
  };

  const runAssessStage2Round = (roundIdx: number, currentResults: number[]) => {
    setAssessTargetActive(false);

    let cycleCount = 0;
    const maxCycle = 4 + Math.floor(Math.random() * 5); // 4-8 distractors
    const colors = ['#ff2d55', '#E2FF3B', '#fff', '#5856d6'];
    const shapes = ['', 'shape-square', 'shape-triangle'];

    assessIntervalRef.current = setInterval(() => {
      const isTarget = cycleCount === maxCycle;
      let c = '#fff';
      let s = 'shape-square';

      if (!isTarget) {
        // Find a combination that is NOT white square
        do {
          c = colors[Math.floor(Math.random() * colors.length)];
          s = shapes[Math.floor(Math.random() * shapes.length)];
        } while (c === '#fff' && s === 'shape-square');
      }

      setAssessColor(c);
      setAssessShape(s);

      if (isTarget) {
        if (assessIntervalRef.current) clearInterval(assessIntervalRef.current);
        setAssessStartTime(Date.now());
        setAssessTargetActive(true);
        
        assessTimerRef.current = setTimeout(() => {
          handleAssessRoundEnd('s2', roundIdx, null, currentResults);
        }, 1200);
      }
      cycleCount++;
    }, 650);
  };

  const handleAssessClap = () => {
    if (!assessTargetActive) return;
    const elapsed = Date.now() - assessStartTime;
    setAssessTargetActive(false);
    
    if (assessTimerRef.current) clearTimeout(assessTimerRef.current);
    if (assessIntervalRef.current) clearInterval(assessIntervalRef.current);

    if (assessStep === 's1-play') {
      handleAssessRoundEnd('s1', assessRoundCount, elapsed, assessResults.s1);
    } else {
      handleAssessRoundEnd('s2', assessRoundCount, elapsed, assessResults.s2);
    }
  };

  const handleAssessRoundEnd = (stage: 's1' | 's2', roundIdx: number, time: number | null, currResults: number[]) => {
    const nextResults = time !== null ? [...currResults, time] : currResults;
    
    if (stage === 's1') {
      setAssessResults(prev => ({ ...prev, s1: nextResults }));
    } else {
      setAssessResults(prev => ({ ...prev, s2: nextResults }));
    }

    const nextRound = roundIdx + 1;
    setAssessRoundCount(nextRound);

    if (nextRound < 3) {
      if (stage === 's1') {
        runAssessStage1Round(nextRound, nextResults);
      } else {
        runAssessStage2Round(nextRound, nextResults);
      }
    } else {
      if (stage === 's1') {
        setAssessStep('s2-intro');
      } else {
        // Calculate baseline
        const all = [...assessResults.s1, ...nextResults];
        const avg = all.length > 0 ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 500;
        
        setAssessBaseline(avg);
        let rating = 'ROOKIE';
        let msg = "A solid start. Consistency is key to improving your response speed.";
        if (avg < 260) {
          rating = 'ELITE';
          msg = "Exceptional. Your reflexes are in the top 1% of athletes.";
        } else if (avg < 360) {
          rating = 'PRO';
          msg = "Very sharp. You possess high-level processing capabilities.";
        } else if (avg < 460) {
          rating = 'ADAPTIVE';
          msg = "Good reaction time. Focus on reducing noise to strike faster.";
        }

        setAssessRating(rating);
        setAssessMessage(msg);
        localStorage.setItem('reflex_assessment_done', 'true');
        localStorage.setItem('reflex_baseline_avg', avg.toString());
        setRtBest(avg / 1000); // Set baseline as default best reaction
        localStorage.setItem('reflex_rt_best', (avg / 1000).toString());
        setAssessStep('results');
      }
    }
  };

  const closeAssessment = () => {
    setShowAssessment(false);
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
    <div className="flex flex-col gap-6 anim-fade-in relative pb-16">
      {/* Telemetry Display */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80 uppercase">MODULE: REFLEX ENGINE</span>
        <span className="opacity-40 uppercase">STATUS_ENGAGED</span>
      </div>

      {/* Header */}
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] overflow-hidden bg-black/40">
            <img 
              src="https://i.pravatar.cc/150?u=reflex" 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">
              SHARPEN YOUR EDGE
            </div>
            <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
              REFLEX ENHANCER
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

      {/* Stats Hex card */}
      <GlassCard className="p-6 flex flex-col items-center justify-center border-primary/20 bg-black/40 text-center relative overflow-hidden">
        <div className="text-[8px] font-black text-primary tracking-[3px] uppercase mb-1.5 opacity-85">
          PROMISE: {promiseText}
        </div>
        <div className="text-[9px] font-black text-white/40 tracking-[2px] uppercase mb-1">
          BEST REACTION
        </div>
        <div className="text-5xl font-black italic text-white flex items-baseline justify-center">
          {rtBest ? rtBest.toFixed(3) : '--'}
          <span className="text-sm font-black italic text-primary ml-1 uppercase">S</span>
        </div>
        <div className="w-16 h-[2px] bg-primary my-3" />
        <div className="text-[10px] font-black text-primary uppercase tracking-widest">
          {reactionRankLabel}
        </div>
      </GlassCard>

      {/* Weekly Tracker */}
      <GlassCard className="p-5 border-white/5 bg-black/40">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-[8px] font-black text-white/40 tracking-[2px] uppercase block mb-0.5">
              THIS WEEK
            </span>
            <span className="text-sm font-black uppercase text-white tracking-wide">
              REFLEX SESSIONS
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-primary italic leading-none">
              {weeklySessions}
            </div>
            <span className="text-[7px] font-black text-white/30 tracking-wider block mt-0.5 uppercase">
              / 2 GOAL
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-[8px] font-black text-white/40 tracking-[2px] uppercase">
            RINGS COMPLETED
          </span>
          <span className="text-[8px] font-black text-primary tracking-[1px] uppercase">
            {weeklySessions} / 2 DONE
          </span>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            {[1, 2].map(idx => (
              <div 
                key={idx}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  idx <= weeklySessions 
                    ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(226,255,59,0.25)]' 
                    : 'border-white/10 text-white/20'
                }`}
              >
                {idx <= weeklySessions ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
              </div>
            ))}
          </div>
          <div className="flex-1 text-[9px] font-black text-white/40 leading-snug uppercase">
            {weeklySessions === 0 && "Complete 2 reflex games this week"}
            {weeklySessions === 1 && "1 more session to complete the goal!"}
            {weeklySessions >= 2 && "🎉 Weekly goal achieved! Keep it up!"}
          </div>
        </div>

        <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-primary shadow-[0_0_8px_rgba(226,255,59,0.4)] transition-all duration-500" 
            style={{ width: `${Math.min(100, (weeklySessions / 2) * 100)}%` }}
          />
        </div>
      </GlassCard>

      {/* SECTION TITLE */}
      <div className="text-[9px] font-black tracking-[3px] text-white/30 uppercase mt-2">
        ⚡ REFLEX GAMES
      </div>

      {/* GAME 1: REACTION TAP */}
      <GlassCard className="p-5 border-white/5 bg-black/40">
        <div className="flex gap-4 items-start mb-5">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-xl flex-shrink-0 shadow-[0_0_10px_rgba(226,255,59,0.1)]">
            <CircleDot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-white leading-none">
              Reaction Tap
            </h3>
            <span className="text-[9px] font-black text-white/40 tracking-wide block mt-1">
              Hit the target the instant it lights up
            </span>
            <div className="flex gap-2.5 mt-2">
              <span className="px-2 py-0.5 bg-primary/15 text-primary text-[6px] font-black rounded uppercase tracking-wider">
                ⏱️ REACTION TIME
              </span>
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/50 text-[6px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                <Trophy className="w-2 h-2 text-primary" /> {rtRank}
              </span>
            </div>
          </div>
        </div>

        {/* Reaction Arena */}
        <div 
          onClick={handleRtTap}
          className="h-48 rounded-2xl border border-white/5 bg-black flex flex-col items-center justify-center relative overflow-hidden cursor-pointer select-none"
        >
          {/* Reaction target button */}
          <div 
            className={`w-24 h-24 rounded-full border-2 flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all duration-150 ${
              rtTargetState === 'ready'
                ? 'bg-primary border-primary text-black shadow-[0_0_40px_rgba(226,255,59,0.7)] scale-105'
                : rtTargetState === 'hit'
                  ? 'bg-white border-white text-black font-black'
                  : rtTargetState === 'slow'
                    ? 'bg-red-500 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : 'bg-white/5 border-dashed border-white/10 text-white/20'
            }`}
          >
            {rtLabel}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 border-t border-white/5 flex justify-between items-center text-[8px] font-black tracking-wider uppercase text-white/40">
            <span>BEST: <span className="text-primary">{rtBest ? `${rtBest.toFixed(3)}s` : '--'}</span></span>
            <span>LAST AVG: <span className="text-primary">{rtLastAvg ? `${rtLastAvg.toFixed(3)}s` : '--'}</span></span>
          </div>
        </div>

        {/* Round Progress Dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {rtRoundStatus.map((status, idx) => (
            <div 
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                status === 'correct'
                  ? 'bg-primary/20 border-primary shadow-[0_0_8px_rgba(226,255,59,0.3)]'
                  : status === 'wrong'
                    ? 'bg-red-500/20 border-red-500'
                    : 'bg-white/5 border-white/10'
              }`}
            />
          ))}
        </div>

        <NeonButton 
          onClick={startReactionGame} 
          disabled={rtActive}
          className="w-full h-12 mt-5 text-xs font-black uppercase tracking-wider"
        >
          {rtActive ? 'PLAYING...' : 'START GAME'}
        </NeonButton>

        {/* Reaction Tap Leaderboard */}
        <div className="mt-5 border border-white/5 bg-black/25 rounded-2xl overflow-hidden">
          <div className="bg-white/[0.02] px-4 py-2.5 border-b border-white/5 flex justify-between items-center">
            <span className="text-[8px] font-black text-white/60 tracking-wider uppercase">
              ⚡ Global Leaderboard (Reaction Tap)
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]" />
          </div>
          <div className="flex flex-col">
            {rtLeaderboard.length > 0 ? (
              rtLeaderboard.map((row, idx) => (
                <div 
                  key={idx}
                  className={`flex justify-between items-center px-4 py-2 text-[10px] border-b border-white/[0.02] last:border-0 ${
                    row.player_name === playerName ? 'bg-primary/10 border-l-2 border-primary pl-3.5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-black w-4 text-center ${
                      idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-700' : 'text-white/30'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-bold text-white/80 uppercase tracking-wide">{row.player_name}</span>
                  </div>
                  <span className="font-mono text-primary font-black">{row.display_score}s avg</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-[8px] font-black text-white/20 uppercase tracking-widest">
                No scores yet. Be the first!
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* GAME 2: COMBO FLASH */}
      <GlassCard className="p-5 border-white/5 bg-black/40 mt-2">
        <div className="flex gap-4 items-start mb-5">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-xl flex-shrink-0 shadow-[0_0_10px_rgba(226,255,59,0.1)]">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-white leading-none">
              Combo Flash
            </h3>
            <span className="text-[9px] font-black text-white/40 tracking-wide block mt-1">
              Watch the combo sequence, then repeat it in time
            </span>
            <div className="flex gap-2.5 mt-2">
              <span className="px-2 py-0.5 bg-primary/15 text-primary text-[6px] font-black rounded uppercase tracking-wider">
                🧠 MEMORY + SPEED
              </span>
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/50 text-[6px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                <Trophy className="w-2 h-2 text-primary" /> {cfRank}
              </span>
            </div>
          </div>
        </div>

        {/* Combo Arena */}
        <div className="p-4 rounded-2xl border border-white/5 bg-black flex flex-col gap-4">
          {/* Display row */}
          <div className="min-h-[60px] flex items-center justify-center gap-2 flex-wrap">
            {cfSequence.length > 0 ? (
              cfSequence.map((move, idx) => {
                const labels: Record<string, string> = { JAB: '1', CROSS: '2', HOOK: '3', UPPERCUT: '4' };
                const isFlash = cfActiveLightIdx === idx;
                const isPassed = idx < cfPlayerIdx;
                return (
                  <div 
                    key={idx}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all duration-200 ${
                      isFlash
                        ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(226,255,59,0.6)] scale-110'
                        : isPassed
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-white/5 border-white/10 text-white/30'
                    }`}
                  >
                    {labels[move]}
                  </div>
                );
              })
            ) : (
              <span className="text-[10px] font-black tracking-wider uppercase text-white/30">
                {cfStatusText}
              </span>
            )}
          </div>

          {/* Timer bar */}
          {cfWaiting && (
            <div className="flex flex-col gap-1">
              <div className="text-[7px] font-black text-white/30 tracking-wider text-center uppercase">
                TIME LEFT
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-100 ${
                    cfTimerDanger ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-primary shadow-[0_0_6px_rgba(226,255,59,0.5)]'
                  }`}
                  style={{ width: `${cfTimerPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Game status text */}
          {cfSequence.length > 0 && (
            <div className="text-center text-[9px] font-black text-white/40 uppercase tracking-widest min-h-[12px]">
              {cfStatusText}
            </div>
          )}

          {/* Input grid */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { id: 'JAB', label: 'JAB (1)' },
              { id: 'CROSS', label: 'CROSS (2)' },
              { id: 'HOOK', label: 'HOOK (3)' },
              { id: 'UPPERCUT', label: 'UPPER (4)' }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => handleComboInput(btn.id)}
                disabled={!cfWaiting}
                className={`h-12 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                  cfLightSequence.includes(btn.id)
                    ? 'bg-primary border-primary text-black scale-95 shadow-[0_0_12px_rgba(226,255,59,0.4)]'
                    : 'bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/[0.05] disabled:opacity-20'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Level indicators */}
          <div className="flex justify-between items-center text-[8px] font-black tracking-wider uppercase text-white/40 border-t border-white/5 pt-3 mt-2">
            <span>LEVEL: <span className="text-primary">{cfLevel}</span></span>
            <span>AVG SCORE: <span className="text-primary">{cfLevelScores.length > 0 ? Math.round(cfLevelScores.reduce((a, b) => a + b, 0) / cfLevelScores.length) : 0}</span></span>
            <span>BEST AVG: <span className="text-primary">{cfBest || '--'}</span></span>
          </div>
        </div>

        <NeonButton 
          onClick={startComboGame} 
          disabled={cfActive}
          className="w-full h-12 mt-5 text-xs font-black uppercase tracking-wider"
        >
          {cfActive ? 'PLAYING...' : 'START GAME'}
        </NeonButton>

        {/* Combo Flash Leaderboard */}
        <div className="mt-5 border border-white/5 bg-black/25 rounded-2xl overflow-hidden">
          <div className="bg-white/[0.02] px-4 py-2.5 border-b border-white/5 flex justify-between items-center">
            <span className="text-[8px] font-black text-white/60 tracking-wider uppercase">
              ⚡ Global Leaderboard (Combo Flash)
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]" />
          </div>
          <div className="flex flex-col">
            {cfLeaderboard.length > 0 ? (
              cfLeaderboard.map((row, idx) => (
                <div 
                  key={idx}
                  className={`flex justify-between items-center px-4 py-2 text-[10px] border-b border-white/[0.02] last:border-0 ${
                    row.player_name === playerName ? 'bg-primary/10 border-l-2 border-primary pl-3.5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-black w-4 text-center ${
                      idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-700' : 'text-white/30'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-bold text-white/80 uppercase tracking-wide">{row.player_name}</span>
                  </div>
                  <span className="font-mono text-primary font-black">{row.display_score} avg pts</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-[8px] font-black text-white/20 uppercase tracking-widest">
                No scores yet. Be the first!
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* BIOMETRICS */}
      <div className="text-[9px] font-black tracking-[3px] text-white/30 uppercase mt-4 select-none">
        🧬 REAL-TIME BIOMETRICS
      </div>
      <div className="flex flex-col gap-3.5">
        <GlassCard className="p-4 border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white leading-none">
                PUNCH SPEED
              </h4>
              <span className="text-[8px] font-black text-primary uppercase block mt-1">
                +12% INC VS WK 03
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white leading-none">
                PEAK BPM
              </h4>
              <span className="text-[8px] font-black text-primary uppercase block mt-1">
                168 AEROBIC PEAK
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ASSESSMENT MODAL OVERLAY */}
      <AnimatePresence>
        {showAssessment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="w-full max-w-sm flex flex-col gap-6">
              
              {/* Start Assessment Screen */}
              {assessStep === 'start' && (
                <div className="flex flex-col gap-5 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary text-xl mx-auto shadow-[0_0_15px_rgba(226,255,59,0.3)] animate-pulse">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic leading-tight text-white">
                      REFLEX<br/>CALIBRATION
                    </h2>
                    <span className="text-[9px] font-black text-primary tracking-[3px] uppercase block mt-1.5">
                      ESTABLISH YOUR BASELINE
                    </span>
                  </div>
                  <p className="text-xs text-white/50 font-semibold leading-relaxed max-w-[280px] mx-auto">
                    Welcome, Fighter. Before you start training, we need to measure your current reaction baseline with two quick trials.
                  </p>
                  <NeonButton onClick={() => advanceAssessStep('s1-intro')} className="w-full h-14 mt-4">
                    START ASSESSMENT
                  </NeonButton>
                </div>
              )}

              {/* Stage 1 Intro Screen */}
              {assessStep === 's1-intro' && (
                <div className="flex flex-col gap-5 text-center">
                  <span className="text-[9px] font-black text-primary tracking-[3px] uppercase block">
                    STAGE 01: COLOR MATCH
                  </span>
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col items-center gap-4">
                    <span className="text-[7px] font-black text-white/40 tracking-wider uppercase">
                      YOUR TARGET COLOR
                    </span>
                    <div className="w-14 h-14 rounded-full bg-[#ff2d55] shadow-[0_0_20px_rgba(255,45,85,0.6)]" />
                  </div>
                  <p className="text-xs text-white/50 font-semibold leading-relaxed max-w-[280px] mx-auto">
                    The circle will change colors. <strong className="text-red-500">TAP</strong> as fast as you can when it turns <span className="text-red-500 font-extrabold">RED</span>.
                  </p>
                  <NeonButton onClick={startAssessStage1} className="w-full h-14 mt-4">
                    READY
                  </NeonButton>
                </div>
              )}

              {/* Stage 1 Play Screen */}
              {assessStep === 's1-play' && (
                <div className="flex flex-col gap-6 text-center">
                  <span className="text-[9px] font-black text-primary tracking-[2px] uppercase block">
                    STAGE 01 - ROUND {assessRoundCount + 1}/3
                  </span>
                  <div 
                    onClick={handleAssessClap}
                    className="w-36 h-36 rounded-full border border-white/10 flex items-center justify-center mx-auto cursor-pointer relative overflow-hidden"
                    style={{ background: assessColor, transition: 'background 0.05s, transform 0.1s' }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-white/40">
                      {assessTargetActive ? 'TAP!' : 'WAIT...'}
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-white/30 tracking-wider uppercase">
                    TAP WHEN RED FLASHES
                  </span>
                </div>
              )}

              {/* Stage 2 Intro Screen */}
              {assessStep === 's2-intro' && (
                <div className="flex flex-col gap-5 text-center">
                  <span className="text-[9px] font-black text-primary tracking-[3px] uppercase block">
                    STAGE 02: SHAPE COGNITION
                  </span>
                  <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 rounded-3xl p-5">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[6px] font-black text-white/40 uppercase tracking-widest">
                        TARGET SHAPE
                      </span>
                      <div className="w-10 h-10 bg-white rounded-lg" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[6px] font-black text-white/40 uppercase tracking-widest">
                        TARGET COLOR
                      </span>
                      <div className="w-10 h-10 bg-primary rounded-full" />
                    </div>
                  </div>
                  <p className="text-xs text-white/50 font-semibold leading-relaxed max-w-[280px] mx-auto">
                    Now it&apos;s harder. <strong className="text-white">TAP</strong> only when you see a <span className="text-white font-extrabold">WHITE SQUARE</span>. Distractors will try to trick you.
                  </p>
                  <NeonButton onClick={startAssessStage2} className="w-full h-14 mt-4">
                    BEGIN STAGE 2
                  </NeonButton>
                </div>
              )}

              {/* Stage 2 Play Screen */}
              {assessStep === 's2-play' && (
                <div className="flex flex-col gap-6 text-center">
                  <span className="text-[9px] font-black text-primary tracking-[2px] uppercase block">
                    STAGE 02 - ROUND {assessRoundCount + 1}/3
                  </span>
                  <div 
                    onClick={handleAssessClap}
                    className="w-36 h-36 rounded-full border border-white/10 flex items-center justify-center mx-auto cursor-pointer relative"
                  >
                    <div 
                      className={`assess-object w-16 h-16 transition-all duration-100 ${
                        assessShape === 'shape-square' 
                          ? 'rounded-lg' 
                          : assessShape === 'shape-triangle' 
                            ? 'w-0 h-0 border-l-[32px] border-r-[32px] border-b-[56px] border-l-transparent border-r-transparent' 
                            : 'rounded-full'
                      }`}
                      style={{ 
                        background: assessShape === 'shape-triangle' ? 'transparent' : assessColor,
                        borderBottomColor: assessShape === 'shape-triangle' ? assessColor : undefined
                      }}
                    />
                  </div>
                  <span className="text-[8px] font-black text-white/30 tracking-wider uppercase">
                    TAP ONLY ON WHITE SQUARE
                  </span>
                </div>
              )}

              {/* Results Screen */}
              {assessStep === 'results' && (
                <div className="flex flex-col gap-5 text-center">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic leading-tight text-white">
                      PROFILE<br/>CALIBRATED
                    </h2>
                    <span className="text-[9px] font-black text-primary tracking-[3px] uppercase block mt-1.5">
                      YOUR REFLEX BASELINE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl py-4">
                      <span className="text-[7px] font-black text-white/40 tracking-wider block uppercase mb-1">
                        REACTION
                      </span>
                      <span className="text-xl font-black text-white italic">
                        {assessBaseline}ms
                      </span>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl py-4">
                      <span className="text-[7px] font-black text-primary tracking-wider block uppercase mb-1">
                        RATING
                      </span>
                      <span className="text-lg font-black text-primary uppercase">
                        {assessRating}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-white/50 font-semibold leading-relaxed max-w-[280px] mx-auto mt-2">
                    {assessMessage}
                  </p>
                  
                  <NeonButton onClick={closeAssessment} className="w-full h-14 mt-4">
                    ENTER PROGRAM
                  </NeonButton>
                </div>
              )}

              {/* Navigation Indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {['start', 's1-intro', 's1-play', 's2-intro', 's2-play', 'results'].map((stepVal, idx) => (
                  <div 
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      assessStep === stepVal ? 'bg-primary w-4 shadow-[0_0_8px_rgba(226,255,59,0.5)]' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
