'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Gift, 
  Crown, 
  Bell, 
  Zap, 
  Lock, 
  ChevronRight,
} from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { getUserProfile } from '@/lib/firebase-reflex';
import type { UserProfile } from '@/lib/firebase-auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function FreeTrialReferralPage() {
  const router = useRouter();
  const { user } = useFirebaseUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then(setProfile);
    }
  }, [user]);

  const referralCode = profile?.referral_code || 'SPARAI30';
  const referralCount = profile?.referral_count || 0;
  const progress = Math.min(referralCount, 5);
  const isRewardUnlocked = referralCount >= 5 || profile?.referral_bonus_5_claimed;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClaimTrial = async () => {
    if (!user) {
      router.push('/onboarding');
      return;
    }
    setClaiming(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/reflex/claim-referral', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setClaimed(true);
        if (user.uid) {
          getUserProfile(user.uid).then(setProfile);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-white font-sans p-4 sm:p-6 pb-24 max-w-xl mx-auto flex flex-col gap-6 relative">
      {/* Top Header */}
      <header className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <span className="text-[9px] font-black tracking-[3px] text-primary uppercase block">VIP REWARD ACCESS</span>
          <h1 className="text-xl font-black italic uppercase leading-tight text-white tracking-wide">30-DAY FREE TRIAL</h1>
        </div>
        <div className="w-10 h-10" />
      </header>

      {/* Top Visual: AI Fighter Analysis HUD (Reference Image Style) */}
      <div className="relative w-full h-48 sm:h-52 rounded-[32px] overflow-hidden border-2 border-primary/40 shadow-[0_0_35px_rgba(226,255,59,0.25)]">
        <Image
          src="/images/promos/vision_hud.jpg"
          alt="AI Form Analysis"
          fill
          className="object-cover object-center scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-black/40 to-transparent" />
        
        {/* Floating AI Badges on Image */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/70 border border-primary/40 text-primary text-[8px] font-black uppercase backdrop-blur-md">
            <Zap className="w-2.5 h-2.5 animate-pulse" /> COMPUTER VISION ACTIVE
          </span>
        </div>

        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <div>
            <span className="text-[8px] font-black text-white/60 uppercase tracking-widest block">ANALYSIS ACCURACY</span>
            <span className="text-lg font-black italic text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              99.4% REAL-TIME BIO-FEEDBACK
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary text-black text-[9px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(226,255,59,0.6)]">
            30 DAYS FREE
          </span>
        </div>
      </div>

      {/* Timeline Card: 'How your free trial works' (Matching uploaded reference design) */}
      <GlassCard className="p-6 border-white/10 bg-gradient-to-b from-white/[0.04] to-black/60 rounded-[32px] flex flex-col gap-5">
        <div>
          <h2 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">
            How your <span className="text-primary">free trial works</span>
          </h2>
          <p className="text-xs font-semibold text-white/50 mt-1.5 leading-relaxed">
            Full unlocked access to all AI boxing coaching modules.<br />
            First 30 days are 100% free with your referral code, then renews at standard athlete rates.
          </p>
        </div>

        {/* Timeline Sequence */}
        <div className="relative flex flex-col gap-6 pl-2 py-1">
          {/* Vertical Connecting Line */}
          <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20" />

          {/* Timeline Item 1 */}
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary shrink-0 shadow-[0_0_15px_rgba(226,255,59,0.3)]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-white tracking-wide">Today: Instant Unlock</div>
              <p className="text-[11px] font-semibold text-white/60 mt-0.5 leading-snug">
                Unlock 24/7 AI Video Analysis, Live 1v1 Sparring Arena, and custom Weekly Tactical Protocols.
              </p>
            </div>
          </div>

          {/* Timeline Item 2 */}
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/20 flex items-center justify-center text-white/70 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-white tracking-wide">Day 25: Friendly Reminder</div>
              <p className="text-[11px] font-semibold text-white/60 mt-0.5 leading-snug">
                We&apos;ll send you an in-app reminder that your 30-day trial is ending soon so you&apos;re always in control.
              </p>
            </div>
          </div>

          {/* Timeline Item 3 */}
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/20 flex items-center justify-center text-white/70 shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-white tracking-wide">Day 30: Flexible Continuation</div>
              <p className="text-[11px] font-semibold text-white/60 mt-0.5 leading-snug">
                Continue your championship streak for just ₹629/mo or cancel anytime before Day 30 with zero hassle.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Extreme Traditional Boxing Academy Price Comparison Card */}
      <div className="rounded-[32px] border-2 border-red-500/40 bg-gradient-to-br from-red-500/10 via-black/80 to-black p-5 shadow-[0_0_30px_rgba(239,68,68,0.2)] relative overflow-hidden flex flex-col gap-3.5">
        <div className="absolute top-0 right-0 w-36 h-36 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[2.5px] text-red-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> TRADITIONAL BOXING GYMS
          </span>
          <span className="text-[8px] bg-red-500/20 text-red-400 border border-red-500/40 font-black px-2.5 py-0.5 rounded-full uppercase">
            OVERWHELMINGLY EXPENSIVE
          </span>
        </div>

        <div className="flex items-baseline justify-between border-b border-red-500/20 pb-3">
          <div>
            <div className="text-2xl font-black text-red-500 tracking-tight line-through opacity-90">
              ₹8,500 – ₹18,000
            </div>
            <span className="text-[9px] text-red-400/80 font-bold uppercase block mt-0.5">
              / MONTH + ₹1,500/HR COACH FEES
            </span>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-primary uppercase">
              ₹0 FOR 30 DAYS
            </span>
            <span className="text-[8px] font-bold text-white/50 uppercase block">
              THEN ONLY ₹629/MO (SAVE 94%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
          <div className="flex flex-col gap-1.5 text-red-400/80">
            <span className="flex items-center gap-1.5 line-through">
              <span className="text-red-500 font-black">✕</span> ₹1,500/hr Trainer Fees
            </span>
            <span className="flex items-center gap-1.5 line-through">
              <span className="text-red-500 font-black">✕</span> Rigid Travel & Slots
            </span>
            <span className="flex items-center gap-1.5 line-through">
              <span className="text-red-500 font-black">✕</span> No Punch Velocity AI
            </span>
          </div>
          <div className="flex flex-col gap-1.5 text-white/90">
            <span className="flex items-center gap-1.5 text-primary">
              <Check className="w-3.5 h-3.5 text-primary stroke-[3]" /> 24/7 AI Form Feedback
            </span>
            <span className="flex items-center gap-1.5 text-primary">
              <Check className="w-3.5 h-3.5 text-primary stroke-[3]" /> Train Anytime from Home
            </span>
            <span className="flex items-center gap-1.5 text-primary">
              <Check className="w-3.5 h-3.5 text-primary stroke-[3]" /> Realtime Live Sparring
            </span>
          </div>
        </div>
      </div>

      {/* Referral Code & Progression Section */}
      <GlassCard className="p-5 border-primary/30 bg-black/60 rounded-[32px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black text-white uppercase tracking-wider">YOUR EXCLUSIVE REFERRAL CODE</span>
          </div>
          <span className="text-[8px] font-black text-primary uppercase bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded-full">
            GIVE 30D • GET 30D
          </span>
        </div>

        {/* Copy Box */}
        <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3">
          <div>
            <span className="text-[8px] font-bold text-white/40 uppercase block mb-0.5">Share with 5 fighters</span>
            <span className="text-lg font-black text-primary tracking-[4px]">{referralCode}</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-4 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(226,255,59,0.3)] active:scale-95 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>

        {/* Progression Bar of Referrals */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[9px] font-black uppercase text-white/60">
            <span>{progress} / 5 Friends Joined</span>
            <span className="text-primary">{progress >= 5 ? '30-DAY REWARD UNLOCKED' : `${5 - progress} More Needed`}</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-yellow-300 rounded-full shadow-[0_0_10px_rgba(226,255,59,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${(progress / 5) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </GlassCard>

      {/* Bottom CTA Action Buttons */}
      <div className="flex flex-col gap-3 mt-2">
        <NeonButton
          onClick={handleClaimTrial}
          disabled={claiming || claimed}
          className="w-full h-14 text-sm font-black italic tracking-widest text-black uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(226,255,59,0.4)]"
        >
          {claimed ? '30-DAY TRIAL ACTIVATED!' : claiming ? 'ACTIVATING TRIAL...' : 'START MY 30-DAY FREE TRIAL NOW'}
          <ChevronRight className="w-4 h-4 stroke-[3]" />
        </NeonButton>

        <button
          onClick={() => router.push('/subscription')}
          className="w-full py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <Crown className="w-4 h-4 text-primary" /> CONTINUE WITH SUBSCRIPTION PLANS
        </button>
      </div>
    </div>
  );
}
