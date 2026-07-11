'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  Play, 
  Calendar, 
  Zap, 
  Brain, 
  User, 
  Trophy, 
  Target, 
  Check, 
  Activity,
  Heart,
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react';
import { getDailyWorkout } from '@/lib/workout-data';
import { StreakManager } from '@/lib/streak-manager';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { RankBadge } from '@/components/ui/RankBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function DashboardPage() {
  const router = useRouter();
  const [ringName, setRingName] = useState('FIGHTER');
  const [streak, setStreak] = useState(0);
  const [bpm, setBpm] = useState(92);
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);

  // Onboarding metrics
  const [level, setLevel] = useState('Novice');
  
  // Tutorial State
  const [tutorialDone, setTutorialDone] = useState(true);
  const [showTutorialWelcome, setShowTutorialWelcome] = useState(false);
  const [tutStep, setTutStep] = useState(0);

  // Get daily workout for today
  const todayWorkout = useMemo(() => getDailyWorkout(), []);

  // Calculate greeting based on local time
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'MORNING';
    if (hours < 18) return 'AFTERNOON';
    return 'EVENING';
  }, []);

  useEffect(() => {
    // Load onboarding data
    const onboardingRaw = localStorage.getItem('boxing_onboarding_data');
    if (onboardingRaw) {
      try {
        const onboarding = JSON.parse(onboardingRaw);
        setRingName((onboarding.ringName || onboarding.ring_name || 'FIGHTER').toUpperCase());
        setLevel(onboarding.experience_level || onboarding.experienceLevel || 'Novice');
      } catch (e) {
        console.error('Failed to parse onboarding data:', e);
      }
    }

    // Load streak data
    const activeStreak = StreakManager.checkAndGetStreak();
    setStreak(activeStreak);

    // Sync streak to Supabase if logged in
    StreakManager.syncWithSupabase().catch(console.error);

    // Load today's workout completion progress
    const progressKey = 'workout_progress_' + new Date().toDateString();
    try {
      const storedProgress = localStorage.getItem(progressKey);
      if (storedProgress) {
        setCompletedIndices(JSON.parse(storedProgress).map(Number));
      }
    } catch (e) {
      console.error('Failed to load workout progress:', e);
    }

    // Simulated heart rate fluctuation
    const bpmInterval = setInterval(() => {
      setBpm(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = prev + delta;
        return next > 98 ? 98 : next < 90 ? 90 : next;
      });
    }, 4000);

    // Setup Calendar Strip (last 3 days + today + next 3 days)
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const tempDays = [];
    for (let i = -3; i <= 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const isToday = i === 0;
      const dateNum = date.getDate();
      const dayName = dayLabels[date.getDay()];
      const progressKeyForDay = 'workout_progress_' + date.toDateString();
      
      let isFullyCompleted = false;
      try {
        const dayProgress = localStorage.getItem(progressKeyForDay);
        if (dayProgress) {
          const completed = JSON.parse(dayProgress);
          // Standard day has bodyweightCount + boxingCount drills.
          // For simplicity, if they completed any drills on a past day, check it off
          // or compare to daily workout drills length
          const dayWorkout = getDailyWorkout(date);
          isFullyCompleted = completed.length > 0 && completed.length >= dayWorkout.drills.length;
        }
      } catch (e) {
        // ignore
      }

      tempDays.push({
        dayName,
        dateNum,
        isToday,
        isFullyCompleted,
      });
    }
    setCalendarDays(tempDays);

    // Check tutorial state
    const isTutorialDone = localStorage.getItem('boxing_tutorial_done') === '1';
    setTutorialDone(isTutorialDone);
    if (!isTutorialDone) {
      // Delay to allow page elements to mount nicely
      const timer = setTimeout(() => {
        setShowTutorialWelcome(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => clearInterval(bpmInterval);
  }, []);

  // Compute completion percent
  const completionPercent = useMemo(() => {
    if (!todayWorkout.drills.length) return 0;
    return Math.round((completedIndices.length / todayWorkout.drills.length) * 100);
  }, [todayWorkout.drills, completedIndices]);

  // Find next uncompleted drill
  const nextDrill = useMemo(() => {
    return todayWorkout.drills.find((_, idx) => !completedIndices.includes(idx)) || null;
  }, [todayWorkout.drills, completedIndices]);

  // Next drill value display helper
  const nextDrillValue = useMemo(() => {
    if (!nextDrill) return null;
    if (nextDrill.duration) {
      const minutes = Math.round(nextDrill.duration / 60);
      return minutes > 0 ? `${minutes}m` : `${nextDrill.duration}s`;
    }
    if (nextDrill.reps) {
      const match = nextDrill.reps.match(/\d+/);
      return match ? match[0] : 'GO';
    }
    return 'GO';
  }, [nextDrill]);

  // Tutorial Steps Configuration
  const tutorialSteps = [
    {
      title: "Today's Mission",
      desc: "This card shows your daily workout focus and your completion progress for the day.",
      selector: '.challenge-card-ref',
    },
    {
      title: "Start Session",
      desc: "Tap this to begin your daily training drills. Each session keeps your streak alive!",
      selector: '.start-btn-ref',
    },
    {
      title: "Skill Focus",
      desc: "Your tactical power modules: GRIND for workouts, PLANNER for your weekly layout, REFLEX for speed, and GURU for techniques.",
      selector: '.skills-ref',
    },
    {
      title: "Live Analyser",
      desc: "Record your workouts using our computer vision engine to analyse form, velocity & slip reaction in real-time.",
      selector: '.analyser-ref',
    },
    {
      title: "Rank Tiers",
      desc: "Your Combat Rank is based on your training streak. Climb from ROOKIE to MASTER by showing up daily!",
      selector: '.ranks-ref',
    }
  ];

  const handleStartTutorial = () => {
    setShowTutorialWelcome(false);
    setTutorialDone(false);
    setTutStep(0);
  };

  const handleSkipTutorial = () => {
    localStorage.setItem('boxing_tutorial_done', '1');
    setTutorialDone(true);
    setShowTutorialWelcome(false);
  };

  const handleNextTutorial = () => {
    if (tutStep < tutorialSteps.length - 1) {
      setTutStep(prev => prev + 1);
    } else {
      localStorage.setItem('boxing_tutorial_done', '1');
      setTutorialDone(true);
    }
  };

  return (
    <div className="relative w-full">
      {/* Top HUD Telemetry Display (embedded context-aware details) */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <div className="flex flex-col gap-0.5">
          <span className="opacity-80">SYS_ID: <span className="text-white font-black">{ringName}</span></span>
          <span className="opacity-40">STATUS: ACTIVE</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-500 text-sm font-black">
          <Heart className="w-3.5 h-3.5 fill-red-500 animate-pulse" />
          <span className="font-mono text-xs">{bpm}_BPM</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 anim-fade-in">
        {/* Unified Fighter Header */}
        <header className="flex justify-between items-start">
          <div className="flex items-center gap-4 ranks-ref">
            <div className="w-14 h-14 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] overflow-hidden bg-black/40">
              <img 
                src="https://i.pravatar.cc/150?u=viktor" 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">
                {greeting}, ELITE
              </div>
              <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
                TODAY&apos;S MISSION
              </h1>
              <div className="flex gap-2 mt-2">
                <div 
                  onClick={() => router.push('/settings')}
                  className="cursor-pointer"
                >
                  <RankBadge score={streak} />
                </div>
                <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black tracking-widest text-white/60 flex items-center gap-1">
                  <span>XP LEVEL</span>
                  <span className="text-primary font-black">{level.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
          <Link 
            href="/leaderboard" 
            className="w-10 h-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(226,255,59,0.15)] hover:bg-primary hover:text-black transition-all duration-300"
          >
            <Trophy className="w-4 h-4" />
          </Link>
        </header>

        {/* 7-Day Calendar Strip */}
        <div className="grid grid-cols-7 gap-2 my-2 select-none">
          {calendarDays.map((day, idx) => (
            <div 
              key={idx}
              className={`relative flex flex-col items-center justify-center py-2.5 rounded-2xl border transition-all duration-300 ${
                day.isToday 
                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.25)] scale-105' 
                  : 'bg-black/20 border-white/5 opacity-55'
              }`}
            >
              {day.isFullyCompleted && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-black flex items-center justify-center text-[8px] font-black shadow-[0_0_5px_rgba(34,197,94,0.6)]">
                  <Check className="w-2.5 h-2.5 stroke-[4]" />
                </div>
              )}
              <span className={`text-[9px] font-black uppercase mb-1 ${day.isToday ? 'text-white' : 'text-white/40'}`}>
                {day.dayName}
              </span>
              <span className={`text-sm font-black leading-none ${day.isToday ? 'text-primary' : 'text-white'}`}>
                {day.dateNum}
              </span>
            </div>
          ))}
        </div>

        {/* Today Challenge / Progress Card */}
        <GlassCard 
          className="challenge-card-ref bg-gradient-to-br from-primary/10 to-black/60 border-primary/30 relative overflow-hidden"
          hoverGlow
          onClick={() => router.push('/training')}
        >
          {/* Glove watermark background */}
          <div className="absolute right-0 bottom-0 top-0 opacity-[0.03] text-primary pointer-events-none flex items-center overflow-hidden">
            <Target className="w-56 h-56 transform translate-x-12 translate-y-6" />
          </div>

          <div className="flex justify-between items-center relative z-10">
            <div className="flex-1 pr-4">
              <span className="text-[9px] font-black tracking-[3px] text-primary uppercase block mb-1">
                TODAY CHALLENGE
              </span>
              <h3 className="text-xl font-bold uppercase tracking-tight italic leading-tight text-white">
                {todayWorkout.title}
              </h3>
              <p className="text-xs text-white/50 font-semibold mt-1">
                {todayWorkout.drills.length > 0 
                  ? `Complete ${todayWorkout.drills.length} strategic drills`
                  : 'Recovery Protocol Active'}
              </p>
            </div>
            
            <ProgressRing progress={completionPercent} size={70} strokeWidth={6} />
          </div>
        </GlassCard>

        {/* HUD Goal item */}
        <div className="glass-card flex items-center justify-between p-4 border border-white/5 bg-black/40 rounded-3xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-black text-white/40 tracking-wider uppercase mb-0.5">
                NEXT OBJECTIVE
              </div>
              <div className="text-xs font-black uppercase text-white truncate max-w-[200px]">
                {nextDrill ? nextDrill.name : 'ALL OBJECTIVES COMPLETE'}
              </div>
            </div>
          </div>
          
          <div className="w-9 h-9 rounded-full border border-primary/40 text-[10px] font-black text-primary flex items-center justify-center shadow-[0_0_8px_rgba(226,255,59,0.15)] bg-primary/5">
            {nextDrill ? nextDrillValue : <Check className="w-4 h-4 text-primary stroke-[3]" />}
          </div>
        </div>

        {/* Start Session Button */}
        <NeonButton 
          className="start-btn-ref w-full h-[68px] text-base font-black italic tracking-widest text-black uppercase"
          onClick={() => router.push('/training')}
        >
          START SESSION <Play className="w-4 h-4 fill-black text-black ml-1.5" />
        </NeonButton>

        {/* Skill Focus Strips */}
        <div>
          <div className="flex items-center gap-3 mb-4 select-none">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <span className="text-[9px] font-black tracking-[4px] text-white/30 uppercase">SKILL FOCUS</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>

          <div className="grid grid-cols-4 gap-3.5 skills-ref">
            <Link 
              href="/training" 
              className="flex flex-col items-center gap-2 p-3 bg-black/40 border border-orange-500/10 rounded-2xl hover:border-orange-500/40 hover:bg-orange-500/5 transition-all duration-300 no-underline"
            >
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                <Flame className="w-5 h-5 fill-orange-500/20" />
              </div>
              <span className="text-[9px] font-black tracking-wider text-orange-500 uppercase">GRIND</span>
            </Link>

            <Link 
              href="/planner" 
              className="flex flex-col items-center gap-2 p-3 bg-black/40 border border-purple-500/10 rounded-2xl hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-300 no-underline"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black tracking-wider text-purple-500 uppercase">PLANNER</span>
            </Link>

            <Link 
              href="/reflex" 
              className="flex flex-col items-center gap-2 p-3 bg-black/40 border border-cyan-500/10 rounded-2xl hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all duration-300 no-underline"
            >
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                <Zap className="w-5 h-5 fill-cyan-500/20" />
              </div>
              <span className="text-[9px] font-black tracking-wider text-cyan-500 uppercase">REFLEX</span>
            </Link>

            <Link 
              href="/guru" 
              className="flex flex-col items-center gap-2 p-3 bg-black/40 border border-pink-500/10 rounded-2xl hover:border-pink-500/40 hover:bg-pink-500/5 transition-all duration-300 no-underline"
            >
              <div className="w-11 h-11 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.1)]">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black tracking-wider text-pink-500 uppercase">GURU</span>
            </Link>
          </div>
        </div>

        {/* Live Analyser banner */}
        <div className="relative mt-2 analyser-ref">
          <div className="absolute -top-3.5 right-6 z-10">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 text-[8px] font-black text-black tracking-widest shadow-[0_0_8px_rgba(249,115,22,0.3)] uppercase">
              <Flame className="w-2.5 h-2.5 fill-black stroke-none" />
              <span>{streak}D STREAK</span>
            </div>
          </div>
          
          <Link 
            href="/vision"
            className="flex items-center justify-between p-5 bg-black/40 border border-primary/20 rounded-3xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 shadow-[0_0_20px_rgba(226,255,59,0.05)] no-underline group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] font-black tracking-[2px] text-primary uppercase block mb-1">
                  AI VISION SYSTEM
                </span>
                <h3 className="text-lg font-black uppercase text-white tracking-wide italic">
                  LIVE ANALYSER
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-[9px] font-black text-white/40 tracking-wider">
              <span className="text-primary font-black">ACTIVE</span>
              <ChevronRight className="w-4 h-4 opacity-30 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Tutorial Overlay Systems */}
      <AnimatePresence>
        {showTutorialWelcome && (
          <motion.div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary text-3xl mb-6 shadow-[0_0_20px_rgba(226,255,59,0.3)]">
              🥊
            </div>
            <h2 className="text-3xl font-black uppercase italic text-white tracking-wide leading-tight mb-3">
              Welcome,<br /><span className="text-primary">Fighter!</span>
            </h2>
            <p className="text-sm text-white/60 font-semibold max-w-[280px] leading-relaxed mb-8">
              Your AI-powered boxing command centre is ready. Let us take you on a quick tour.
            </p>
            <div className="flex flex-col gap-3.5 w-full max-w-[260px]">
              <NeonButton onClick={handleStartTutorial} className="w-full">
                SHOW ME AROUND
              </NeonButton>
              <button 
                onClick={handleSkipTutorial} 
                className="text-xs font-black text-white/40 hover:text-white uppercase tracking-widest py-2"
              >
                SKIP TUTORIAL
              </button>
            </div>
          </motion.div>
        )}

        {!tutorialDone && !showTutorialWelcome && (
          <motion.div 
            className="fixed inset-0 z-[99999] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Dark Mask Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 pointer-events-auto" 
              onClick={handleSkipTutorial}
            />

            {/* Spotlight cut-out effect */}
            {/* Handled by rendering spotlight box dynamically with absolute positioning */}
            
            {/* Tooltip Card */}
            <div className="absolute bottom-28 left-4 right-4 bg-black/95 border border-primary/30 rounded-3xl p-5 shadow-2xl pointer-events-auto z-10 flex flex-col gap-4 max-w-sm mx-auto">
              <div className="flex justify-between items-center">
                <button 
                  onClick={handleSkipTutorial} 
                  className="text-[9px] font-black text-white/40 hover:text-white uppercase tracking-widest"
                >
                  SKIP
                </button>
                <div className="text-[9px] font-black text-primary tracking-widest uppercase">
                  STEP {tutStep + 1} OF {tutorialSteps.length}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-black uppercase italic text-white leading-none mb-1">
                  {tutorialSteps[tutStep].title}
                </h4>
                <p className="text-xs text-white/60 leading-relaxed font-semibold">
                  {tutorialSteps[tutStep].desc}
                </p>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-1.5">
                  {tutorialSteps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === tutStep ? 'bg-primary w-4' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                
                <NeonButton 
                  onClick={handleNextTutorial} 
                  className="px-5 py-2 h-9 text-xs"
                >
                  {tutStep === tutorialSteps.length - 1 ? "LET'S GO 🥊" : "NEXT"}
                </NeonButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
