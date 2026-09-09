'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sun, Sunrise, Sunset, Moon, Clock } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const TIME_SLOTS = [
  { id: 'Morning', label: 'Morning', icon: Sunrise, emoji: '🌅' },
  { id: 'Afternoon', label: 'Afternoon', icon: Sun, emoji: '☀️' },
  { id: 'Evening', label: 'Evening', icon: Sunset, emoji: '🌙' },
  { id: 'Late night', label: 'Late night', icon: Moon, emoji: '🌃' },
];

const DURATION_OPTIONS = [
  { mins: 10, label: '10 min', tag: 'Micro Blitz' },
  { mins: 20, label: '20 min', tag: 'Core Routine' },
  { mins: 30, label: '30 min', tag: 'Fighter Standard' },
  { mins: 45, label: '45+ min', tag: 'Deep Camp' },
];

const SchedulePreference: React.FC = () => {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selectedSlot, setSelectedSlot] = useState<string>(data.trigger || 'Morning');
  const [selectedDuration, setSelectedDuration] = useState<number>(data.available_time || 20);

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    updateData({ trigger: slot });
  };

  const handleDurationSelect = (mins: number) => {
    setSelectedDuration(mins);
    updateData({ available_time: mins });
  };

  return (
    <div className="flex flex-col min-h-full justify-between py-2 pb-20 sm:pb-24">
      <header className="text-left mb-3 sm:mb-5">
        <StepBadge />
        <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          When do you <span className="text-primary">fight for yourself</span>?
        </h1>
        <p className="text-white/50 mt-2 text-xs sm:text-sm font-semibold">
          Lock in your training window and realistic session commitment.
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 sm:gap-5 my-auto">
        {/* Slot Selection */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-[2px] text-white/50 block mb-2">
            Preferred training time
          </span>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {TIME_SLOTS.map((slot) => {
              const active = selectedSlot === slot.id;
              return (
                <motion.button
                  key={slot.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSlotSelect(slot.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                    active
                      ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.2)]'
                      : 'bg-black/30 border-white/5 hover:border-white/10'
                  }`}
                >
                  <span className="text-xl">{slot.emoji}</span>
                  <span
                    className={`text-xs font-black uppercase ${
                      active ? 'text-primary' : 'text-white'
                    }`}
                  >
                    {slot.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Duration Selection */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-[2px] text-white/50 block mb-2">
            How much time can you realistically give?
          </span>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {DURATION_OPTIONS.map((opt) => {
              const active = selectedDuration === opt.mins;
              return (
                <motion.button
                  key={opt.mins}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDurationSelect(opt.mins)}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                    active
                      ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.2)]'
                      : 'bg-black/30 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div>
                    <span
                      className={`text-sm font-black uppercase block leading-tight ${
                        active ? 'text-primary' : 'text-white'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-white/40 font-medium">
                      {opt.tag}
                    </span>
                  </div>
                  <Clock
                    className={`w-4 h-4 ${
                      active ? 'text-primary' : 'text-white/20'
                    }`}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4">
        <button
          onClick={nextStep}
          className="btn-primary w-full h-14 sm:h-16 flex items-center justify-center gap-2"
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

export default SchedulePreference;
