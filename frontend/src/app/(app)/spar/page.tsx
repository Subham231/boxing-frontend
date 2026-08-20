'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Play,
  AlertCircle,
  Shield,
  Eye,
  Footprints,
  Camera,
  Crown,
} from 'lucide-react';
import {
  SwordsNeonIcon,
  ShieldNeonIcon,
  FlameNeonIcon,
  TargetNeonIcon,
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
    if (!status) {
      router.push('/onboarding');
      return;
    }
    if (usedUp || paidBlocked) {
      router.push('/subscription');
      return;
    }
    if (needsAd) {
      router.push('/spar/watch-ad');
      return;
    }
    router.push('/spar/lobby');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-28 font-sans relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(226,255,59,0.06),transparent_50%)]" />

      <div className="relative p-6 flex flex-col gap-5">
        <header className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <span className="text-[10px] font-black text-orange-400 tracking-widest uppercase block">
              Live 1v1
            </span>
            <h1 className="text-2xl font-black italic uppercase leading-none">Sparring</h1>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-primary text-black text-[9px] font-black tracking-widest">
            FREE
          </span>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/15 via-black/40 to-transparent p-5 flex items-center gap-4"
        >
          <div
            className="w-16 h-16 shrink-0 flex items-center justify-center text-orange-400"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              background: 'linear-gradient(180deg, rgba(249,115,22,0.45), rgba(249,115,22,0.1))',
            }}
          >
            <Swords className="w-7 h-7 drop-shadow-[0_0_10px_rgba(249,115,22,0.9)]" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-white">Real-time opponent spar</p>
            <p className="text-[11px] text-white/60 font-semibold leading-relaxed mt-1">
              Free fighters: 1 spar per day after a rewarded ad. Subscribers get plan-based daily spars — no ads.
            </p>
          </div>
        </motion.div>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Rules</h2>
          <div className="flex flex-col gap-2.5">
            {RULES.map((r, i) => {
              const Icon = r.icon;
              return (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <GlassCard className="p-4 border-white/5 bg-black/40 flex gap-3 items-start">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase text-white">{r.title}</div>
                      <p className="text-[11px] text-white/55 font-semibold leading-relaxed mt-0.5">{r.body}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Stance & setup</h2>
          <div className="flex flex-col gap-2.5">
            {STANCE.map((s, i) => {
              const Icon = s.icon;
              return (
                <GlassCard
                  key={s.title}
                  className="p-4 border-orange-400/15 bg-orange-500/[0.04] flex gap-3 items-start"
                >
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-400/25 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase text-white">{s.title}</div>
                    <p className="text-[11px] text-white/55 font-semibold leading-relaxed mt-0.5">{s.body}</p>
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
          <GlassCard className="p-5 border-primary/20 bg-primary/[0.03] flex flex-col gap-3">
            {error && (
              <div className="flex items-start gap-2 text-[11px] text-red-400 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {status && (
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-wide">
                {status.mode === 'paid'
                  ? status.sparDailyLimit < 0
                    ? `${status.planName} · Unlimited spars today`
                    : `${status.planName} · ${status.sparDailyUsed}/${status.sparDailyLimit} used today`
                  : usedUp
                    ? 'Free spar already used today'
                    : needsAd
                      ? 'Watch an ad to unlock today’s free spar'
                      : 'Ad unlocked — ready to find an opponent'}
              </p>
            )}

            <NeonButton className="w-full h-14" onClick={onPrimary}>
              {usedUp || paidBlocked ? (
                <>
                  UPGRADE PLAN <Crown className="w-4 h-4 ml-1" />
                </>
              ) : needsAd ? (
                <>
                  WATCH AD TO CONTINUE <Play className="w-4 h-4 ml-1 fill-black" />
                </>
              ) : (
                <>
                  START SPARRING <Swords className="w-4 h-4 ml-1" />
                </>
              )}
            </NeonButton>

            {status?.mode === 'free' && (
              <Link
                href="/subscription"
                className="text-center text-[10px] font-black text-primary uppercase tracking-widest"
              >
                Skip ads — subscribe for daily spars →
              </Link>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
