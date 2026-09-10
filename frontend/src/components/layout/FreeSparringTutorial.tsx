'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Sparkles } from 'lucide-react';

export const TUTORIAL_STORAGE_KEY = 'sparai_free_sparring_tutorial_completed';

interface FreeSparringTutorialProps {
  menuOpen: boolean;
  onDismiss?: () => void;
}

export function FreeSparringTutorial({ menuOpen, onDismiss }: FreeSparringTutorialProps) {
  const [tutorialStep, setTutorialStep] = useState<'idle' | 'explore' | 'sparring' | 'completed'>('idle');
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const forceTutorial = urlParams.get('tutorial') === 'true';
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';

    if (forceTutorial || !completed) {
      const timer = setTimeout(() => {
        setTutorialStep(menuOpen ? 'sparring' : 'explore');
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setTutorialStep('completed');
    }
  }, []);

  // Handle menu open & close behavior
  useEffect(() => {
    if (tutorialStep === 'completed' || tutorialStep === 'idle') return;

    if (menuOpen) {
      setHasOpenedOnce(true);
      setTutorialStep('sparring');
    } else if (hasOpenedOnce) {
      // User closed the explore menu after opening it -> turn off tutorial completely per requirement
      dismiss();
    } else {
      setTutorialStep('explore');
    }
  }, [menuOpen, hasOpenedOnce]);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    }
    setTutorialStep('completed');
    if (onDismiss) onDismiss();
  };

  if (tutorialStep === 'completed' || tutorialStep === 'idle') {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000] overflow-visible">
      <AnimatePresence mode="wait">
        {/* STEP 1: Pointing to Explore Button */}
        {tutorialStep === 'explore' && !menuOpen && (
          <motion.div
            key="tutorial-explore"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full flex flex-col items-center pointer-events-none px-4"
          >
            {/* Responsively bounded callout card */}
            <div className="w-[min(92vw,310px)] pointer-events-auto mb-3 flex items-center justify-between gap-2 px-3.5 py-2 rounded-full bg-[#0a1205]/95 border border-[#E2FF3B]/60 shadow-[0_0_25px_rgba(226,255,59,0.35)] backdrop-blur-xl">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E2FF3B] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E2FF3B]" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wide text-[#E2FF3B] truncate">
                  Tap Explore for Free Sparring
                </span>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Skip Tutorial"
                className="shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-black text-white/90 uppercase tracking-wider transition-colors cursor-pointer"
              >
                <span>Skip</span>
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Glowing Tactical Pointer (Animated Chevrons pointing down to Explore) */}
            <div className="relative flex flex-col items-center">
              <motion.div
                animate={{
                  y: [0, 8, 0],
                }}
                transition={{
                  duration: 0.85,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="flex flex-col items-center -space-y-2.5 filter drop-shadow-[0_0_10px_rgba(226,255,59,0.9)]"
              >
                <ChevronDown className="w-6 h-6 text-[#E2FF3B]/60" />
                <ChevronDown className="w-7 h-7 text-[#E2FF3B]" />
              </motion.div>

              {/* Pulsing Touch Ring over Explore Button */}
              <motion.div
                animate={{
                  scale: [0.8, 1.35, 0.8],
                  opacity: [0.5, 0.95, 0.5],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -bottom-7 w-14 h-14 rounded-full border-2 border-[#E2FF3B] shadow-[0_0_20px_#E2FF3B] pointer-events-none"
              />
            </div>
          </motion.div>
        )}

        {/* STEP 2: Pointing to Sparring Button (Inside Combat Protocols Tray) */}
        {tutorialStep === 'sparring' && menuOpen && (
          <motion.div
            key="tutorial-sparring"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(94vw,348px)] flex flex-col items-center pointer-events-none"
          >
            {/* Responsively bounded callout card above tray */}
            <div className="w-[min(92vw,310px)] pointer-events-auto absolute -top-12 z-30 flex items-center justify-between gap-2 px-3.5 py-2 rounded-full bg-[#180e05]/95 border border-orange-500/70 shadow-[0_0_25px_rgba(249,115,22,0.45)] backdrop-blur-xl">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wide text-amber-300 truncate">
                  Select Sparring — 100% Free!
                </span>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Skip Tutorial"
                className="shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-black text-white/90 uppercase tracking-wider transition-colors cursor-pointer"
              >
                <span>Skip</span>
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Glowing Tactical Pointer pointing down directly onto SPARRING card (Right column) */}
            <div className="absolute top-[80px] right-[24px] flex flex-col items-center pointer-events-none z-30">
              <motion.div
                animate={{
                  y: [0, 8, 0],
                }}
                transition={{
                  duration: 0.85,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="flex flex-col items-center -space-y-2.5 filter drop-shadow-[0_0_12px_rgba(249,115,22,0.95)]"
              >
                <ChevronDown className="w-6 h-6 text-orange-400/60" />
                <ChevronDown className="w-7 h-7 text-orange-400" />
              </motion.div>

              {/* Pulsing Touch Ring over SPARRING card */}
              <motion.div
                animate={{
                  scale: [0.85, 1.25, 0.85],
                  opacity: [0.5, 0.95, 0.5],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute top-4 w-20 h-20 rounded-2xl border-2 border-orange-500 shadow-[0_0_25px_#EA580C] pointer-events-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
