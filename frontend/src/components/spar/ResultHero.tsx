'use client';

import React, { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { FighterAvatar, FighterMeta, type FighterCardData } from './FighterBadge';

const CONFETTI_COLORS = ['#e2ff3b', '#ffd700', '#ff4d3d', '#00e5ff', '#d040ff', '#ffffff'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        dur: 2.6 + Math.random() * 2.2,
        size: 6 + Math.random() * 8,
        rot: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        drift: (Math.random() - 0.5) * 120,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-[-20px] block rounded-[2px]"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.6, background: p.color }}
          initial={{ y: -30, rotate: p.rot, opacity: 1 }}
          animate={{ y: '105vh', x: p.drift, rotate: p.rot + 540, opacity: [1, 1, 0.8] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

function Rain() {
  const drops = useMemo(
    () => Array.from({ length: 38 }, (_, i) => ({ id: i, left: Math.random() * 100, delay: Math.random() * 2, dur: 0.9 + Math.random() * 0.9, h: 14 + Math.random() * 22 })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {drops.map((d) => (
        <motion.span
          key={d.id}
          className="absolute top-[-40px] block w-px bg-gradient-to-b from-transparent to-sky-300/40"
          style={{ left: `${d.left}%`, height: d.h }}
          animate={{ y: '105vh' }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

function ScoreChip({ label, value, highlight, align }: { label: string; value: number | null; highlight: boolean; align: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col ${align === 'left' ? 'items-start' : 'items-end'}`}>
      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/40">{label}</span>
      <span className={`text-4xl font-black italic leading-none ${highlight ? 'text-white' : 'text-white/45'}`}>{value ?? '—'}</span>
    </div>
  );
}

export default function ResultHero({
  won,
  you,
  opponent,
  yourScore,
  opponentScore,
  paidMatch,
}: {
  won: boolean;
  you: FighterCardData | null;
  opponent: FighterCardData | null;
  yourScore: number | null;
  opponentScore: number | null;
  paidMatch: boolean;
}) {
  const reduce = useReducedMotion();
  const margin = yourScore != null && opponentScore != null ? Math.abs(Math.round((yourScore - opponentScore) * 10) / 10) : null;

  useEffect(() => {
    try {
      navigator.vibrate?.(won ? [60, 40, 60, 40, 160] : [220]);
    } catch { /* optional */ }
  }, [won]);

  const accent = won ? '#e2ff3b' : '#7aa7d6';

  return (
    <section
      className={`relative flex min-h-[78svh] flex-col items-center justify-center overflow-hidden px-5 pb-10 pt-16 text-center ${
        won ? 'bg-[#070906]' : 'bg-[#06080c]'
      }`}
    >
      {/* atmosphere */}
      {won ? (
        <>
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[34%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(226,255,59,0.35), rgba(255,200,0,0.12) 45%, transparent 70%)' }}
            animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
          />
          {!reduce && <Confetti />}
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(90,120,170,0.18),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
          {!reduce && <Rain />}
        </>
      )}

      {/* trophy */}
      <motion.div
        initial={won ? { scale: 0, rotate: -25, y: 40 } : { scale: 0.9, y: -60, opacity: 0 }}
        animate={won ? { scale: 1, rotate: 0, y: 0 } : { scale: 1, y: 0, opacity: 1, rotate: [0, -6, 4, -3, 0] }}
        transition={won ? { type: 'spring', stiffness: 220, damping: 11 } : { duration: 1.4, ease: 'easeOut' }}
        className="relative z-10"
      >
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full border-2"
          style={{
            borderColor: `${accent}99`,
            background: won ? 'radial-gradient(circle, rgba(226,255,59,0.25), rgba(0,0,0,0.4))' : 'radial-gradient(circle, rgba(122,167,214,0.14), rgba(0,0,0,0.5))',
            boxShadow: won ? '0 0 50px rgba(226,255,59,0.55)' : '0 0 24px rgba(122,167,214,0.2)',
          }}
        >
          <Trophy className={`h-12 w-12 ${won ? 'text-primary' : 'text-sky-200/45'}`} style={won ? undefined : { transform: 'rotate(-14deg) translateY(2px)' }} />
        </div>
      </motion.div>

      {/* headline */}
      <motion.h1
        initial={won ? { scale: 2.4, opacity: 0 } : { y: -24, opacity: 0 }}
        animate={won ? { scale: 1, opacity: 1 } : { y: 0, opacity: 1 }}
        transition={won ? { type: 'spring', stiffness: 260, damping: 15, delay: 0.25 } : { duration: 1.1, delay: 0.5 }}
        className={`relative z-10 mt-6 text-6xl font-black italic uppercase leading-none tracking-tight ${
          won
            ? 'bg-gradient-to-b from-white via-primary to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(226,255,59,0.5)]'
            : 'text-sky-100/60'
        }`}
      >
        {won ? 'Victory' : 'Defeat'}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: won ? 0.7 : 1.1 }}
        className={`relative z-10 mt-3 max-w-[300px] text-sm font-semibold ${won ? 'text-white/80' : 'text-sky-100/45'}`}
      >
        {won
          ? margin != null && margin > 0
            ? `You out-fought them by ${margin} points. Crowd on its feet!`
            : 'You took the round. Crowd on its feet!'
          : margin != null && margin > 0
            ? `Lost by ${margin} points. It stings — now go earn it back.`
            : 'It was that close. Run it back.'}
      </motion.p>

      {/* versus strip */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: won ? 0.95 : 1.4 }}
        className="relative z-10 mt-8 w-full max-w-[420px] rounded-3xl border border-white/10 bg-black/45 p-4 backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            {you && <FighterAvatar card={you} size={56} ring={won ? '#e2ff3b' : '#7aa7d6'} />}
            <div className="max-w-full truncate text-sm font-black uppercase italic text-white">{you?.name || 'YOU'}</div>
            <ScoreChip label="Your score" value={yourScore} highlight={won} align="left" />
          </div>
          <div className="text-xl font-black italic text-white/30">VS</div>
          <div className="flex min-w-0 flex-1 flex-col items-end gap-2">
            {opponent && <FighterAvatar card={opponent} size={56} ring={won ? '#ff4d3d55' : '#ff4d3d'} />}
            <div className="max-w-full truncate text-sm font-black uppercase italic text-white">{opponent?.name || 'OPPONENT'}</div>
            <ScoreChip label="Their score" value={opponentScore} highlight={!won} align="right" />
          </div>
        </div>
        {opponent && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <FighterMeta card={opponent} align="right" />
          </div>
        )}
      </motion.div>

      <div className="relative z-10 mt-5 text-[9px] font-black uppercase tracking-[0.25em] text-white/35">
        {paidMatch ? 'Counted on the leaderboard' : 'Free spar — not on the leaderboard'}
      </div>

      <motion.div
        className="absolute bottom-3 z-10 text-[9px] font-black uppercase tracking-[0.3em] text-white/30"
        animate={reduce ? undefined : { y: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
      >
        Scroll for your analysis ↓
      </motion.div>
    </section>
  );
}
