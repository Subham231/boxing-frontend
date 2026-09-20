'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Check } from 'lucide-react';

const HOLD_DURATION_MS = 2700;

interface FingerprintCeremonyProps {
  onConfirmed: () => void;
}

export default function FingerprintCeremony({ onConfirmed }: FingerprintCeremonyProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const firedRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setHolding(false);
    if (!firedRef.current) setProgress(0);
  }, []);

  const tick = useCallback(
    (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setProgress(pct);

      if (pct >= 100) {
        if (!firedRef.current) {
          firedRef.current = true;
          setDone(true);
          setHolding(false);
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(80);
          }
          setTimeout(() => onConfirmed(), 650);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [onConfirmed]
  );

  const start = useCallback(() => {
    if (firedRef.current) return;
    setHolding(true);
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const size = 190;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[85vh] gap-10 overflow-hidden select-none">
      {/* Ambient particles, accelerate while holding */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 22 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-primary/40"
            style={{ width: 2, height: 2, left: `${(i * 31) % 100}%`, top: `${(i * 47) % 100}%` }}
            animate={{ opacity: [0.1, 0.6, 0.1], y: [0, -18, 0] }}
            transition={{ duration: holding ? 1.2 : 3.5, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center">
        <h1 className="text-2xl font-black italic uppercase text-white leading-tight">Everything is Ready</h1>
        <p className="text-white/50 text-xs font-semibold mt-2 max-w-xs mx-auto leading-relaxed">
          We&apos;ve analyzed your goals, experience, training schedule, equipment, and preferences. Now it&apos;s
          time to create your personalized Tactical Protocol.
        </p>
      </div>

      <div
        className="relative z-10 cursor-pointer"
        style={{ width: size, height: size }}
        onMouseDown={start}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchEnd={stop}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10 blur-2xl"
          animate={{ opacity: holding ? [0.3, 0.7, 0.3] : 0.15, scale: holding ? [1, 1.15, 1] : 1 }}
          transition={{ duration: 1, repeat: holding ? Infinity : 0 }}
        />
        <svg width={size} height={size} className="-rotate-90 relative z-10">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--primary)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (progress / 100) * c}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-8 h-8 text-black" />
              </motion.div>
            ) : (
              <motion.div
                key="print"
                animate={holding ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 0.6, repeat: holding ? Infinity : 0 }}
              >
                <Fingerprint className={`w-16 h-16 ${holding ? 'text-primary' : 'text-white/40'}`} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="relative z-10 text-[10px] font-black text-white/30 uppercase tracking-[3px]">
        {done ? 'Confirmed' : holding ? 'Hold...' : 'Press & Hold to Generate'}
      </p>
    </div>
  );
}
