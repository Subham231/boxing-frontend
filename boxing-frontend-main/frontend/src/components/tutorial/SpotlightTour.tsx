'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
// Estimated tooltip card height, used to keep it (and its Next button)
// fully on-screen and above the fixed bottom nav.
const TOOLTIP_HEIGHT_ESTIMATE = 230;
const BOTTOM_NAV_CLEARANCE = 110;
const TOP_CLEARANCE = 16;

export default function SpotlightTour({ steps, onDone, storageKey }: SpotlightTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const measureAttemptRef = useRef(0);

  const measureOnce = useCallback((): boolean => {
    const el = document.querySelector(steps[step]?.selector);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    });
    return true;
  }, [step, steps]);

  useEffect(() => {
    measureAttemptRef.current = 0;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const el = document.querySelector(steps[step]?.selector);
    if (el) {
      // Instant (not smooth) scroll — a smooth scrollIntoView animation
      // running at the same time as the spotlight's own spring animation
      // is what was causing the lag: two animations fighting over the
      // same frames every single step. One animation (the spotlight
      // easing to its new spot) is enough, and it reads as smoother, not
      // less smooth.
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
      // Measure AFTER the scroll has actually moved the page — measuring
      // before (like the previous version did) captures the element's
      // pre-scroll position, which is exactly why the highlight would
      // land in the wrong place.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) measureOnce();
        });
      });
    } else {
      // Element not mounted yet (e.g. still loading) — retry a few times
      // with backoff instead of silently giving up and showing no
      // highlight at all.
      const tryMeasure = () => {
        if (cancelled) return;
        const found = measureOnce();
        if (!found && measureAttemptRef.current < 8) {
          measureAttemptRef.current += 1;
          retryTimer = setTimeout(tryMeasure, 150);
        } else if (!found) {
          setRect(null);
        }
      };
      tryMeasure();
    }

    const onResize = () => measureOnce();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [step, steps, measureOnce]);

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

  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const maxTop = Math.max(TOP_CLEARANCE, viewportH - BOTTOM_NAV_CLEARANCE - TOOLTIP_HEIGHT_ESTIMATE);
  const spaceBelow = rect ? viewportH - (rect.top + rect.height) : 0;
  const tooltipBelow = rect ? spaceBelow > TOOLTIP_HEIGHT_ESTIMATE : true;

  // Always clamp within [TOP_CLEARANCE, maxTop] so the card — and
  // crucially its Next button — can never end up pushed off-screen or
  // behind the bottom nav, regardless of where the highlighted element
  // sits on the page.
  const tooltipTop = rect
    ? tooltipBelow
      ? Math.min(rect.top + rect.height + 16, maxTop)
      : Math.max(Math.min(rect.top - TOOLTIP_HEIGHT_ESTIMATE - 16, maxTop), TOP_CLEARANCE)
    : null;

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
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        onClick={finish}
      />

      {/* Glowing ring around the cutout */}
      {rect && (
        <motion.div
          className="absolute rounded-3xl border-2 border-primary pointer-events-none shadow-[0_0_25px_rgba(226,255,59,0.5)]"
          animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: tooltipBelow ? -12 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: tooltipBelow ? -12 : 12 }}
          transition={{ duration: 0.2 }}
          className="fixed left-4 right-4 max-w-sm mx-auto bg-black/95 border border-primary/30 rounded-3xl p-5 shadow-2xl pointer-events-auto z-10 flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
          style={{ top: tooltipTop ?? '50%', transform: tooltipTop === null ? 'translateY(-50%)' : undefined }}
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

            <NeonButton onClick={next} className="px-5 py-2 h-9 text-xs shrink-0">
              {step === steps.length - 1 ? "LET'S GO 🥊" : 'NEXT'}
            </NeonButton>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
