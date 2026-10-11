'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FighterAvatar, FighterMeta, type FighterCardData } from './FighterBadge';

/**
 * Pre-match introduction. Shows ONLY name, picture, streak rank and plan for
 * each fighter, then a synchronized 3-2-1 countdown that ends exactly at
 * `startAtMs` (the shared start instant agreed by both devices).
 */
export default function SparIntro({
  you,
  opponent,
  startAtMs,
  statusLine,
  onFinished,
}: {
  you: FighterCardData | null;
  opponent: FighterCardData | null;
  /** Local-clock timestamp the fight starts at; null while still linking up. */
  startAtMs: number | null;
  statusLine: string;
  onFinished: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const finishedRef = useRef(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(t);
  }, []);

  const remaining = startAtMs === null ? null : startAtMs - now;

  useEffect(() => {
    if (remaining !== null && remaining <= -700 && !finishedRef.current) {
      finishedRef.current = true;
      onFinished();
    }
  }, [remaining, onFinished]);

  let center: React.ReactNode;
  if (remaining === null) {
    center = (
      <motion.div key="link" initial={{ opacity: 0 }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.6 }} className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">
        {statusLine || 'Linking up…'}
      </motion.div>
    );
  } else if (remaining > 3000) {
    center = (
      <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] font-black uppercase tracking-[0.35em] text-primary">
        Get ready
      </motion.div>
    );
  } else if (remaining > 0) {
    const n = Math.ceil(remaining / 1000);
    center = (
      <motion.div
        key={n}
        initial={{ scale: 2.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="text-7xl font-black italic text-primary drop-shadow-[0_0_24px_rgba(226,255,59,0.7)]"
      >
        {n}
      </motion.div>
    );
  } else {
    center = (
      <motion.div
        key="fight"
        initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
        animate={{ scale: 1.1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        className="text-6xl font-black italic uppercase tracking-tight text-white drop-shadow-[0_0_30px_rgba(255,80,60,0.8)]"
      >
        FIGHT!
      </motion.div>
    );
  }

  const fighterPanel = (card: FighterCardData | null, side: 'left' | 'right') => {
    const fromX = side === 'left' ? -160 : 160;
    const color = side === 'left' ? '#e2ff3b' : '#ff4d3d';
    return (
      <motion.div
        initial={{ x: fromX, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16, delay: side === 'left' ? 0.15 : 0.35 }}
        className="flex flex-1 flex-col items-center gap-3 min-w-0"
      >
        {card ? (
          <>
            <FighterAvatar card={card} size={104} ring={color} />
            <div className="max-w-full truncate text-center text-xl font-black uppercase italic tracking-tight text-white">
              {card.name}
            </div>
            <FighterMeta card={card} />
          </>
        ) : (
          <div className="h-[104px] w-[104px] animate-pulse rounded-full bg-white/10" />
        )}
        <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color }}>
          {side === 'left' ? 'You' : 'Opponent'}
        </span>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-[#050706] px-4"
      initial={{ opacity: 1 }}
      animate={{ opacity: remaining !== null && remaining <= -300 ? 0 : 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* split-colour glow + moving grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_40%,rgba(226,255,59,0.16),transparent_45%),radial-gradient(circle_at_85%_60%,rgba(255,77,61,0.18),transparent_45%)]" />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]"
        animate={{ backgroundPosition: ['0px 0px', '44px 44px'] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-gradient-to-b from-transparent via-white/40 to-transparent"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.6 }}
      />

      <div className="relative z-10 mb-8 text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Live Spar · Round 1</div>

      <div className="relative z-10 flex w-full max-w-[560px] items-start gap-2">
        {fighterPanel(you, 'left')}
        <motion.div
          initial={{ scale: 3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.55 }}
          className="mt-8 shrink-0 text-4xl font-black italic text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.45)]"
        >
          VS
        </motion.div>
        {fighterPanel(opponent, 'right')}
      </div>

      <div className="relative z-10 mt-14 flex h-24 items-center justify-center">{center}</div>
    </motion.div>
  );
}
