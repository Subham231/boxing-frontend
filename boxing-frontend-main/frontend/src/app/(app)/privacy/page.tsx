'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  ArrowLeft,
  Database,
  Cpu,
  UserCheck,
  Skull,
  ShieldAlert as ShieldIcon
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function PrivacyPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading Security...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 anim-fade-in relative pb-16">
      {/* Telemetry Display */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80 uppercase">MODULE: SECURITY PROTOCOLS</span>
        <span className="opacity-40 uppercase">DATA_SHIELD_ACTIVE</span>
      </div>

      {/* Page Header */}
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] flex items-center justify-center text-primary bg-black/40">
            <ShieldIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">
              SECURITY SHIELD
            </div>
            <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
              DATA PRIVACY
            </h1>
          </div>
        </div>

        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </header>

      {/* Security Status card */}
      <GlassCard className="p-6 text-center border-green-500/30 bg-green-500/[0.01]">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center text-green-500 text-xl mx-auto mb-4 animate-float">
          <ShieldIcon className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-black uppercase text-white tracking-wider mb-2">
          ENCRYPTION ACTIVE
        </h3>
        <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider leading-relaxed max-w-[280px] mx-auto">
          Your training data is strictly stored in your local neural vault (LocalStorage).
        </p>
      </GlassCard>

      {/* Policy Points */}
      <div className="flex flex-col gap-4">
        {[
          {
            icon: <Database className="w-5 h-5" />,
            title: 'Local-First Storage',
            desc: 'We do not use central servers for training logs. All performance metrics, heart rate estimates, and session history remain on your device.'
          },
          {
            icon: <Cpu className="w-5 h-5" />,
            title: 'AI Data Processing',
            desc: 'When generating training roadmaps, your profile details are sent to the SPARAI engine via a secure uplink. No biometric photos or video streams are ever uploaded.'
          },
          {
            icon: <UserCheck className="w-5 h-5" />,
            title: 'Anonymized Analysis',
            desc: "Your 'Ring Name' and combat stats are used to personalize the AI coach's feedback, but they are never sold or shared with third-party advertisers."
          },
          {
            icon: <Skull className="w-5 h-5 text-red-500" />,
            title: 'The Kill Switch',
            desc: "Use the 'Reset Engine' option in the settings menu to immediately wipe all application data from your local system. Recovery is impossible once executed.",
            danger: true
          }
        ].map((point, idx) => (
          <GlassCard
            key={idx}
            className={`p-5 flex gap-4 items-start border-white/5 bg-black/40 ${point.danger ? 'border-red-500/10 bg-red-500/[0.01]' : ''
              }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${point.danger ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
              }`}>
              {point.icon}
            </div>
            <div>
              <h4 className={`text-xs font-black uppercase tracking-wide leading-none mb-1.5 ${point.danger ? 'text-red-500' : 'text-white'
                }`}>
                {point.title}
              </h4>
              <p className="text-[10px] text-white/50 leading-relaxed font-semibold">
                {point.desc}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>

      <NeonButton onClick={() => router.back()} className="w-full h-14 mt-4 font-black uppercase text-xs tracking-widest">
        RETURN TO PROFILE
      </NeonButton>
    </div>
  );
}