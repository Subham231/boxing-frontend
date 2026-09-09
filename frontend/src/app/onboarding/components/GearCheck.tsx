'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const EQUIPMENT_LIST = [
  { id: 'Nothing', label: 'Nothing (Bodyweight / Shadowboxing)', tag: 'Zero Gear' },
  { id: 'Gloves', label: 'Gloves', tag: 'Standard' },
  { id: 'Heavy bag', label: 'Heavy bag', tag: 'Power Drills' },
  { id: 'Jump rope', label: 'Jump rope', tag: 'Cardio Engine' },
  { id: 'Dumbbells', label: 'Dumbbells', tag: 'Shoulder Burn' },
  { id: 'Full gym', label: 'Full gym', tag: 'Complete Arsenal' },
];

const GearCheck: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(
    data.constraints?.equipment && data.constraints.equipment.length > 0
      ? data.constraints.equipment
      : ['Gloves']
  );

  const toggleEquipment = (id: string) => {
    let next: string[];
    if (id === 'Nothing') {
      next = ['Nothing'];
    } else {
      const withoutNothing = selected.filter((item) => item !== 'Nothing');
      if (withoutNothing.includes(id)) {
        next = withoutNothing.filter((item) => item !== id);
      } else {
        next = [...withoutNothing, id];
      }
      if (next.length === 0) {
        next = ['Nothing'];
      }
    }
    setSelected(next);
    updateData({
      constraints: { ...data.constraints, equipment: next },
    });
  };

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-4 sm:mb-6">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          What do you have <span className="text-primary">access to</span>?
        </h1>
        <p className="text-white/50 mt-2.5 sm:mt-4 text-xs sm:text-sm leading-relaxed font-semibold">
          Select all that apply. Your custom workouts will only prescribe drills you can execute.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-2 sm:gap-2.5 my-auto">
        {EQUIPMENT_LIST.map((item) => {
          const isActive = selected.includes(item.id);
          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleEquipment(item.id)}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border text-left transition-all duration-300 ${
                isActive
                  ? 'bg-primary/10 border-primary shadow-[0_0_18px_rgba(226,255,59,0.18)]'
                  : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-primary border-primary text-black'
                      : 'border-white/20 bg-white/5 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span
                  className={`text-xs sm:text-sm font-black uppercase ${
                    isActive ? 'text-primary' : 'text-white'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {item.tag && (
                <span
                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-primary text-black'
                      : 'bg-white/5 text-white/40 border border-white/5'
                  }`}
                >
                  {item.tag}
                </span>
              )}
            </motion.button>
          );
        })}
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        <button
          onClick={nextStep}
          disabled={selected.length === 0}
          className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2 disabled:opacity-40"
        >
          CONTINUE <ChevronRight size={20} />
        </button>
        <button
          onClick={prevStep}
          className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto"
        >
          Back
        </button>
      </footer>
    </div>
  );
};

export default GearCheck;