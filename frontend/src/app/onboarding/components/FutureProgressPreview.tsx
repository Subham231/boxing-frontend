'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { SampleTag, SparkLine, AnimatedCounter } from './OnboardingCharts';

const FutureProgressPreview: React.FC = () => {
  const { nextStep, prevStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          This could be you <br /> in <span className="text-primary">90 days</span>.
        </h1>
        <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
          Here&apos;s an example of what consistent training progress may look like.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-3 sm:gap-4 my-auto">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-white/50 uppercase tracking-wide">90-Day Trajectory</span>
          <SampleTag label="ILLUSTRATIVE EXAMPLE" />
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-3xl border-white/5 bg-black/40 flex flex-col gap-2.5 sm:gap-3">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-wide">Punch Volume Trend</span>
          <SparkLine points={[80, 140, 130, 210, 260, 300, 340, 420, 510]} />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div className="glass-card p-3.5 sm:p-4 rounded-3xl border-white/5 bg-black/40">
            <AnimatedCounter value={62} label="Training Streak (Days)" />
          </div>
          <div className="glass-card p-3.5 sm:p-4 rounded-3xl border-white/5 bg-black/40">
            <AnimatedCounter value={90} label="Sessions Completed" />
          </div>
          <div className="glass-card p-3.5 sm:p-4 rounded-3xl border-white/5 bg-black/40">
            <AnimatedCounter value={38} suffix="%" label="Improvement Score" />
          </div>
          <div className="glass-card p-3.5 sm:p-4 rounded-3xl border-white/5 bg-black/40">
            <AnimatedCounter value={94} suffix="%" label="Weekly Consistency" />
          </div>
        </div>
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-2">
        <p className="text-center text-[11px] font-bold italic text-white/50 mb-1">
          Progress isn&apos;t built in a day. It&apos;s built every day.
        </p>
        <button onClick={nextStep} className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2">
          CONTINUE <ChevronRight size={20} />
        </button>
        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
};

export default FutureProgressPreview;
