'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  Play, 
  Target, 
  Check, 
  ChevronRight,
  Award,
  Bell
} from 'lucide-react';
import { getDailyWorkout } from '@/lib/workout-data';
import { StreakManager } from '@/lib/streak-manager';
import { useRankState } from '@/lib/rank-client';
import { useMyProfile } from '@/lib/profile-client';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { RankBadge } from '@/components/ui/RankBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import WelcomeIntro, { WELCOME_INTRO_KEY } from '@/components/tutorial/WelcomeIntro';
import SpotlightTour, { TourStep } from '@/components/tutorial/SpotlightTour';
import { SparFreePromoModal } from '@/components/ui/SparFreePromoModal';
import { AnalysisCamIcon, SwordsNeonIcon, ZapNeonIcon, BrainNeonIcon } from '@/components/ui/NeonIcons';

const TUTORIAL_DONE_KEY = 'boxing_tutorial_done';

export default function DashboardPage() {
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

  const telemetry = useMemo(() => {
    if (typeof window === 'undefined') return { punches: 0, reaction: 0 };
    try {
      const sessions = JSON.parse(localStorage.getItem('boxing_session_history') || '[]');
      const latest = Array.isArray(sessions) ? sessions[0] : null;
      return {
        punches: latest?.punches ?? 0,
        reaction: latest?.avg_reflex_ms ?? 0,
      };
    } catch {
      return { punches: 0, reaction: 0 };
    }
  }, [visionComplete]);

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
    <div className="relative -mx-4 min-h-[calc(100dvh-1rem)] w-[calc(100%+2rem)] overflow-hidden bg-[#0A0A0A] px-4">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(226,255,59,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(226,255,59,0.08) 1px, transparent 1px)', backgroundSize: '26px 26px', maskImage: 'linear-gradient(to bottom, black, transparent 88%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 88%)' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/[0.06] to-transparent" />
      {/* Non-repeating One-Time Limited Free Sparring & Deals Launch Popup */}
      <SparFreePromoModal />

      <div className="relative z-10 flex flex-col gap-5 anim-fade-in pb-10 pt-2">
        {/* Fighter identity and alert action */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3 ranks-ref">
            <div className="relative w-12 h-12 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] overflow-hidden bg-black/40 flex items-center justify-center">
              {myProfile?.avatar_url ? (
                <img
                  src={myProfile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-black text-primary">{ringName.charAt(0)}</span>
              )}
              <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-primary border-2 border-bg-dark" />
            </div>
            <div>
              <h1 className="text-base font-black uppercase leading-none text-white tracking-wide">{ringName}</h1>
              <div className="flex items-center gap-1.5 mt-1 text-[9px] font-black uppercase tracking-widest text-primary">
                <span>{level}</span><span className="text-white/25">•</span><span className="text-white/45">LVL {rankLevel}</span>
              </div>
            </div>
          </div>
          <Link href="/settings" aria-label="Open notifications and profile settings" className="relative w-10 h-10 rounded-xl border border-white/10 bg-[#121212] flex items-center justify-center text-white/70 shadow-[0_0_16px_rgba(226,255,59,0.06)] hover:text-primary hover:border-primary/40 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-primary" />
          </Link>
        </header>

        <div className="flex items-center justify-between rounded-2xl border border-primary/25 bg-primary/[0.04] px-4 py-3">
          <div className="flex items-center gap-3">
            <Flame className="w-6 h-6 text-primary fill-primary" />
            <div><div className="text-sm font-black uppercase text-white">{streak}-day streak <span className="text-[8px] text-primary border border-primary/40 rounded px-1.5 py-0.5 ml-1">ACTIVE</span></div><div className="text-[9px] text-white/45 font-bold uppercase tracking-wider mt-1">Keep the chain alive</div></div>
          </div>
          <button onClick={() => router.push('/ranks')} className="text-right"><RankBadge score={streak} level={rankLevel} /></button>
        </div>

        {/* Microcycle progress */}
        <section className="rounded-[15px] border border-white/10 bg-[#101112] p-3 shadow-[0_0_18px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-center mb-2.5"><div><span className="text-[8px] font-black text-white/45 uppercase tracking-[1.5px]">Microcycle progress</span><h2 className="text-xs font-black uppercase text-white mt-1">Week 4 • {Math.min(6, completedIndices.length + (visionComplete ? 1 : 0))} of 6 sessions</h2></div><span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[7px] font-black text-primary uppercase">✹ 1 freeze active</span></div>
        <div className="grid grid-cols-7 gap-1 select-none">
          {calendarDays.map((day, idx) => (
            <div 
              key={idx}
              className={`relative flex flex-col items-center justify-center py-2 rounded-xl border transition-all duration-300 ${
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
        </div></section>

        {/* Today Challenge / Progress Card */}
        <GlassCard 
          className="challenge-card-ref bg-gradient-to-br from-[#273318] via-[#11150D] to-[#0B0D0B] border-primary/30 relative overflow-hidden p-3.5 rounded-[15px] shadow-[0_0_22px_rgba(226,255,59,0.07)]"
          hoverGlow
          onClick={() => router.push('/training')}
        >
          {/* Glove watermark background */}
          <div className="absolute right-0 bottom-0 top-0 opacity-[0.03] text-primary pointer-events-none flex items-center overflow-hidden">
            <Target className="w-56 h-56 transform translate-x-12 translate-y-6" />
          </div>

          <div className="flex justify-between items-center relative z-10">
            <div className="flex-1 pr-4">
              <span className="inline-flex text-[7px] font-black tracking-widest text-primary uppercase border border-primary/50 bg-primary/10 rounded px-1.5 py-0.5 mb-1.5">
                TARGET COMBAT MISSION
              </span>
              <h3 className="text-[19px] font-black uppercase tracking-tight italic leading-[0.95] text-white">
                {todayWorkout.title}
              </h3>
              <p className="text-[10px] text-white/60 font-semibold mt-1.5 max-w-[210px] leading-snug">
                {todayWorkout.drills.length > 0 
                  ? `High-cadence combat drills with dynamic AI stance tracking.`
                  : 'Recovery Protocol Active'}
              </p>
            </div>
            
            <ProgressRing progress={completionPercent} size={58} strokeWidth={5} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 relative z-10">
            <div className="rounded-lg border border-white/10 bg-black/50 p-2"><span className="block text-[7px] font-black text-white/40 uppercase tracking-widest">Duration</span><strong className="text-xs text-white">{todayWorkout.drills.length * 15} MIN</strong></div>
            <div className="rounded-lg border border-white/10 bg-black/50 p-2"><span className="block text-[7px] font-black text-white/40 uppercase tracking-widest">Rounds</span><strong className="text-xs text-white">{todayWorkout.drills.length} RDS</strong></div>
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
          className="start-btn-ref w-full h-11 text-[11px] font-black tracking-widest text-black uppercase rounded-lg shadow-[0_0_18px_rgba(226,255,59,0.3)]"
          onClick={() => router.push('/training')}
        >
          START SESSION <Play className="w-4 h-4 fill-black text-black ml-1.5" />
        </NeonButton>

        <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-black uppercase tracking-widest text-white">Streak milestone target</span><span className="text-[8px] font-black uppercase text-white/40">{Math.max(0, 7 - streak)} days remaining</span></div>
          <button onClick={() => router.push('/ranks')} className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-primary/40 transition-colors"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center"><Award className="w-4 h-4 text-primary" /></div><div><strong className="block text-[10px] font-black text-white uppercase">7-Day Iron Fist Milestone</strong><span className="text-[8px] text-white/45">Unlocks advanced combat analytics</span></div></div><span className="text-sm font-black text-primary">{Math.min(7, streak)}/7</span></button>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-black uppercase text-white">Core tactical modules</h2><span className="text-[8px] font-black uppercase tracking-widest text-white/35">Precision drills</span></div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { href: '/vision', label: 'AI Vision', detail: 'Kinematic strike analysis & guard check', icon: AnalysisCamIcon, color: 'text-primary', border: 'border-primary/25', badge: visionComplete ? 'DONE' : 'READY' },
              { href: '/spar', label: 'Live Sparring', detail: 'Interactive virtual opponent round tempo', icon: SwordsNeonIcon, color: 'text-orange-400', border: 'border-orange-400/25', badge: 'LIVE' },
              { href: '/reflex', label: 'Reflex Engine', detail: 'Rapid audio stimulus slip & counter drills', icon: ZapNeonIcon, color: 'text-cyan-400', border: 'border-cyan-400/25', badge: 'AUDIO' },
              { href: '/guru', label: 'Tactical Guru', detail: 'Heavyweight combination playbook library', icon: BrainNeonIcon, color: 'text-pink-400', border: 'border-pink-400/25', badge: 'VAULT' },
            ].map((module) => {
              const Icon = module.icon;
              return <Link key={module.href} href={module.href} className={`relative min-h-[132px] rounded-xl border ${module.border} bg-[#0D0D0E] p-3.5 flex flex-col justify-between no-underline shadow-[inset_0_0_18px_rgba(255,255,255,0.015)] hover:bg-white/[0.04] hover:shadow-[0_0_18px_rgba(226,255,59,0.08)] transition-all`}><span className={`absolute top-3 right-3 rounded bg-white/[0.08] px-1.5 py-1 text-[7px] font-black uppercase ${module.color}`}>{module.badge}</span><div className={`w-9 h-9 rounded-lg border border-white/10 bg-[#17191A] flex items-center justify-center ${module.color}`}><Icon className="w-4 h-4" /></div><div><strong className="block text-xs font-black uppercase text-white">{module.label} <ChevronRight className="inline w-3 h-3 text-white/35" /></strong><span className="block mt-1 text-[9px] leading-snug text-white/45">{module.detail}</span></div></Link>;
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-black uppercase text-white">Kinematic telemetry</h2><span className="text-[8px] font-black uppercase tracking-widest text-white/35">Live sensors</span></div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-white/10 bg-[#0D0D0E] p-4 shadow-[inset_0_0_18px_rgba(255,255,255,0.015)]"><span className="block text-[8px] font-black uppercase tracking-widest text-white/45">Punches logged</span><strong className="block mt-2 text-2xl font-black text-white">{telemetry.punches.toLocaleString()}</strong><span className="text-[8px] text-primary">From latest AI session</span></div>
            <div className="rounded-xl border border-white/10 bg-[#0D0D0E] p-4 shadow-[inset_0_0_18px_rgba(255,255,255,0.015)]"><span className="block text-[8px] font-black uppercase tracking-widest text-white/45">Reaction latency</span><strong className="block mt-2 text-2xl font-black text-primary">{telemetry.reaction || '--'}<span className="text-xs text-white/40 ml-1">ms</span></strong><span className="text-[8px] text-white/40">Latest measured response</span></div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#0D0D0E] p-4 shadow-[0_0_18px_rgba(226,255,59,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-white">Streak progression</span>
            <span className="text-[9px] font-black text-primary">{Math.min(7, streak)} / 7 DAYS</span>
          </div>
          <div className="h-2 rounded-full bg-black border border-white/10 p-[2px] overflow-hidden">
            <div className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(226,255,59,0.8)] transition-all duration-500" style={{ width: `${Math.min(100, (streak / 7) * 100)}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[7px] font-black uppercase tracking-wider text-white/35"><span>Current streak</span><span>{streak >= 7 ? 'Milestone unlocked' : `${Math.max(0, 7 - streak)} days remaining`}</span></div>
        </section>

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
