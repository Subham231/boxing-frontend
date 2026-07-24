'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Settings, Target } from 'lucide-react';
import { getDailyWorkout } from '@/lib/workout-data';
import { StreakManager } from '@/lib/streak-manager';
import { GlassCard } from '@/components/ui/GlassCard';

export default function TrainingPage() {
  const router = useRouter();
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [workout, setWorkout] = useState<any>(null);
  const [dayName, setDayName] = useState('TODAY');

  useEffect(() => {
    // Determine the day name
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const today = new Date();
    setDayName(days[today.getDay()]);

    // Fetch workout
    const dailyWorkout = getDailyWorkout();
    setWorkout(dailyWorkout);

    // Get progress from localStorage
    const progressKey = 'workout_progress_' + today.toDateString();
    try {
      const storedProgress = localStorage.getItem(progressKey);
      if (storedProgress) {
        const completed = JSON.parse(storedProgress).map(Number);
        setCompletedIndices(completed);

        // Update streak if session completed count > 0
        if (completed.length > 0) {
          StreakManager.completeSession();
          StreakManager.syncWithSupabase().catch(console.error);
        }
      }
    } catch (e) {
      console.error('Failed to load workout progress:', e);
    }
  }, []);

  const completionPercent = useMemo(() => {
    if (!workout || !workout.drills.length) return 0;
    return Math.round((completedIndices.length / workout.drills.length) * 100);
  }, [workout, completedIndices]);

  const handleDrillClick = (index: number) => {
    router.push(`/training/session?index=${index}`);
  };

  if (!workout) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-10 text-white/40">
        Loading Grind...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 anim-fade-in">
      {/* Header telemetry display */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80 uppercase">MODULE: GRIND ENGINE</span>
        <span className="opacity-40 uppercase">READY_TO_SWEAT</span>
      </div>

      {/* Page Header */}
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] overflow-hidden bg-black/40">
            <img 
              src="https://i.pravatar.cc/150?u=viktor" 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">
              {dayName}
            </div>
            <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
              DAILY GRIND
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

      {/* Session Progress Tracker */}
      <GlassCard className="p-5 border-white/5 bg-black/40">
        <div className="flex justify-between items-end mb-3">
          <span className="text-[10px] font-black text-white/55 tracking-wider uppercase">
            SESSION PROGRESS
          </span>
          <span className="text-xl font-black text-primary italic leading-none">
            {completionPercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary shadow-[0_0_10px_rgba(226,255,59,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </GlassCard>

      {/* Drills Section Header */}
      <div className="flex justify-between items-center select-none">
        <span className="text-[9px] font-black tracking-[3px] text-white/30 uppercase">
          THE DRILL DOWN
        </span>
        <span className="text-[10px] font-black text-primary tracking-widest uppercase">
          {completedIndices.length} / {workout.drills.length} COMPLETED
        </span>
      </div>

      {/* Drill Cards */}
      <div className="flex flex-col gap-3.5">
        {workout.drills.length > 0 ? (
          workout.drills.map((drill: any, index: number) => {
            const isComplete = completedIndices.includes(index);
            return (
              <div 
                key={index}
                onClick={() => handleDrillClick(index)}
                className={`group flex items-center justify-between p-5 rounded-3xl border cursor-pointer transition-all duration-300 ${
                  drill.isPlanner 
                    ? 'bg-gradient-to-br from-primary/10 to-black/60 border-primary/30 shadow-[0_0_20px_rgba(226,255,59,0.15)] relative overflow-hidden'
                    : isComplete 
                      ? 'bg-white/[0.01] border-white/5 opacity-60' 
                      : 'bg-black/40 border-white/5 hover:border-white/15'
                }`}
              >
                {/* Special Tag for Planner drills */}
                {drill.isPlanner && (
                  <div className="absolute top-0 right-0 bg-primary text-black font-black text-[7px] tracking-wider px-3.5 py-0.5 rounded-bl uppercase">
                    Strategic
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {isComplete ? (
                    <div className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_0_8px_rgba(226,255,59,0.4)]">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-primary flex items-center justify-center relative">
                      {/* Pulse effect */}
                      <span className="absolute w-2 h-2 rounded-full bg-primary animate-ping" />
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-white">
                      {drill.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-primary">
                      <span>{drill.reps || `${drill.duration}s`}</span>
                      <span className="text-white/20">•</span>
                      <span className={isComplete ? 'text-white/30' : 'text-red-500 font-extrabold animate-pulse'}>
                        {isComplete ? 'DONE' : 'READY'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/40 group-hover:text-white transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-white/30 font-bold uppercase tracking-wider text-xs">
            Rest Day Protocol Active. enjoy recovery.
          </div>
        )}
      </div>
    </div>
  );
}
