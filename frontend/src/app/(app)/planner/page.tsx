'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Sun, 
  CloudSun, 
  Moon, 
  Ghost, 
  Play, 
  Check, 
  Lock, 
  ArrowRight,
  RotateCcw,
  Settings,
  Activity,
  Bell,
  BellOff,
  Dumbbell,
  Swords,
  Target,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { fetchPlan } from '@/lib/planner';
import { completeKey, progressKey } from '@/lib/protocol-session';
import type { PlannerUserData, WeeklyPlan } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
// @ts-ignore — JS utility modules
import { generateLocalPlanner } from '@/utils/localPlannerEngine';
// @ts-ignore
import { requestLocalNotificationPermission, scheduleLocalWorkoutReminder } from '@/utils/localNotificationService';

// Types for local planner engine output
interface LocalExercise {
  name: string;
  target: string;
  prescription: string;
}

interface LocalDayPlan {
  title: string;
  duration: string;
  exercises: LocalExercise[];
}

export default function PlannerPage() {
  const router = useRouter();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  // Calibration Form State
  const [peakWindow, setPeakWindow] = useState('MORNING');
  const [preferredTime, setPreferredTime] = useState('07:30');

  // Local Planner Engine State
  const [localSchedule, setLocalSchedule] = useState<LocalDayPlan[]>([]);
  const [expandedLocalDay, setExpandedLocalDay] = useState<number | null>(null);

  // Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

  // Real onboarding data reference for local engine
  const [fighterName, setFighterName] = useState('Fighter');
  const [userFrequency, setUserFrequency] = useState(3);
  const [userAvailableTime, setUserAvailableTime] = useState(30);
  const [userExperience, setUserExperience] = useState('intermediate');

  useEffect(() => {
    // Check onboarding data
    const onboardingRaw = localStorage.getItem('boxing_onboarding_data');
    if (!onboardingRaw) {
      setIsOnboarded(false);
      return;
    }
    
    setIsOnboarded(true);
    let onboardingData: PlannerUserData = {};
    try {
      onboardingData = JSON.parse(onboardingRaw);
    } catch (e) {
      console.error(e);
    }

    // Extract real user data for local engines
    const name = (onboardingData as any).ring_name || (onboardingData as any).ringName || 'Fighter';
    setFighterName(name);
    const freq = (onboardingData as any).frequency || 3;
    setUserFrequency(freq);
    const availTime = (onboardingData as any).available_time || (onboardingData as any).availableTime || 30;
    setUserAvailableTime(availTime);
    const expLevel = (onboardingData as any).experience_level || (onboardingData as any).experienceLevel || 'intermediate';
    // Map experience levels to what the local engine expects
    const expMap: Record<string, string> = {
      'Novice': 'beginner',
      'Beginner': 'beginner',
      'Intermediate': 'intermediate',
      'Advanced': 'advanced',
      'Elite': 'advanced',
      'Pro': 'advanced',
    };
    setUserExperience(expMap[expLevel] || expLevel.toLowerCase() || 'intermediate');

    // Check if plan configured
    const storedPlan = localStorage.getItem('active_boxing_plan_v2');
    if (storedPlan) {
      try {
        const parsedPlan = JSON.parse(storedPlan);
        setPlan(parsedPlan);
        setIsConfigured(true);

        // Load calibration states from plan or onboarding
        const config = onboardingData.planner_config || onboardingData.plannerConfig;
        if (config) {
          setPeakWindow(config.peak_window || 'MORNING');
          setPreferredTime(config.preferred_time || '07:30');
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setIsConfigured(false);
    }

    // Check notification permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
        setNotificationStatus('granted');
      }
    }
  }, []);

  // Generate local bodyweight split whenever user data or config changes
  useEffect(() => {
    if (!isOnboarded) return;

    try {
      const localPlan = generateLocalPlanner({
        daysPerWeek: userFrequency,
        availableMinutes: userAvailableTime,
        experienceLevel: userExperience,
      });
      setLocalSchedule(localPlan);
    } catch (e) {
      console.error('Local planner engine failed:', e);
    }
  }, [isOnboarded, userFrequency, userAvailableTime, userExperience]);

  // Schedule notifications when plan is deployed and permissions are granted
  useEffect(() => {
    if (isConfigured && notificationsEnabled && preferredTime) {
      scheduleLocalWorkoutReminder(preferredTime, fighterName);
    }
  }, [isConfigured, notificationsEnabled, preferredTime, fighterName]);

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      // Disable notifications
      if (typeof window !== 'undefined' && (window as any).workoutNotificationTicker) {
        clearInterval((window as any).workoutNotificationTicker);
        (window as any).workoutNotificationTicker = null;
      }
      setNotificationsEnabled(false);
      setNotificationStatus('idle');
      return;
    }

    // Request permission
    const granted = await requestLocalNotificationPermission();
    if (granted) {
      setNotificationsEnabled(true);
      setNotificationStatus('granted');
      scheduleLocalWorkoutReminder(preferredTime, fighterName);
    } else {
      setNotificationStatus('denied');
    }
  };

  const handleDeployPlanner = async () => {
    setLoading(true);
    try {
      const onboardingRaw = localStorage.getItem('boxing_onboarding_data') || '{}';
      const onboardingData = JSON.parse(onboardingRaw) as PlannerUserData;

      // Save calibration to onboarding
      onboardingData.planner_config = {
        peak_window: peakWindow,
        preferred_time: preferredTime,
      };
      localStorage.setItem('boxing_onboarding_data', JSON.stringify(onboardingData));

      // Generate the weekly plan (will try backend API first, then fallback to local templates)
      const newPlan = await fetchPlan(onboardingData);
      setPlan(newPlan);
      localStorage.setItem('active_boxing_plan_v2', JSON.stringify(newPlan));
      localStorage.setItem('last_plan_gen_date_v2', new Date().toDateString());
      
      // Also generate the local bodyweight split
      const localPlan = generateLocalPlanner({
        daysPerWeek: userFrequency,
        availableMinutes: userAvailableTime,
        experienceLevel: userExperience,
      });
      setLocalSchedule(localPlan);

      // Store the local split for other components to consume
      localStorage.setItem('local_bodyweight_split', JSON.stringify(localPlan));

      // Setup notifications if allowed
      if (notificationsEnabled) {
        scheduleLocalWorkoutReminder(preferredTime, fighterName);
      }
      
      setIsConfigured(true);
      setIsConfiguring(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Calibration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (confirm('Regenerate weekly plan? Completed protocol history for this week will reset.')) {
      setLoading(true);
      try {
        const onboardingRaw = localStorage.getItem('boxing_onboarding_data') || '{}';
        const onboardingData = JSON.parse(onboardingRaw) as PlannerUserData;
        
        // Remove completed cache for protocols
        for (let i = 0; i < 7; i++) {
          for (let j = 0; j < 5; j++) {
            localStorage.removeItem(progressKey(String(i), String(j)));
            localStorage.removeItem(completeKey(String(i), String(j)));
          }
        }

        const newPlan = await fetchPlan(onboardingData);
        setPlan(newPlan);
        localStorage.setItem('active_boxing_plan_v2', JSON.stringify(newPlan));
        localStorage.setItem('last_plan_gen_date_v2', new Date().toDateString());
        setActiveDayIdx(0);

        // Regenerate local split too
        const localPlan = generateLocalPlanner({
          daysPerWeek: userFrequency,
          availableMinutes: userAvailableTime,
          experienceLevel: userExperience,
        });
        setLocalSchedule(localPlan);
        localStorage.setItem('local_bodyweight_split', JSON.stringify(localPlan));
      } catch (e) {
        alert('Plan generation failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper to check if a protocol block is completed
  const isProtocolBlockCompleted = (dayIdx: number, pIdx: number) => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(completeKey(String(dayIdx), String(pIdx)));
    return stored === '1' || stored === 'true';
  };

  // Peak Window choices
  const peakChoices = [
    { key: 'MORNING', icon: Sun, label: 'MORNING', time: '05:00 - 11:00' },
    { key: 'AFTERNOON', icon: CloudSun, label: 'AFTERNOON', time: '12:00 - 16:00' },
    { key: 'EVENING', icon: Moon, label: 'EVENING', time: '17:00 - 21:00' },
    { key: 'NIGHT', icon: Ghost, label: 'NIGHT', time: '22:00 - 02:00' },
  ];

  // Active day's data
  const activeDay = useMemo(() => {
    if (!plan || !plan.days) return null;
    return plan.days[activeDayIdx] || plan.days[0];
  }, [plan, activeDayIdx]);

  // Map active planner day index to the corresponding local split day (if available)
  const matchedLocalDay = useMemo(() => {
    if (!localSchedule.length) return null;
    // The local engine generates days based on frequency (e.g. 3 days for 3x/week)
    // Map the 7-day calendar to the local split rotation
    const localIdx = activeDayIdx % localSchedule.length;
    return localSchedule[localIdx] || null;
  }, [localSchedule, activeDayIdx]);

  // Count total exercises across all local days
  const totalLocalExercises = useMemo(() => {
    return localSchedule.reduce((sum, day) => sum + day.exercises.length, 0);
  }, [localSchedule]);

  // ONBOARDING GATE PROMPT
  if (!isOnboarded) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[75vh] gap-6 anim-fade-in select-none">
        <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-3xl shadow-[0_0_15px_rgba(226,255,59,0.2)]">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black uppercase italic text-white tracking-wide leading-none">
          Identity Required
        </h2>
        <p className="text-sm text-white/50 leading-relaxed font-semibold max-w-[280px]">
          Complete fighter onboarding before the planner can calculate your neural training protocols.
        </p>
        <NeonButton onClick={() => router.push('/onboarding')} className="w-full max-w-[280px]">
          START ONBOARDING <ArrowRight className="w-4 h-4 ml-1" />
        </NeonButton>
      </div>
    );
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[75vh] gap-4 anim-fade-in select-none">
        <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin shadow-[0_0_20px_rgba(226,255,59,0.2)]" />
        <h2 className="text-xl font-black uppercase italic text-white tracking-wide">
          Synthesizing Roadmap
        </h2>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">
          Calibrating neural boxing schedules...
        </p>
      </div>
    );
  }

  // CALIBRATION CONFIGURING VIEW
  if (!isConfigured || isConfiguring) {
    return (
      <div className="flex flex-col gap-6 anim-fade-in select-none pb-12">
        <header className="text-left">
          <span className="text-[10px] font-black text-primary tracking-[3px] uppercase block mb-1">
            PLANNER SETUP
          </span>
          <h1 className="text-2xl font-black italic uppercase text-white leading-none mb-1">
            NEURAL CALIBRATION
          </h1>
          <p className="text-xs text-white/50 font-semibold leading-relaxed">
            Sync your session timing with your biological performance peak.
          </p>
        </header>

        <main className="flex flex-col gap-6 mt-2">
          {/* Productivity Peak Select */}
          <div className="flex flex-col gap-3">
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">
              PRODUCTIVITY PEAK
            </label>
            <div className="grid grid-cols-2 gap-3.5">
              {peakChoices.map((choice) => {
                const Icon = choice.icon;
                const active = peakWindow === choice.key;
                return (
                  <div
                    key={choice.key}
                    onClick={() => setPeakWindow(choice.key)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-3xl border cursor-pointer transition-all duration-300 ${
                      active 
                        ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.15)]' 
                        : 'bg-black/30 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-white/40'}`} />
                    <span className={`text-[10px] font-black uppercase ${active ? 'text-primary' : 'text-white/60'}`}>
                      {choice.label}
                    </span>
                    <span className="text-[8px] text-white/30 font-semibold">
                      {choice.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session Time Picker */}
          <div className="flex flex-col gap-3">
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">
              PREFERRED SESSION START
            </label>
            <div className="glass-card flex items-center justify-between p-5 border-white/5 bg-black/40 rounded-3xl">
              <input 
                type="time" 
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="bg-transparent border-none text-2xl font-black text-white outline-none cursor-pointer w-full focus:ring-0"
              />
              <Clock className="w-5 h-5 text-primary opacity-50" />
            </div>
          </div>

          {/* Notification Opt-In */}
          <div className="flex flex-col gap-3">
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">
              DAILY REMINDER ALARM
            </label>
            <div 
              onClick={handleToggleNotifications}
              className={`glass-card flex items-center justify-between p-5 rounded-3xl border cursor-pointer transition-all duration-300 ${
                notificationsEnabled
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-white/5 bg-black/40 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  notificationsEnabled ? 'bg-primary/15 text-primary' : 'bg-white/5 text-white/40'
                }`}>
                  {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div>
                  <span className="text-xs font-black text-white uppercase block">
                    {notificationsEnabled ? 'ALARM ACTIVE' : 'ENABLE ALARM'}
                  </span>
                  <span className="text-[9px] text-white/40 font-semibold">
                    {notificationsEnabled 
                      ? `Fires daily at ${preferredTime}` 
                      : 'Get browser alerts at your session time'}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${
                notificationsEnabled ? 'bg-primary' : 'bg-white/10'
              }`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-all duration-300 ${
                  notificationsEnabled 
                    ? 'right-0.5 bg-black' 
                    : 'left-0.5 bg-white/40'
                }`} />
              </div>
            </div>
            {notificationStatus === 'denied' && (
              <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider px-1">
                ⚠ Browser blocked notifications. Enable in browser settings.
              </p>
            )}
          </div>
        </main>

        <footer className="mt-8 flex flex-col gap-4">
          <NeonButton onClick={handleDeployPlanner} className="w-full h-14">
            DEPLOY PLANNER
          </NeonButton>
          
          {isConfigured && (
            <button 
              onClick={() => setIsConfiguring(false)} 
              className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-2"
            >
              CANCEL
            </button>
          )}
        </footer>
      </div>
    );
  }

  // WEEKLY PLANNER GRID VIEW
  return (
    <div className="flex flex-col gap-6 anim-fade-in select-none pb-16">
      {/* Top HUD Telemetry Display */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80">MODULE: TACTICAL PLANNER</span>
        <span className="opacity-40 uppercase">PEAK_WINDOW_{plan?.planner_schedule?.peak_window || 'MORNING'}</span>
      </div>

      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <span className="text-[9px] font-black text-primary tracking-[3px] uppercase block mb-1">
            WEEKLY ROADMAP
          </span>
          <h1 className="text-xl font-black italic uppercase text-white leading-none">
            TACTICAL PROTOCOL
          </h1>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wide block mt-1.5">
            {plan!.week_range}
          </span>
        </div>
        
        <div className="flex gap-2">
          {/* Notification toggle button */}
          <button 
            onClick={handleToggleNotifications}
            title={notificationsEnabled ? 'Disable Reminder' : 'Enable Reminder'}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
              notificationsEnabled 
                ? 'border-primary/30 bg-primary/10 text-primary' 
                : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button 
            onClick={handleRegenerate}
            title="Regenerate Plan"
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsConfiguring(true)}
            title="Configure Calibration"
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Calendar 7-Day Strip */}
      <div className="calendar-strip flex justify-between gap-1 p-2 bg-black/40 border border-white/5 rounded-[32px] overflow-x-auto">
        {plan!.days.map((day: any, i: number) => {
          const active = activeDayIdx === i;
          return (
            <div
              key={i}
              onClick={() => setActiveDayIdx(i)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-full cursor-pointer transition-all duration-300 min-w-[42px] ${
                active 
                  ? 'bg-primary text-black shadow-[0_0_15px_rgba(226,255,59,0.4)] scale-105' 
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              <span className={`text-[8px] font-black uppercase ${active ? 'text-black' : 'text-white/40'}`}>
                {day.day_name}
              </span>
              <span className={`text-sm font-black leading-none ${active ? 'text-black' : 'text-white'}`}>
                {day.date}
              </span>
              <span className={`text-[6px] font-black uppercase max-w-full truncate ${active ? 'text-black/80' : 'text-white/20'}`}>
                {day.day_type.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Day Protocol Listing */}
      {activeDay && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-black text-white/40 tracking-[3px] uppercase">
              ACTIVE PROTOCOLS
            </span>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              {activeDay.day_type}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {activeDay.protocol.map((block: any, pIdx: number) => {
              const completed = isProtocolBlockCompleted(activeDayIdx, pIdx);
              return (
                <div 
                  key={pIdx}
                  className={`flex items-center justify-between p-5 rounded-3xl border bg-black/30 border-white/5 transition-all hover:border-white/10 ${
                    completed ? 'opacity-55' : ''
                  }`}
                >
                  <div className="flex flex-col gap-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black text-white/40 tracking-wider uppercase">
                        {block.time}
                      </span>
                      <span className="text-white/10">•</span>
                      <span className="text-[8px] font-black text-primary tracking-widest uppercase bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                        {block.duration}
                      </span>
                    </div>

                    <h4 className="text-sm font-black uppercase text-white truncate">
                      {block.title.replace(`${activeDay.day_type}: `, '')}
                    </h4>

                    {/* Exercise items list preview */}
                    <p className="text-[10px] text-white/40 font-semibold line-clamp-1">
                      {block.exercises.join('  •  ')}
                    </p>
                  </div>

                  <button
                    onClick={() => router.push(`/training/session?index=0&source=protocol&day=${activeDayIdx}&p=${pIdx}`)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      completed 
                        ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                        : 'bg-primary text-black hover:scale-105 shadow-[0_0_15px_rgba(226,255,59,0.25)]'
                    }`}
                  >
                    {completed ? <Check className="w-5 h-5 stroke-[3]" /> : <Play className="w-5 h-5 fill-black stroke-none ml-0.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Recovery active block */}
          <div className="recovery-pillar flex items-center justify-between p-5 rounded-3xl border border-dashed border-white/10 bg-black/10 mt-2">
            <div className="flex flex-col gap-1 select-text">
              <span className="text-[8px] font-black text-white/40 tracking-[2px] uppercase">
                RECOVERY PROTOCOL
              </span>
              <p className="text-xs text-white/60 font-bold italic">
                {activeDay.recovery}
              </p>
            </div>
            <Activity className="w-5 h-5 text-white/20" />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* LOCAL BODYWEIGHT SPLIT + BOXING CONDITIONING     */}
      {/* ──────────────────────────────────────────────── */}
      {localSchedule.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          {/* Section Divider */}
          <div className="flex items-center gap-3 select-none">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <span className="text-[9px] font-black tracking-[4px] text-white/30 uppercase">BODYWEIGHT SPLIT</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>

          {/* Stats Banner */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl py-3 text-center">
              <div className="text-sm font-black text-white leading-none mb-1">
                {localSchedule.length}
              </div>
              <span className="text-[7px] font-black text-white/30 uppercase tracking-wider block">
                Split Days
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl py-3 text-center">
              <div className="text-sm font-black text-primary leading-none mb-1">
                {totalLocalExercises}
              </div>
              <span className="text-[7px] font-black text-white/30 uppercase tracking-wider block">
                Exercises
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl py-3 text-center">
              <div className="text-sm font-black text-white leading-none mb-1">
                {userExperience.toUpperCase().slice(0, 3)}
              </div>
              <span className="text-[7px] font-black text-white/30 uppercase tracking-wider block">
                Level
              </span>
            </div>
          </div>

          {/* Local Day Cards */}
          <div className="flex flex-col gap-3">
            {localSchedule.map((day: LocalDayPlan, dIdx: number) => {
              const isExpanded = expandedLocalDay === dIdx;
              const boxingExercises = day.exercises.filter(ex => ex.name.startsWith('🥊'));
              const calisthenicsExercises = day.exercises.filter(ex => !ex.name.startsWith('🥊'));
              
              return (
                <div 
                  key={dIdx} 
                  className="rounded-3xl border border-white/5 bg-black/30 overflow-hidden transition-all hover:border-white/10"
                >
                  {/* Day Header (Clickable) */}
                  <button
                    onClick={() => setExpandedLocalDay(isExpanded ? null : dIdx)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black uppercase text-white truncate">
                          {day.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] font-black text-purple-400 tracking-widest uppercase bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                            {day.duration}
                          </span>
                          <span className="text-[8px] text-white/30 font-bold">
                            {day.exercises.length} exercises
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-white/30 ml-2">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Exercise List */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 flex flex-col gap-2">
                          {/* Calisthenics Block */}
                          {calisthenicsExercises.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[7px] font-black text-white/25 tracking-[2px] uppercase flex items-center gap-1.5">
                                <Dumbbell className="w-3 h-3" /> STRENGTH FOUNDATION
                              </span>
                              {calisthenicsExercises.map((ex: LocalExercise, eIdx: number) => (
                                <div key={eIdx} className="flex items-center justify-between bg-white/[0.015] p-3 rounded-2xl border border-white/[0.04]">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-bold text-white/80 block truncate">
                                      {ex.name}
                                    </span>
                                    <span className="text-[8px] text-white/30 uppercase tracking-wider font-medium">
                                      🎯 {ex.target}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono text-primary/70 italic ml-2 flex-shrink-0">
                                    {ex.prescription}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Boxing Conditioning Block */}
                          {boxingExercises.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-2">
                              <span className="text-[7px] font-black text-red-500/50 tracking-[2px] uppercase flex items-center gap-1.5">
                                <Swords className="w-3 h-3" /> COMBAT CONDITIONING
                              </span>
                              {boxingExercises.map((ex: LocalExercise, eIdx: number) => (
                                <div key={eIdx} className="flex items-center justify-between bg-red-500/[0.02] p-3 rounded-2xl border border-red-500/[0.06]">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-bold text-white/80 block truncate">
                                      {ex.name}
                                    </span>
                                    <span className="text-[8px] text-red-400/40 uppercase tracking-wider font-medium">
                                      🎯 {ex.target}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono text-red-400/60 italic ml-2 flex-shrink-0">
                                    {ex.prescription}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Intensity bar chart */}
      <GlassCard className="p-5 border-white/5 bg-black/40 relative">
        <div className="flex justify-between items-center mb-5">
          <span className="text-[9px] font-black text-white/40 tracking-[3px] uppercase">
            INTENSITY DISTRIBUTION
          </span>
          <span className="text-sm font-black text-primary italic leading-none">
            {plan!.intensity_score}% AVG
          </span>
        </div>

        <div className="flex items-end justify-between h-20 gap-2 px-2">
          {plan!.days.map((day, i) => {
            const active = activeDayIdx === i;
            return (
              <div 
                key={i}
                onClick={() => setActiveDayIdx(i)}
                className={`flex-1 rounded-t-lg transition-all duration-500 cursor-pointer ${
                  active 
                    ? 'bg-primary shadow-[0_0_15px_rgba(226,255,59,0.4)]' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                style={{ height: `${day.intensity}%` }}
                title={`${day.day_name}: ${day.intensity}%`}
              />
            );
          })}
        </div>
      </GlassCard>

      {/* Notification Status Footer Badge */}
      {notificationsEnabled && (
        <div className="flex items-center justify-center gap-2 py-2 select-none">
          <Bell className="w-3 h-3 text-primary/50" />
          <span className="text-[8px] font-black text-white/25 tracking-[2px] uppercase">
            DAILY ALARM SET FOR {preferredTime}
          </span>
        </div>
      )}
    </div>
  );
}
