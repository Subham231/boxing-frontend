'use client';

import React from 'react';
import { ChevronRight, TrendingUp } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { SampleTag, AnimatedBars, SparkLine } from './OnboardingCharts';

const FutureProgress: React.FC = () => {
  const { nextStep, prevStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-[85vh] justify-between py-2">
      <header className="text-left mb-6">
        <StepBadge />
        <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Imagine seeing your <br /> <span className="text-primary">progress</span> like this.
        </h1>
        <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
          Watch your consistency and performance improve over time through clear, easy-to-understand analytics.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4">
        <div className="glass-card p-5 rounded-3xl border-white/5 bg-black/40 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black text-white uppercase tracking-wide">Punch Volume Trend</span>
            </div>
            <SampleTag />
          </div>
          <SparkLine points={[120, 180, 160, 240, 280, 260, 340, 410]} />
        </div>

        <div className="glass-card p-5 rounded-3xl border-white/5 bg-black/40 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-white uppercase tracking-wide">Weekly Training Consistency</span>
            <SampleTag />
          </div>
          <AnimatedBars values={[2, 3, 3, 4, 4, 5, 6]} labels={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 rounded-3xl border-white/5 bg-black/40">
            <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">Completion Rate</span>
            <span className="text-2xl font-black text-primary">92%</span>
          </div>
          <div className="glass-card p-4 rounded-3xl border-white/5 bg-black/40">
            <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">Reaction Speed</span>
            <span className="text-2xl font-black text-primary">+18%</span>
          </div>
        </div>
      </main>

      <footer className="mt-8 flex flex-col gap-4">
        <button onClick={nextStep} className="btn-primary w-full h-16 flex items-center justify-center gap-2">
          CONTINUE <ChevronRight size={20} />
        </button>
        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
};

export default FutureProgress;
