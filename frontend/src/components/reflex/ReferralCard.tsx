'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check } from 'lucide-react';
import { getUserProfile, type UserProfile } from '@/lib/firebase-auth';
import { GlassCard } from '@/components/ui/GlassCard';

export default function ReferralCard({ uid }: { uid: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getUserProfile(uid).then(setProfile);
  }, [uid]);

  if (!profile) return null;

  const progressInCycle = profile.referralCount % 5;
  const subActive = profile.subscriptionUntil ? new Date(profile.subscriptionUntil) > new Date() : false;

  const handleCopy = () => {
    navigator.clipboard.writeText(profile.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <GlassCard className="p-5 border-primary/20 bg-primary/[0.03] flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Refer 5 Friends, Get 1 Month Free</span>
      </div>

      <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
        <span className="text-lg font-black text-white tracking-[4px]">{profile.referralCode}</span>
        <button onClick={handleCopy} className="text-primary">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[9px] font-black uppercase text-white/40">
          <span>{progressInCycle} / 5 Referrals</span>
          <span>{profile.referralCount} Total</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${(progressInCycle / 5) * 100}%` }} />
        </div>
      </div>

      {subActive && (
        <div className="text-[10px] font-black text-primary uppercase text-center bg-primary/10 border border-primary/20 rounded-xl py-2">
          Reward Active until {new Date(profile.subscriptionUntil!).toLocaleDateString()}
        </div>
      )}
    </GlassCard>
  );
}
