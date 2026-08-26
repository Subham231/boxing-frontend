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
  ChevronRight,
  Sparkles,
  Award,
  Swords
} from 'lucide-react';
import {
  SwordsNeonIcon,
  FlameNeonIcon,
  TargetNeonIcon,
  ZapNeonIcon,
  BrainNeonIcon,
  TrophyNeonIcon,
} from '@/components/ui/NeonIcons';
import { getDailyWorkout } from '@/lib/workout-data';
import { StreakManager } from '@/lib/streak-manager';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { useRankState } from '@/lib/rank-client';
import { useMyProfile } from '@/lib/profile-client';
import WeeklyLeaderboard from '@/components/reflex/WeeklyLeaderboard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { RankBadge } from '@/components/ui/RankBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import WelcomeIntro, { WELCOME_INTRO_KEY } from '@/components/tutorial/WelcomeIntro';
import SpotlightTour, { TourStep } from '@/components/tutorial/SpotlightTour';
import { SparFreePromoModal } from '@/components/ui/SparFreePromoModal';
import { HomePromoDealsBanner } from '@/components/ui/HomePromoDealsBanner';
import { FeatureShowcaseTemplates } from '@/components/dashboard/FeatureShowcaseTemplates';

const TUTORIAL_DONE_KEY = 'boxing_tutorial_done';

