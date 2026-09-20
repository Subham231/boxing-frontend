'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Crown, Swords, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export function HomePromoDealsBanner() {
  return (
    <div className="flex flex-col gap-3 my-1">
      {/* Free Sparring Spotlight Card */}
      <Link href="/spar">
        <GlassCard className="p-4 border-primary/40 bg-gradient-to-r from-primary/15 via-[#11160C] to-primary/5 hover:border-primary/70 transition-all group relative overflow-hidden shadow-[0_0_25px_rgba(226,255,59,0.12)]">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/30 transition-all" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-primary/20 border border-primary/50 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(226,255,59,0.3)] shrink-0">
                <Swords className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-primary text-black text-[8px] font-black tracking-widest uppercase shadow-[0_0_8px_rgba(226,255,59,0.8)]">
                    LIMITED TIME FREE
                  </span>
                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> LIVE 1V1 ARENA
                  </span>
                </div>
                <div className="text-sm font-black italic uppercase text-white tracking-wide mt-0.5">
                  FIGHT REAL OPPONENTS NOW
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase">
                  40–70 AI Coach Combos · Weekly & Monthly Trophy Ranks
                </div>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </GlassCard>
      </Link>

      {/* Limited Discount & Free Trial Deal Banner */}
      <Link href="/subscription">
        <GlassCard className="p-3.5 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-black/40 to-amber-500/5 hover:border-amber-400/60 transition-all group flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-black text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  FLASH SALE · 40% OFF
                </span>
                <span className="text-[8px] font-black text-white/40 uppercase">PRO & ELITE PASS</span>
              </div>
              <div className="text-xs font-black uppercase text-white mt-0.5">
                Unlock AI Video Vision + Unlimited Workouts
              </div>
            </div>
          </div>

          <span className="text-[10px] font-black text-amber-400 group-hover:text-white uppercase tracking-wider flex items-center gap-1 shrink-0">
            CLAIM <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </GlassCard>
      </Link>
    </div>
  );
}
