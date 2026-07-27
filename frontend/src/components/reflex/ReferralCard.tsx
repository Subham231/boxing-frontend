'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check } from 'lucide-react';
import { getUserProfile } from '@/lib/firebase-reflex';
import type { UserProfile } from '@/lib/firebase-auth';
import { GlassCard } from '@/components/ui/GlassCard';

export default function ReferralCard({ uid }: { uid: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getUserProfile(uid).then(setProfile);
  }, [uid]);

  if (!profile) return null;

  // One-time reward: exactly 5 referrals, granted once ever — not a
  // repeating every-5 cycle. Progress caps at 5/5 and stays there.
  const progress = Math.min(profile.referral_count, 5);
  const rewardClaimed = !!profile.referral_bonus_5_claimed;
  const rewardStillActive =
    rewardClaimed && profile.plan === 'referral_reward' && profile.plan_expires_at
      ? new Date(profile.plan_expires_at) > new Date()
      : false;

  const handleCopy = () => {
    navigator.clipboard.writeText(profile.referral_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <GlassCard className="p-5 border-primary/20 bg-primary/[0.03] flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
          {rewardClaimed ? 'Referral Reward Claimed' : 'Refer 5 Friends, Get 14 Days Premium'}
        </span>
      </div>

      <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
        <span className="text-lg font-black text-white tracking-[4px]">{profile.referral_code}</span>
        <button onClick={handleCopy} className="text-primary">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {!rewardClaimed && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[9px] font-black uppercase text-white/40">
            <span>{progress} / 5 Referrals</span>
            <span>{profile.referral_count} Total</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${(progress / 5) * 100}%` }} />
          </div>
        </div>
      )}

      {rewardStillActive && (
        <div className="text-[10px] font-black text-primary uppercase text-center bg-primary/10 border border-primary/20 rounded-xl py-2">
          14-Day Reward Active until {new Date(profile.plan_expires_at!).toLocaleDateString()}
        </div>
      )}
      {rewardClaimed && !rewardStillActive && (
        <div className="text-[10px] font-black text-white/40 uppercase text-center bg-white/5 border border-white/10 rounded-xl py-2">
          Reward already used — one-time per account
        </div>
      )}
    </GlassCard>
  );
}