export default function DashboardPage() {
  const { user: fbUser } = useFirebaseUser();
  const { rankState } = useRankState();
  const { profile: myProfile } = useMyProfile();
  const router = useRouter();
  const [ringName, setRingName] = useState('FIGHTER');
  // Authoritative streak/rank (video-analysis sessions only), synced from
  // Supabase via useRankState — falls back to 0 while loading/logged out.
  const streak = rankState?.current_streak ?? 0;
  const rankLevel = rankState?.rank_level ?? 0;
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [visionComplete, setVisionComplete] = useState(false);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);

  // Onboarding metrics
  const [level, setLevel] = useState('Novice');
  
  // Tutorial State: welcome intro (once) -> spotlight tour (once), both replayable from Settings
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(false);
  const [showSpotlightTour, setShowSpotlightTour] = useState(false);

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

    // Note: the displayed streak/rank now comes from useRankState() (backed
    // by the video-analysis-driven Supabase system), not from the legacy
    // StreakManager below. StreakManager still runs to keep the old
    // display-name-keyed leaderboard table populated in parallel — see
    // PROJECT_HANDOFF.md — but it's no longer the source of truth for what
    // the user sees here.

    // Sync streak to Supabase if logged in
    StreakManager.syncWithSupabase().catch(console.error);

    // Load today's workout completion progress
    const progressKey = 'workout_progress_' + new Date().toDateString();
    try {
      const storedProgress = localStorage.getItem(progressKey);
      if (storedProgress) {
        setCompletedIndices(JSON.parse(storedProgress).map(Number).filter((index: number) => index !== 99));
      }
      setVisionComplete(localStorage.getItem('vision_progress_' + new Date().toDateString()) === 'true');
    } catch (e) {
      console.error('Failed to load workout progress:', e);
    }

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

    // Check tutorial state: welcome intro takes priority on first-ever visit,
    // spotlight tour runs right after (or alone, if intro was already seen).
    const introDone = localStorage.getItem(WELCOME_INTRO_KEY) === '1';
    const tourDone = localStorage.getItem(TUTORIAL_DONE_KEY) === '1';
    if (!introDone) {
      const timer = setTimeout(() => setShowWelcomeIntro(true), 600);
      return () => clearTimeout(timer);
    } else if (!tourDone) {
      const timer = setTimeout(() => setShowSpotlightTour(true), 600);
      return () => clearTimeout(timer);
    }

  }, []);

  // Supabase is the single source of truth for the display name once the
  // profile has loaded — set unconditionally (even to the default) so a
  // stale locally-cached name (e.g. from testing a different account on
  // this device) can never linger just because Supabase happens to be null.
  useEffect(() => {
    if (myProfile) {
      setRingName((myProfile.display_name || 'FIGHTER').toUpperCase());
    }
  }, [myProfile]);


  // Compute completion percent
  const completionPercent = useMemo(() => {
    if (!todayWorkout.drills.length) return 0;
    const completed = completedIndices.length + (visionComplete ? 1 : 0);
    return Math.round((completed / todayWorkout.drills.length) * 100);
  }, [todayWorkout.drills, completedIndices, visionComplete]);

  // Find next uncompleted drill
  const nextDrill = useMemo(() => {
    return todayWorkout.drills.find((drill, idx) => drill.isVision ? !visionComplete : !completedIndices.includes(idx)) || null;
  }, [todayWorkout.drills, completedIndices, visionComplete]);

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

  // Dashboard Spotlight Tour Steps Configuration
  const tourSteps: TourStep[] = [
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

  const handleWelcomeIntroDone = () => {
    setShowWelcomeIntro(false);
    if (localStorage.getItem(TUTORIAL_DONE_KEY) !== '1') {
      setShowSpotlightTour(true);
    }
  };

  return (
    <div className="relative w-full">
      {/* Non-repeating One-Time Limited Free Sparring & Deals Launch Popup */}
      <SparFreePromoModal />

      <div className="flex flex-col gap-6 anim-fade-in">
        {/* Unified Fighter Header */}
        <header className="flex justify-between items-start">
          <div className="flex items-center gap-4 ranks-ref">
            <div className="w-14 h-14 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] overflow-hidden bg-black/40 flex items-center justify-center">
              {myProfile?.avatar_url ? (
                <img
                  src={myProfile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-black text-primary">{ringName.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">
                {greeting}, ELITE
              </div>
              <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
                TODAY&apos;S MISSION
              </h1>
              <div className="flex items-center gap-2.5 mt-2.5">
                <div 
                  onClick={() => router.push('/ranks')}
                  className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <RankBadge score={streak} level={rankLevel} />
                </div>

                {/* Cyberpunk Glassmorphic XP Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 via-black/40 to-primary/5 shadow-[0_0_12px_rgba(226,255,59,0.15)] backdrop-blur-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span className="text-[9px] font-black tracking-widest text-white/50 uppercase">XP LEVEL</span>
                  <span className="text-[11px] font-black tracking-wider text-primary uppercase drop-shadow-[0_0_8px_rgba(226,255,59,0.5)]">
                    {level.toUpperCase()}
                  </span>
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

        {fbUser && (
          <Link href="/reflex" className="block">
            <WeeklyLeaderboard gameId="reaction_tap" topN={5} currentUid={fbUser.uid} compact />
          </Link>
        )}

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

        {/* Live 1v1 Spar & Limited Deals Spotlight Banner */}
        <HomePromoDealsBanner />

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
              className="flex flex-col items-center gap-2 p-3 bg-black/40 border border-orange-500/20 rounded-2xl hover:border-orange-500/50 hover:bg-orange-500/10 transition-all duration-300 no-underline active:scale-95"
            >
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
                <FlameNeonIcon className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-[9px] font-black tracking-wider text-orange-400 uppercase">GRIND</span>
            </Link>

            <Link 
              href="/planner" 
              className="flex flex-col items-center gap-2 p-3 bg-black/40 border border-purple-500/20 rounded-2xl hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-300 no-underline active:scale-95"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                <Calendar className="w-5 h-5 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
              </div>
              <span className="text-[9px] font-black tracking-wider text-purple-400 uppercase">PLANNER</span>
            </Link>

            <Link 
              href="/reflex" 
              className="flex flex-col items-center gap-2 p-3 bg-black/40 border border-cyan-500/20 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300 no-underline active:scale-95"
            >
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <ZapNeonIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-[9px] font-black tracking-wider text-cyan-400 uppercase">REFLEX</span>
            </Link>

            <Link 
              href="/guru" 
              className="flex flex-col items-center gap-2 p-3 bg-black/40 border border-pink-500/20 rounded-2xl hover:border-pink-500/50 hover:bg-pink-500/10 transition-all duration-300 no-underline active:scale-95"
            >
              <div className="w-11 h-11 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.2)]">
                <BrainNeonIcon className="w-5 h-5 text-pink-400" />
              </div>
              <span className="text-[9px] font-black tracking-wider text-pink-400 uppercase">GURU</span>
            </Link>
          </div>
        </div>

        {/* Dynamic Theme Feature Showcase Templates */}
        <FeatureShowcaseTemplates />

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
        {showWelcomeIntro && <WelcomeIntro key="welcome-intro" onDone={handleWelcomeIntroDone} />}
        {showSpotlightTour && !showWelcomeIntro && (
          <SpotlightTour
            key="spotlight-tour"
            steps={tourSteps}
            storageKey={TUTORIAL_DONE_KEY}
            onDone={() => setShowSpotlightTour(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
