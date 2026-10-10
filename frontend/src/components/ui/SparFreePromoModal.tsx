'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirebaseUser } from '@/lib/useFirebaseUser';

const PROMO_STORAGE_KEY = 'sparai_free_spar_modal_v1';

export function SparFreePromoModal() {
  const router = useRouter();
  const { user, loading } = useFirebaseUser();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show once when user enters the home page
    // Also don't show if user is already authenticated
    const hasSeen = localStorage.getItem(PROMO_STORAGE_KEY);
    if (!hasSeen && !loading && !user) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  const handleClose = () => {
    localStorage.setItem(PROMO_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleEnterSpar = () => {
    localStorage.setItem(PROMO_STORAGE_KEY, 'true');
    setIsOpen(false);
    // Route authenticated users directly to spar, unauthenticated to onboarding
    if (user) {
      router.push('/spar');
    } else {
      router.push('/onboarding');
    }
  };

  const handleViewDeals = () => {
    localStorage.setItem(PROMO_STORAGE_KEY, 'true');
    setIsOpen(false);
    // Route to subscription page for deals
    if (user) {
      router.push('/subscription');
    } else {
      router.push('/onboarding');
    }
  };

  // Keyboard shortcut for ESC button
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          data-free-promo-active="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container matching exact tactical HUD design */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="relative w-full max-w-[460px] max-h-[calc(100dvh-1rem)] overflow-y-auto bg-[#070707] border border-[#222222] p-3.5 sm:p-5 shadow-[0_0_50px_rgba(0,0,0,0.85)] z-10 custom-scrollbar select-none"
          >
            {/* Top Tactical Status Bar */}
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono tracking-wider border-b border-[#1c1c1c] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#d4ff00] inline-block shadow-[0_0_8px_#d4ff00]" />
                <span className="font-bold text-white tracking-widest uppercase">
                  COMBAT DIVISION
                </span>
                <span className="text-neutral-600">//</span>
                <span className="text-neutral-400 uppercase text-[9px] sm:text-[10px]">
                  INTAKE PROTOCOL
                </span>
              </div>
              <span className="text-neutral-500 uppercase">SYS.VER 4.8.2</span>
            </div>

            {/* Subheader: Apex Combat + ESC Button */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                {/* Shield with lightning logo */}
                <div className="w-9 h-9 border border-[#262626] bg-[#0f0f10] flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-[#d4ff00]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  >
                    <path
                      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                      stroke="currentColor"
                    />
                    <path
                      d="M13 7l-3.5 5h3l-1.5 5 4.5-6h-3l1.5-4z"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-wider uppercase font-sans leading-none">
                    APEX COMBAT
                  </h3>
                  <p className="text-[9px] font-mono text-neutral-400 tracking-widest uppercase mt-1">
                    PERFORMANCE INSTITUTE
                  </p>
                </div>
              </div>

              {/* ESC Button */}
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 px-2.5 py-1 border border-[#262626] bg-[#111112] hover:bg-[#1c1c1e] text-neutral-300 hover:text-white font-mono text-xs tracking-wider transition-colors"
                title="Press Escape to close"
              >
                <span>ESC</span>
                <span className="text-sm leading-none">&times;</span>
              </button>
            </div>

            {/* Hero Image Card */}
            <div className="relative border border-[#222222] bg-black overflow-hidden mb-3.5">
              <img
                src="/images/promos/combat-pass-hero.jpg"
                alt="Live Peer Matchmaking"
                className="w-full h-44 sm:h-52 object-cover object-center brightness-95"
              />

              {/* Top-Left: Live Peer Matchmaking Badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 bg-black/85 backdrop-blur-sm border border-neutral-800">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00] shadow-[0_0_6px_#d4ff00] animate-pulse" />
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-white tracking-wider uppercase">
                  LIVE PEER MATCHMAKING // ACTIVE ARENA
                </span>
              </div>

              {/* Bottom-Left: Sync Badge */}
              <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/85 backdrop-blur-sm border border-neutral-800">
                <span className="text-[9px] font-mono text-neutral-300 tracking-wider">
                  SYNC: 18ms
                </span>
              </div>

              {/* Bottom-Right: Division Badge */}
              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/85 backdrop-blur-sm border border-neutral-800">
                <span className="text-[9px] font-mono text-neutral-300 tracking-wider uppercase">
                  DIVISION: PRO-SERIES
                </span>
              </div>
            </div>

            {/* Protocol Badge & Headline */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-[#d4ff00] text-black font-black font-mono text-[9px] sm:text-[10px] px-2 py-0.5 tracking-wider uppercase">
                PROTOCOL // 01
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-neutral-400 tracking-wider uppercase">
                NEW ATHLETE ONBOARDING ACCESS
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-tight mb-2">
              CLAIM YOUR 30-DAY COMBAT PASS
            </h2>

            <p className="text-neutral-300 text-xs sm:text-[13px] leading-relaxed mb-3.5">
              Welcome to Apex. Access ranked peer-to-peer sparring, computer vision punch telemetry, and sub-second AI corner coaching.{' '}
              <span className="text-white font-bold">
                100% complimentary for your first month.
              </span>
            </p>

            {/* 3 Technical Feature Cards */}
            <div className="flex flex-col gap-2 mb-4">
              {/* Feature 01 */}
              <div className="border border-[#202020] bg-[#0c0c0d] p-2.5 sm:p-3 transition-colors hover:border-neutral-700">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#d4ff00] font-mono font-bold text-xs">
                      [01]
                    </span>
                    <span className="text-white font-black text-xs uppercase tracking-wider">
                      REAL-TIME PEER SPARRING
                    </span>
                  </div>
                  <span className="text-neutral-500 font-mono text-[9px] tracking-wider uppercase">
                    GLOBAL MESH
                  </span>
                </div>
                <p className="text-neutral-400 text-[11px] sm:text-xs leading-normal pl-6 sm:pl-7">
                  Low-latency sync matching fighters precisely by weight, stance, and division ranking.
                </p>
              </div>

              {/* Feature 02 */}
              <div className="border border-[#202020] bg-[#0c0c0d] p-2.5 sm:p-3 transition-colors hover:border-neutral-700">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#d4ff00] font-mono font-bold text-xs">
                      [02]
                    </span>
                    <span className="text-white font-black text-xs uppercase tracking-wider">
                      VISION AI TELEMETRY
                    </span>
                  </div>
                  <span className="text-neutral-500 font-mono text-[9px] tracking-wider uppercase">
                    CV PROTOCOL
                  </span>
                </div>
                <p className="text-neutral-400 text-[11px] sm:text-xs leading-normal pl-6 sm:pl-7">
                  Automatic impact velocity, guard recovery rate, and punch volume tracking in real time.
                </p>
              </div>

              {/* Feature 03 */}
              <div className="border border-[#202020] bg-[#0c0c0d] p-2.5 sm:p-3 transition-colors hover:border-neutral-700">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#d4ff00] font-mono font-bold text-xs">
                      [03]
                    </span>
                    <span className="text-white font-black text-xs uppercase tracking-wider">
                      ADAPTIVE CORNER COACH
                    </span>
                  </div>
                  <span className="text-neutral-500 font-mono text-[9px] tracking-wider uppercase">
                    SUB-SECOND
                  </span>
                </div>
                <p className="text-neutral-400 text-[11px] sm:text-xs leading-normal pl-6 sm:pl-7">
                  Haptic and live vocal audio cues during rounds for slips, counters, and output cadence.
                </p>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-[#1f1f1f] pt-3.5 mb-2.5" />

            {/* Primary CTA */}
            <button
              onClick={handleEnterSpar}
              className="w-full bg-[#d4ff00] hover:bg-[#c2ea00] active:scale-[0.99] text-black font-black uppercase text-xs sm:text-sm tracking-wider py-3.5 px-4 flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(212,255,0,0.25)]"
            >
              <span>ACTIVATE 30-DAY FREE ACCESS</span>
              <span className="text-base font-bold">→</span>
            </button>

            {/* Microcopy under CTA */}
            <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-mono text-neutral-400 my-2.5">
              <span>Zero commitment</span>
              <span className="text-neutral-600">·</span>
              <span className="text-white font-bold">$0.00 due today</span>
              <span className="text-neutral-600">·</span>
              <span>Cancel anytime in Settings</span>
            </div>

            {/* Secondary Button: Explore App First */}
            <button
              onClick={handleClose}
              className="w-full border border-[#242424] bg-[#0e0e0f] hover:bg-[#18181a] text-neutral-300 hover:text-white font-mono text-xs uppercase tracking-widest py-3 px-4 transition-colors mb-3"
            >
              EXPLORE APP FIRST
            </button>

            {/* Footer Links: Restore Purchase / Terms / Privacy */}
            <div className="flex items-center justify-center gap-2.5 text-[10px] font-mono text-neutral-500 pb-0.5">
              <button
                onClick={handleViewDeals}
                className="hover:text-neutral-300 transition-colors uppercase tracking-wider"
              >
                Restore Purchase
              </button>
              <span>/</span>
              <button
                onClick={() => router.push('/terms')}
                className="hover:text-neutral-300 transition-colors uppercase tracking-wider"
              >
                Terms
              </button>
              <span>/</span>
              <button
                onClick={() => router.push('/privacy')}
                className="hover:text-neutral-300 transition-colors uppercase tracking-wider"
              >
                Privacy
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
