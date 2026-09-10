'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export const TUTORIAL_STORAGE_KEY = 'sparai_free_sparring_tutorial_completed';

interface FreeSparringTutorialProps {
  menuOpen: boolean;
}

export function FreeSparringTutorial({ menuOpen }: FreeSparringTutorialProps) {
  const [tutorialStep, setTutorialStep] = useState<'idle' | 'explore' | 'sparring' | 'completed'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if tutorial is forced via URL parameter for testing/demo
    const urlParams = new URLSearchParams(window.location.search);
    const forceTutorial = urlParams.get('tutorial') === 'true';

    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';

    if (forceTutorial || !completed) {
      // Small initial delay after page loads to start the guided experience smoothly
      const timer = setTimeout(() => {
        setTutorialStep(menuOpen ? 'sparring' : 'explore');
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setTutorialStep('completed');
    }
  }, []);

  // Synchronize tutorial step with menu open/close state
  useEffect(() => {
    if (tutorialStep === 'completed' || tutorialStep === 'idle') return;

    if (menuOpen) {
      setTutorialStep('sparring');
    } else {
      setTutorialStep('explore');
    }
  }, [menuOpen]);

  const dismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined') {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    }
    setTutorialStep('completed');
  };

  if (tutorialStep === 'completed' || tutorialStep === 'idle') {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000] overflow-visible">
      <AnimatePresence mode="wait">
        {tutorialStep === 'explore' && !menuOpen && (
          <motion.div
            key="tutorial-step-explore"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          >
            {/* Cyberpunk HUD Guidance Callout Tooltip */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 25 }}
              className="pointer-events-auto mb-2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0a1306]/95 border border-[#E2FF3B]/60 shadow-[0_0_25px_rgba(226,255,59,0.45)] backdrop-blur-xl"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E2FF3B] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E2FF3B]" />
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#E2FF3B] shrink-0 animate-pulse" />
              <span className="text-[10.5px] font-black uppercase tracking-wider text-[#E2FF3B] whitespace-nowrap">
                Tap Explore for Free Sparring
              </span>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Skip Tutorial"
                className="ml-1 pl-1.5 border-l border-white/20 text-[9.5px] font-bold text-white/50 hover:text-white uppercase transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Skip</span>
              </button>
            </motion.div>

            {/* Holographic Green Finger Projection Pointing & Tapping at Explore Button */}
            <div className="relative flex flex-col items-center">
              <motion.div
                animate={{
                  y: [0, 10, 0],
                  scale: [1, 0.94, 1],
                }}
                transition={{
                  duration: 1.15,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="filter drop-shadow-[0_0_18px_rgba(226,255,59,0.9)] transform rotate-180"
              >
                {/* Holographic Finger Image */}
                <img
                  src="/images/hologram-finger.png"
                  alt="Tap Guide"
                  className="w-14 h-24 object-contain"
                />
              </motion.div>

              {/* Glowing Touch Impact Ripple Emitting from Contact Point */}
              <motion.div
                animate={{
                  scale: [0.5, 1.4],
                  opacity: [0.9, 0],
                }}
                transition={{
                  duration: 1.15,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="absolute -bottom-2 w-12 h-12 rounded-full border-2 border-[#E2FF3B] bg-[#E2FF3B]/20 pointer-events-none shadow-[0_0_20px_#E2FF3B]"
              />
            </div>
          </motion.div>
        )}

        {tutorialStep === 'sparring' && menuOpen && (
          <motion.div
            key="tutorial-step-sparring"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(94vw,348px)] flex flex-col items-center pointer-events-none"
          >
            {/* Guidance HUD Callout floating above the Combat Protocols tray */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.25 }}
              className="pointer-events-auto absolute -top-12 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#180e05]/95 border border-orange-500/70 shadow-[0_0_25px_rgba(249,115,22,0.45)] backdrop-blur-xl"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
              </span>
              <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-300 whitespace-nowrap">
                Tap Sparring — 100% Free!
              </span>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss Tutorial"
                className="ml-1 pl-1.5 border-l border-white/20 text-[9.5px] font-bold text-white/50 hover:text-white uppercase transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Got it</span>
              </button>
            </motion.div>

            {/* Holographic Finger positioned over the SPARRING hexagon card (Right column) */}
            <div className="absolute top-[88px] right-[18px] flex flex-col items-center pointer-events-none z-30">
              <motion.div
                animate={{
                  y: [0, 8, 0],
                  scale: [1, 0.93, 1],
                }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="filter drop-shadow-[0_0_18px_rgba(249,115,22,0.9)] transform rotate-180"
              >
                <img
                  src="/images/hologram-finger.png"
                  alt="Tap Sparring"
                  className="w-14 h-24 object-contain brightness-125 hue-rotate-[-35deg]"
                />
              </motion.div>

              {/* Glowing Amber Touch Impact Ripple */}
              <motion.div
                animate={{
                  scale: [0.5, 1.45],
                  opacity: [0.95, 0],
                }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="absolute -bottom-2 w-14 h-14 rounded-full border-2 border-orange-500 bg-orange-500/20 pointer-events-none shadow-[0_0_22px_#EA580C]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
