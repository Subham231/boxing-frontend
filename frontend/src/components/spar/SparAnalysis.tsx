'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, Zap, Target, Gauge, Activity } from 'lucide-react';

export interface SparResultData {
  score?: number | null;
  accuracy?: number | null;
  reflexScore?: number | null;
  avgPower?: number | null;
  stability?: number | null;
  avgForm?: number | null;
  avgReactionMs?: number | null;
  hits?: number | null;
  misses?: number | null;
  commandsResponded?: number | null;
  perCommand?: Array<{ index: number; command: string; hit: boolean; reactionMs: number | null; power?: number }>;
}

type MeritKey = 'accuracy' | 'reflexScore' | 'avgPower' | 'stability';
const MERITS: Array<{ key: MeritKey; label: string; icon: React.ElementType; tip: string }> = [
  { key: 'accuracy', label: 'Accuracy', icon: Target, tip: 'Land every called punch cleanly — slow down a touch and finish each one.' },
  { key: 'reflexScore', label: 'Reflex', icon: Zap, tip: 'React the instant you hear the call. Stay light on your feet with a relaxed guard.' },
  { key: 'avgPower', label: 'Power', icon: Gauge, tip: 'Rotate hips and torso through the punch and snap to full extension.' },
  { key: 'stability', label: 'Stability', icon: Activity, tip: 'Repeat the same clean technique every time — consistency beats one big shot.' },
];

function MeritBar({ label, icon: Icon, you, them, delay }: { label: string; icon: React.ElementType; you: number | null | undefined; them: number | null | undefined; delay: number }) {
  const y = you ?? null;
  const t = them ?? null;
  const youLeads = y != null && t != null && y >= t;
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/60">
          <Icon className="h-3.5 w-3.5 text-primary" /> {label}
        </span>
        <span className="text-xl font-black text-white">{y ?? '—'}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(100, y ?? 0)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay }}
        />
      </div>
      {t != null && (
        <div className="mt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
          <span className="text-white/35">Opponent {t}</span>
          <span className={youLeads ? 'text-emerald-400' : 'text-red-400'}>
            {y == null ? '' : youLeads ? `+${Math.round(y - t)} ahead` : `${Math.round(t - y)} behind`}
          </span>
        </div>
      )}
    </div>
  );
}

export function PaidAnalysis({ you, opponent }: { you: SparResultData; opponent: SparResultData | null }) {
  const available = MERITS.filter((m) => you[m.key] != null);
  const weakest = available.length ? available.reduce((a, b) => ((you[a.key] as number) <= (you[b.key] as number) ? a : b)) : null;
  const strongest = available.length ? available.reduce((a, b) => ((you[a.key] as number) >= (you[b.key] as number) ? a : b)) : null;
  const total = you.commandsResponded ?? ((you.hits ?? 0) + (you.misses ?? 0));
  const reps = (you.perCommand || []).slice().sort((a, b) => a.index - b.index);
  const bestReaction = reps.filter((r) => r.hit && r.reactionMs != null).reduce<number | null>((m, r) => (m === null || (r.reactionMs as number) < m ? (r.reactionMs as number) : m), null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-primary">AI Vision Report</span>
          <h2 className="text-2xl font-black italic uppercase leading-none text-white">Your Analysis</h2>
        </div>
        <div className="text-right">
          <span className="block text-[8px] font-black uppercase tracking-widest text-white/40">Overall</span>
          <span className="text-4xl font-black italic leading-none text-primary">{you.score ?? '—'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MERITS.map((m, i) => (
          <MeritBar key={m.key} label={m.label} icon={m.icon} you={you[m.key] as number | null | undefined} them={opponent ? (opponent[m.key] as number | null | undefined) : null} delay={0.1 * i} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          ['Landed', you.hits != null ? `${you.hits}/${total || '—'}` : '—'],
          ['Avg reaction', you.avgReactionMs != null ? `${Math.round(you.avgReactionMs)}ms` : '—'],
          ['Best reaction', bestReaction != null ? `${bestReaction}ms` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
            <span className="block text-[8px] font-black uppercase tracking-widest text-white/40">{label}</span>
            <span className="text-lg font-black text-white">{value}</span>
          </div>
        ))}
      </div>

      {reps.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/50">Punch by punch</span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {reps.map((r) => (
              <div
                key={r.index}
                className={`rounded-lg border px-2 py-1.5 text-center ${r.hit ? 'border-emerald-400/40 bg-emerald-400/[0.07]' : 'border-red-400/30 bg-red-400/[0.06]'}`}
              >
                <span className="block truncate text-[9px] font-black uppercase text-white/80">{r.command}</span>
                <span className={`text-[9px] font-bold ${r.hit ? 'text-emerald-300' : 'text-red-300'}`}>
                  {r.hit ? `${r.reactionMs != null ? `${r.reactionMs}ms` : 'Hit'}${r.power != null ? ` · ${r.power}p` : ''}` : 'Missed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {strongest && weakest && (
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Coach takeaway
          </span>
          <p className="text-sm font-semibold leading-relaxed text-white/85">
            Your best merit was <b>{strongest.label}</b> ({you[strongest.key]}). Work on <b>{weakest.label}</b> ({you[weakest.key]}) next: {weakest.tip}
          </p>
        </div>
      )}
    </div>
  );
}

/** Free fighters see the shape of the report, blurred, with no real numbers. */
export function LockedAnalysis({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-primary">AI Vision Report</span>
        <h2 className="text-2xl font-black italic uppercase leading-none text-white">Your Analysis</h2>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-4">
        <div className="pointer-events-none select-none blur-[7px] opacity-70" aria-hidden>
          <div className="grid grid-cols-2 gap-3">
            {MERITS.map((m, i) => (
              <div key={m.key} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{m.label}</span>
                  <span className="text-xl font-black text-white">••</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${55 + i * 9}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-2xl border border-white/8 bg-white/[0.04]" />
            ))}
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-black/30 via-black/60 to-black/80 px-5 text-center">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/60 bg-primary/10 shadow-[0_0_30px_rgba(226,255,59,0.3)]"
          >
            <Lock className="h-6 w-6 text-primary" />
          </motion.div>
          <div className="text-lg font-black uppercase italic text-white">Your analysis is locked</div>
          <p className="max-w-[270px] text-[12px] font-semibold leading-relaxed text-white/60">
            See exactly why you won or lost: accuracy, reflex, power, stability, punch-by-punch breakdown and a coach takeaway.
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-1 rounded-2xl bg-primary px-6 py-3 text-[12px] font-black uppercase tracking-widest text-black shadow-[0_0_24px_rgba(226,255,59,0.4)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Unlock my analysis
          </button>
        </div>
      </div>
    </div>
  );
}
