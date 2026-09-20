'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  Footprints,
  Camera,
  Mic,
  Wifi,
  Video,
} from 'lucide-react';
import {
  SwordsNeonIcon,
  ShieldNeonIcon,
} from '@/components/ui/NeonIcons';
import { motion } from 'framer-motion';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

type SparStatus = {
  mode: 'paid' | 'free';
  canSpar: boolean;
  needsAd: boolean;
  remaining: number;
  sparDailyLimit: number;
  sparDailyUsed: number;
  freeSparAvailable: boolean;
  freeSparUnlocked: boolean;
  planName: string | null;
};

const RULES = [
  {
    icon: Eye,
    title: 'Follow the coach calls',
    body: 'Both fighters hear the same punch & defense sequence. Hit EXECUTE when you land the move.',
  },
  {
    icon: Camera,
    title: 'Camera + mic on',
    body: 'Live 1v1 uses your front camera and mic. Stand where your upper body is clearly visible.',
  },
  {
    icon: ShieldNeonIcon,
    title: 'Fair play',
    body: 'Winner is scored on the server from both result submissions. Quitting early counts as a forfeit.',
  },
];

const STANCE = [
  {
    icon: Footprints,
    title: 'Orthodox / Southpaw',
    body: 'Lead foot forward, hands up, chin tucked. Stay light on your feet between calls.',
  },
  {
    icon: SwordsNeonIcon,
    title: 'React, don’t spam',
    body: 'Wait for the coach call, then throw or defend. Speed + accuracy beat random tapping.',
  },
];

/** Spar entry: rules, stance, then Start or Watch Ad. */
export default function SparIntroPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SparStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const user = firebaseAuth.currentUser;
      if (!user) {
        setStatus(null);
        setError('Please log in to spar.');
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/spar/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load spar status.');
      setStatus(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged(() => refresh());
    return () => unsub();
  }, [refresh]);

  const needsAd = !!status && status.mode === 'free' && (status.needsAd || !status.freeSparUnlocked);
  const usedUp = !!status && status.mode === 'free' && !status.freeSparAvailable;
  const paidBlocked = !!status && status.mode === 'paid' && !status.canSpar;

  const onPrimary = () => {
    router.push('/spar/lobby');
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-[calc(190px+env(safe-area-inset-bottom,0px))] font-sans text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#0d0d0d_0%,#0a0a0a_100%)]" />

      <div className="relative mx-auto flex w-full max-w-[500px] flex-col gap-4 px-4 pb-6 pt-3">
        <header className="flex items-center gap-3 px-0.5">
          <button
            onClick={() => router.push('/dashboard')}
            aria-label="Back to dashboard"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#242424] text-white/80 transition hover:bg-[#303030] hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <span className="block text-[12px] font-black uppercase tracking-[0.12em] text-primary">
              LIVE 1V1
            </span>
            <h1 className="text-[21px] font-black italic uppercase leading-none tracking-tight text-white">SPARRING</h1>
          </div>
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black shadow-[0_0_14px_rgba(226,255,59,0.35)]">
            FREE
          </span>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#35352e] bg-[#1c1c1c] p-5"
        >
          <div className="flex items-start gap-5">
            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-2xl border border-[#3b4130] bg-[#292b29]">
              <SwordsNeonIcon className="h-9 w-9 text-primary drop-shadow-[0_0_10px_rgba(226,255,59,0.8)]" />
            </div>
            <div className="pt-0.5">
              <p className="text-[clamp(15px,4.8vw,19px)] font-black uppercase leading-tight text-white">Real-time opponent spar</p>
              <p className="mt-2 text-[clamp(12px,3.8vw,16px)] font-medium leading-[1.45] text-[#d0d0b8]">
              Match with a fighter in real-time. Follow the voice calls and fight for the top rank.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-3 text-[12px] font-black uppercase tracking-wider text-[#c8c8b0]">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> QUEUE: LIVE MATCHMAKING</span>
            <span>EST. WAIT: ~12s</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Video, label: 'CAMERA', value: 'Ready (1080p)' },
            { icon: Mic, label: 'AUDIO', value: 'Active Mic' },
            { icon: Wifi, label: 'LATENCY', value: '24ms (Ranked)' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-[#35352e] bg-[#191919] px-3 py-4">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-[#c8c8b0]"><Icon className="h-4 w-4 text-primary" /> {label}</div>
              <div className="mt-3 whitespace-nowrap text-[14px] font-bold text-white">{value}</div>
            </div>
          ))}
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between px-0.5">
            <h2 className="text-[15px] font-black uppercase tracking-wider text-[#d0d0b8]">RULES</h2>
            <span className="text-[12px] font-black uppercase text-[#939383]">PROTOCOL V2.4</span>
          </div>
          <div className="flex flex-col gap-3.5">
            {RULES.map((r, i) => {
              const Icon = r.icon;
              return (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <GlassCard className="flex min-h-[166px] items-start gap-5 rounded-2xl border-[#35352e] bg-[#1c1c1c] px-5 py-6">
                    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[#35352e] bg-[#252525]">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-[clamp(15px,4.8vw,19px)] font-black uppercase leading-tight text-[#f1f1ed]">{r.title}</div>
                      <p className="mt-2 text-[clamp(12px,3.8vw,16px)] font-medium leading-[1.5] text-[#d0d0b8]">{r.body}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between px-0.5">
            <h2 className="text-[15px] font-black uppercase tracking-wider text-[#d0d0b8]">STANCE &amp; SETUP</h2>
            <span className="text-[12px] font-black uppercase text-[#939383]">CALIBRATION</span>
          </div>
          <div className="flex flex-col gap-3.5">
            {STANCE.map((s) => {
              const Icon = s.icon;
              return (
                <GlassCard
                  key={s.title}
                  className="flex min-h-[166px] items-start gap-5 rounded-2xl border-[#35352e] bg-[#1c1c1c] px-5 py-6"
                >
                  <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[#35352e] bg-[#252525]">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-[clamp(15px,4.8vw,19px)] font-black uppercase leading-tight text-[#f1f1ed]">{s.title}</div>
                    <p className="mt-2 text-[clamp(12px,3.8vw,16px)] font-medium leading-[1.5] text-[#d0d0b8]">{s.body}</p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <GlassCard className="flex flex-col gap-2 rounded-2xl border-[#35352e] bg-[#191919] p-4">
            {error && (
                <div className="flex items-start gap-2 text-[11px] font-semibold text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

          </GlassCard>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-20 border-t border-white/[0.08] bg-[#0d0d0d]/95 px-4 pb-3 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-[500px]">
          <NeonButton className="h-[74px] w-full text-[18px]" onClick={onPrimary}>
            START SPARRING <SwordsNeonIcon className="ml-1 h-5 w-5 text-black" glow={false} />
          </NeonButton>
          <p className="mt-2 text-center text-[12px] font-bold tracking-wide text-[#aaa994]">● &nbsp;Ranked Rating: MMR 1,420 · Season 4 Tier: Diamond</p>
        </div>
      </footer>
    </div>
  );
}
