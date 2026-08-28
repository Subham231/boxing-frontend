'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Crown, Zap, Sparkles, Trophy, Gift, Play } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { useFirebaseUser } from '@/lib/useFirebaseUser';

const PROMO_STORAGE_KEY = 'sparai_free_spar_modal_v1';

export function SparFreePromoModal() {
  const router = useRouter();
  const { user, loading } = useFirebaseUser();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show once when user enters the home page
    // Also don't show if user is already authenticated (they can access spar directly)
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-md"
          />

          {/* Modal Card - Larger, more visual, less cramped */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="relative w-full max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto bg-gradient-to-b from-[#1a1f14] via-[#0e1109] to-[#070806] border-2 border-primary/60 rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 shadow-[0_0_60px_rgba(226,255,59,0.35)] z-10 custom-scrollbar"
          >
            {/* Background Glow - more prominent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button - larger hit area */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all z-20 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main Visual - Large central graphic */}
            <div className="relative mb-3 sm:mb-6 flex items-center justify-center">
              {/* Boxing ring visual */}
              <div className="relative w-36 h-36 sm:w-56 sm:h-56">
                {/* Outer ring ropes */}
                <div className="absolute inset-0 rounded-[20px] border-4 border-primary/40 opacity-80" />
                <div className="absolute inset-2 rounded-[18px] border-2 border-primary/30 opacity-60" />
                <div className="absolute inset-4 rounded-[16px] border border-primary/20 opacity-40" />

                {/* Center sparkle */}
                <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Swords className="w-7 h-7 sm:w-10 sm:h-10 text-primary drop-shadow-[0_0_16px_rgba(226,255,59,0.8)]" />
                </motion.div>
                </div>

                {/* Corner posts with glow */}
                {['tl', 'tr', 'bl', 'br'].map((corner) => (
                  <motion.div
                    key={corner}
                    className={`absolute w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full bg-primary/50 shadow-[0_0_8px_rgba(226,255,59,0.6)] ${
                      corner === 'tl' ? 'top-1 left-1' :
                      corner === 'tr' ? 'top-1 right-1' :
                      corner === 'bl' ? 'bottom-1 left-1' : 'bottom-1 right-1'
                    }`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  />
                ))}
              </div>
            </div>

            {/* Title - Large, impactful, minimal text */}
            <div className="text-center mb-3 sm:mb-4">
              <motion.h2
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="text-xl sm:text-3xl font-black italic uppercase leading-tight text-white tracking-wide"
              >
                SPARRING IS
                <br />
                <span className="text-primary drop-shadow-[0_0_20px_rgba(226,255,59,0.9)]">100% FREE</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-[11px] sm:text-base font-medium text-white/70 mt-1 sm:mt-2 leading-relaxed max-w-xs mx-auto"
              >
                Live 1v1 matches. Real-time AI coach. Zero subscription.
              </motion.p>
            </div>

            {/* Visual Feature Highlights - Icon-focused, minimal text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6"
            >
              {/* Feature 1: Live Spar */}
              <div className="group relative p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300">
                <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                  <Swords className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
                </div>
                <div className="text-center">
                  <div className="text-[11px] sm:text-sm font-black text-white uppercase tracking-wide">Live 1v1</div>
                  <div className="text-[8px] sm:text-[10px] text-white/50 font-bold uppercase mt-0.5">Realtime PvP</div>
                </div>
              </div>

              {/* Feature 2: AI Coach */}
              <div className="group relative p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all duration-300">
                <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-cyan-400" />
                </div>
                <div className="text-center">
                  <div className="text-[11px] sm:text-sm font-black text-white uppercase tracking-wide">AI Coach</div>
                  <div className="text-[8px] sm:text-[10px] text-white/50 font-bold uppercase mt-0.5">40–70 Calls</div>
                </div>
              </div>

              {/* Feature 3: Leaderboard */}
              <div className="group relative p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/40 hover:bg-amber-400/5 transition-all duration-300">
                <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                  <Trophy className="w-5 h-5 sm:w-7 sm:h-7 text-amber-400" />
                </div>
                <div className="text-center">
                  <div className="text-[11px] sm:text-sm font-black text-white uppercase tracking-wide">Rankings</div>
                  <div className="text-[8px] sm:text-[10px] text-white/50 font-bold uppercase mt-0.5">Weekly Seasons</div>
                </div>
              </div>

              {/* Feature 4: Deals */}
              <div className="group relative p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-400/40 hover:bg-purple-400/5 transition-all duration-300">
                <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-purple-400/15 border border-purple-400/30 flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                  <Crown className="w-5 h-5 sm:w-7 sm:h-7 text-purple-400" />
                </div>
                <div className="text-center">
                  <div className="text-[11px] sm:text-sm font-black text-white uppercase tracking-wide">Deals</div>
                  <div className="text-[8px] sm:text-[10px] text-white/50 font-bold uppercase mt-0.5">Up to 40% Off</div>
                </div>
              </div>
            </motion.div>

            {/* Actions - Large, prominent buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col gap-2 sm:gap-3"
            >
              {/* Primary CTA - Enter Sparring */}
              <NeonButton
                onClick={handleEnterSpar}
                className="w-full h-12 sm:h-14 text-xs sm:text-sm font-black italic tracking-widest text-black uppercase flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(226,255,59,0.5)]"
              >
                <Play className="w-5 h-5" />
                ENTER SPARRING ARENA
                <Swords className="w-5 h-5" />
              </NeonButton>

              {/* Secondary CTA - View Deals */}
              <button
                onClick={handleViewDeals}
                className="w-full h-10 sm:h-12 rounded-xl border-2 border-primary/30 bg-primary/10 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/20 transition-all"
              >
                <Crown className="w-5 h-5" />
                VIEW DEALS & FREE TRIALS
              </button>

              {/* Dismiss - subtle */}
              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="text-[11px] font-black text-white/40 hover:text-white/70 uppercase tracking-widest text-center py-2"
              >
                Not now
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
