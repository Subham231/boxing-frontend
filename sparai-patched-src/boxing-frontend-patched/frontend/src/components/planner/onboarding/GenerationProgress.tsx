'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

const CHECKLIST = [
  'Fighter Profile',
  'Training Goals',
  'Weekly Schedule',
  'Exercise Selection',
  'Recovery Planning',
  'Progressive Overload',
  'Daily Grind Integration',
  'Performance Analytics',
  'Final Optimization',
];

const INSIGHTS = [
  'Matching workouts to your goals...',
  'Selecting exercises for your experience...',
  'Optimizing training intensity...',
  'Preventing overtraining...',
  'Scheduling recovery sessions...',
  'Balancing weekly workload...',
  'Building progressive difficulty...',
  'Preparing Daily Grind...',
  'Finalizing Tactical Protocol...',
];

const PROGRESS_STEPS = [0, 12, 28, 47, 63, 81, 100];

interface GenerationProgressProps {
  // Resolves once the real generation call finishes; the visual sequence
  // waits for BOTH this to resolve and its own minimum runtime, so the
  // ceremony never feels instant even on a fast connection, and never
  // fakes completion if generation is still in flight.
  ready: boolean;
  onFinished: () => void;
}

export default function GenerationProgress({ ready, onFinished }: GenerationProgressProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [insightIdx, setInsightIdx] = useState(0);
  const [percent, setPercent] = useState(0);
  const [visualDone, setVisualDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let i = 0;
    const advance = () => {
      if (cancelled) return;
      i += 1;
      setPercent(PROGRESS_STEPS[Math.min(i, PROGRESS_STEPS.length - 1)]);
      setStepIdx(Math.min(Math.round((i / (PROGRESS_STEPS.length - 1)) * (CHECKLIST.length - 1)), CHECKLIST.length - 1));
      if (i < PROGRESS_STEPS.length - 1) {
        setTimeout(advance, 420 + Math.random() * 260);
      } else {
        setVisualDone(true);
      }
    };
    setTimeout(advance, 300);

    const insightTimer = setInterval(() => {
      setInsightIdx((v) => (v + 1) % INSIGHTS.length);
    }, 900);

    return () => {
      cancelled = true;
      clearInterval(insightTimer);
    };
  }, []);

  useEffect(() => {
    if (visualDone && ready) {
      const t = setTimeout(onFinished, 500);
      return () => clearTimeout(t);
    }
  }, [visualDone, ready, onFinished]);

  return (
    <div className="flex flex-col min-h-[85vh] justify-center gap-8 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-black italic uppercase text-white leading-tight">Creating Your Tactical Protocol</h1>
        <p className="text-white/40 text-[11px] font-bold mt-2 uppercase tracking-wide">
          {visualDone && !ready ? 'Almost there...' : INSIGHTS[insightIdx]}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl font-black text-primary tabular-nums">{Math.round(percent)}%</span>
        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${percent}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {CHECKLIST.map((item, i) => {
          const complete = i < stepIdx || (i === stepIdx && percent >= 100);
          const active = i === stepIdx && !complete;
          return (
            <div key={item} className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                  complete ? 'bg-primary border-primary' : active ? 'border-primary' : 'border-white/10'
                }`}
              >
                {complete ? (
                  <Check className="w-3 h-3 text-black" />
                ) : active ? (
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                ) : null}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wide ${complete ? 'text-white' : active ? 'text-primary' : 'text-white/25'}`}>
                {item}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
