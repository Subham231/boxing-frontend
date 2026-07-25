'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NeonButton } from '@/components/ui/NeonButton';

export interface TourStep {
  title: string;
  desc: string;
  selector: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SpotlightTourProps {
  steps: TourStep[];
  onDone: () => void;
  storageKey: string;
}

const PADDING = 10;

export default function SpotlightTour({ steps, onDone, storageKey }: SpotlightTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector(steps[step]?.selector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    });
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [step, steps]);

  useEffect(() => {
    // Small delay so scroll from a previous step settles before measuring
    const t = setTimeout(measure, 80);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const finish = () => {
    localStorage.setItem(storageKey, '1');
    onDone();
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  if (!steps.length) return null;

  // Decide whether the tooltip sits above or below the spotlighted element
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const spaceBelow = rect ? viewportH - (rect.top + rect.height) : 0;
  const tooltipBelow = rect ? spaceBelow > 220 : true;

  return (
    <motion.div
      className="fixed inset-0 z-[999999] pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Full-screen dark layer with a real animated cutout via box-shadow spread */}
      <motion.div
        className="absolute rounded-3xl pointer-events-auto"
        style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)' }}
        animate={
          rect
            ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height, opacity: 1 }
            : { top: viewportH / 2, left: '50%', width: 0, height: 0, opacity: 0 }
        }
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        onClick={finish}
      />

      {/* Glowing ring around the cutout */}
      {rect && (
        <motion.div
          className="absolute rounded-3xl border-2 border-primary pointer-events-none shadow-[0_0_25px_rgba(226,255,59,0.5)]"
          animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: tooltipBelow ? -12 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: tooltipBelow ? -12 : 12 }}
          transition={{ duration: 0.25 }}
          className="fixed left-4 right-4 max-w-sm mx-auto bg-black/95 border border-primary/30 rounded-3xl p-5 shadow-2xl pointer-events-auto z-10 flex flex-col gap-4"
          style={
            rect
              ? tooltipBelow
                ? { top: rect.top + rect.height + 16 }
                : { top: Math.max(rect.top - 190, 16) }
              : { top: '50%', transform: 'translateY(-50%)' }
          }
        >
          <div className="flex justify-between items-center">
            <button
              onClick={finish}
              className="text-[9px] font-black text-white/40 hover:text-white uppercase tracking-widest"
            >
              SKIP
            </button>
            <div className="text-[9px] font-black text-primary tracking-widest uppercase">
              STEP {step + 1} OF {steps.length}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-black uppercase italic text-white leading-none mb-1">
              {steps[step].title}
            </h4>
            <p className="text-xs text-white/60 leading-relaxed font-semibold">{steps[step].desc}</p>
          </div>

          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'bg-primary w-4' : 'bg-white/10 w-1.5'
                  }`}
                />
              ))}
            </div>

            <NeonButton onClick={next} className="px-5 py-2 h-9 text-xs">
              {step === steps.length - 1 ? "LET'S GO 🥊" : 'NEXT'}
            </NeonButton>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
