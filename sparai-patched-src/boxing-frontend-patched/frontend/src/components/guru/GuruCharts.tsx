'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { TechniqueMetrics } from '@/lib/techniques-data';

const METRIC_LABELS: { key: keyof TechniqueMetrics; label: string }[] = [
  { key: 'offense', label: 'Offensive Effectiveness' },
  { key: 'defense', label: 'Defensive Value' },
  { key: 'difficulty', label: 'Difficulty Level' },
  { key: 'energy', label: 'Energy Requirement' },
  { key: 'learningCurve', label: 'Learning Curve' },
  { key: 'fightApplicability', label: 'Fight Applicability' },
  { key: 'counterPotential', label: 'Counter Potential' },
  { key: 'versatility', label: 'Versatility' },
  { key: 'speedRequirement', label: 'Speed Requirement' },
  { key: 'timingPrecision', label: 'Timing Precision' },
];

export function MetricsGrid({ metrics }: { metrics: TechniqueMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {METRIC_LABELS.map(({ key, label }, i) => {
        const value = metrics[key];
        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-white/50 uppercase tracking-wide">{label}</span>
              <span className="text-[10px] font-black text-primary">{value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full shadow-[0_0_6px_rgba(226,255,59,0.3)]"
                initial={{ width: 0 }}
                whileInView={{ width: `${value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.04, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
