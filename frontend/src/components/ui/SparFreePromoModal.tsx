'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Crown, Zap, Sparkles, Trophy, Gift } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

const PROMO_STORAGE_KEY = 'sparai_free_spar_modal_v1';

export function SparFreePromoModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show once when user enters the home page
    const hasSeen = localStorage.getItem(PROMO_STORAGE_KEY);
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(PROMO_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleEnterSpar = () => {
    localStorage.setItem(PROMO_STORAGE_KEY, 'true');
    setIsOpen(false);
    router.push('/spar');
  };

  const handleViewDeals = () => {
    localStorage.setItem(PROMO_STORAGE_KEY, 'true');
    setIsOpen(false);
    router.push('/subscription');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-gradient-to-b from-[#161C10] via-[#0D0F0B] to-[#080A07] border-2 border-primary/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(226,255,59,0.25)] overflow-hidden z-10"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-[9px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(226,255,59,0.3)]">
                <Sparkles className="w-3 h-3 animate-spin" />
                LIMITED-TIME EVENT
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 text-[9px] font-black tracking-widest uppercase">
                <Gift className="w-3 h-3" />
                FREE ACCESS
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <h2 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">
                SPARRING IS <span className="text-primary drop-shadow-[0_0_12px_rgba(226,255,59,0.8)]">100% FREE</span>
              </h2>
              <p className="text-xs font-semibold text-white/60 mt-1.5 leading-snug">
                Step inside the octagon! Test your reaction and punch combos live against fighters worldwide with zero subscription required.
              </p>
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <Swords className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-white uppercase">Live 1v1 Spar</div>
                  <div className="text-[8px] text-white/40 font-bold uppercase">Realtime WebRTC</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-white uppercase">Leaderboard</div>
                  <div className="text-[8px] text-white/40 font-bold uppercase">Weekly & Monthly</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-white uppercase">Hard AI Coach</div>
                  <div className="text-[8px] text-white/40 font-bold uppercase">40-70 Rapid Calls</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-400/10 border border-purple-400/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-white uppercase">Special Deals</div>
                  <div className="text-[8px] text-white/40 font-bold uppercase">Up to 40% Off</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <NeonButton
                onClick={handleEnterSpar}
                className="w-full h-12 text-xs font-black italic tracking-widest text-black uppercase flex items-center justify-center gap-2"
              >
                ENTER SPARRING ARENA <Swords className="w-4 h-4 ml-1" />
              </NeonButton>

              <button
                onClick={handleViewDeals}
                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <Crown className="w-3.5 h-3.5 text-primary" /> View Discount Deals & Free Trials
              </button>

              <button
                onClick={handleClose}
                className="text-[9px] font-black text-white/40 hover:text-white uppercase tracking-widest text-center py-1 mt-0.5"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
