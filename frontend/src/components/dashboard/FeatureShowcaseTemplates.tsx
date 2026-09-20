'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Swords, 
  Brain, 
  Calendar, 
  ArrowRight, 
  Sparkles,
} from 'lucide-react';
import { 
} from '@/components/ui/NeonIcons';

type TemplateKey = 'vision' | 'spar' | 'guru' | 'planner';

interface TemplateConfig {
  id: TemplateKey;
  title: string;
  badge: string;
  badgeColor: string;
  subtitle: string;
  href: string;
  accentColor: string;
  buttonText: string;
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: 'vision',
    title: 'AI Video Analysis Engine',
    badge: 'LIVE COMPUTER VISION',
    badgeColor: 'text-[#E2FF3B] bg-[#E2FF3B]/10 border-[#E2FF3B]/30',
    subtitle: 'Track punch velocity, elbow angles, guard discipline & slip timing in real-time.',
    href: '/vision',
    accentColor: '#E2FF3B',
    buttonText: 'LAUNCH VISION HUD',
  },
  {
    id: 'spar',
    title: 'Live 1v1 Real-Time Sparring',
    badge: 'FREE MULTIPLAYER',
    badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    subtitle: 'WebRTC audio-coached matchmaking with 40-70 Hard combos & Weekly Trophy leaderboards.',
    href: '/spar',
    accentColor: '#F59E0B',
    buttonText: 'ENTER SPARRING ARENA',
  },
  {
    id: 'guru',
    title: 'AI Tactical Guru Coach',
    badge: 'TACTICAL IQ',
    badgeColor: 'text-pink-400 bg-pink-400/10 border-pink-400/30',
    subtitle: 'Deep technical breakdowns: shoulder roll, counter-punching & peek-a-boo footwork.',
    href: '/guru',
    accentColor: '#EC4899',
    buttonText: 'CONSULT GURU',
  },
  {
    id: 'planner',
    title: 'Adaptive Weekly Roadmap',
    badge: 'CUSTOM PROTOCOL',
    badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    subtitle: 'Personalized 7-day training cycles tailored to your peak stamina & experience level.',
    href: '/planner',
    accentColor: '#A855F7',
    buttonText: 'BUILD WORKOUT PLAN',
  },
];

export function FeatureShowcaseTemplates() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>('vision');

  const current = TEMPLATES.find((t) => t.id === activeTemplate) || TEMPLATES[0];

  return (
    <div className="flex flex-col gap-3 my-3">
      {/* Header with Title & Live Pulse */}
      <div className="flex items-center justify-between px-1 select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black tracking-[3px] text-white/50 uppercase">
            PROTOCOL SHOWCASE
          </span>
        </div>
        <span className="text-[9px] font-black text-primary tracking-wider uppercase">
          LIVE DEMOS
        </span>
      </div>

      {/* Template Selector Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 select-none">
        {TEMPLATES.map((t) => {
          const isActive = t.id === activeTemplate;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTemplate(t.id)}
              className={`py-2 px-1 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${
                isActive
                  ? 'bg-white/10 text-white shadow-[0_0_12px_rgba(226,255,59,0.15)] border border-white/20'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {t.id === 'vision' && <Camera className={`w-3.5 h-3.5 ${isActive ? 'text-[#E2FF3B]' : ''}`} />}
              {t.id === 'spar' && <Swords className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : ''}`} />}
              {t.id === 'guru' && <Brain className={`w-3.5 h-3.5 ${isActive ? 'text-pink-400' : ''}`} />}
              {t.id === 'planner' && <Calendar className={`w-3.5 h-3.5 ${isActive ? 'text-purple-400' : ''}`} />}
              <span className="truncate">{t.id}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Feature Visual Preview Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#10140d] via-[#090b07] to-[#050604] p-4 shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3.5"
          >
            {/* Top Row: Badge & Action */}
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase ${current.badgeColor}`}>
                {current.badge}
              </span>
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                TEMPLATES V2.4
              </span>
            </div>

            {/* Template Specific Live Simulation Canvas */}
            {current.id === 'vision' && (
              <div className="relative h-44 rounded-2xl border border-primary/30 bg-[#060805] p-3 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_25px_rgba(226,255,59,0.08)]">
                {/* HUD Grid Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#E2FF3B_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                {/* Top Telemetry */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5 bg-black/80 px-2 py-1 rounded-lg border border-primary/40">
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span className="text-[8px] font-mono font-bold text-primary">POSE TRACKING · 33 LMS</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-primary">28.4 m/s</div>
                    <div className="text-[7px] text-white/40 font-bold uppercase">Peak Strike Vel</div>
                  </div>
                </div>

                {/* Center Wireframe / Kinetic Pose Visualizer */}
                <div className="relative my-auto flex items-center justify-center">
                  <div className="relative w-40 h-20 flex items-center justify-center">
                    {/* Simulated Punch Arc */}
                    <svg className="w-full h-full" viewBox="0 0 160 80">
                      <path
                        d="M 20 60 Q 80 10 140 40"
                        fill="none"
                        stroke="#E2FF3B"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                        className="animate-pulse"
                      />
                      <circle cx="20" cy="60" r="4" fill="#E2FF3B" />
                      <circle cx="80" cy="25" r="4" fill="#E2FF3B" />
                      <circle cx="140" cy="40" r="6" fill="#E2FF3B" className="drop-shadow-[0_0_8px_#E2FF3B]" />
                      <text x="100" y="55" fill="#E2FF3B" fontSize="9" fontWeight="bold">STRIKE: LEAD HOOK</text>
                    </svg>
                  </div>
                </div>

                {/* Bottom Stats Footer */}
                <div className="grid grid-cols-3 gap-2 z-10">
                  <div className="bg-black/70 border border-white/10 rounded-xl p-1.5 text-center">
                    <div className="text-[8px] text-white/40 font-bold uppercase">Form Fidelity</div>
                    <div className="text-[11px] font-black text-white">96.8%</div>
                  </div>
                  <div className="bg-black/70 border border-white/10 rounded-xl p-1.5 text-center">
                    <div className="text-[8px] text-white/40 font-bold uppercase">Elbow Angle</div>
                    <div className="text-[11px] font-black text-primary">168° (FULL)</div>
                  </div>
                  <div className="bg-black/70 border border-white/10 rounded-xl p-1.5 text-center">
                    <div className="text-[8px] text-white/40 font-bold uppercase">Guard Hold</div>
                    <div className="text-[11px] font-black text-green-400">OPTIMAL</div>
                  </div>
                </div>
              </div>
            )}

            {current.id === 'spar' && (
              <div className="relative h-44 rounded-2xl border border-amber-500/30 bg-[#080603] p-3 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_25px_rgba(245,158,11,0.08)]">
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5 bg-black/80 px-2 py-1 rounded-lg border border-amber-500/40">
                    <Swords className="w-3 h-3 text-amber-400" />
                    <span className="text-[8px] font-mono font-bold text-amber-400">LIVE WEBRTC MATCH</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-primary text-black font-black text-[8px] tracking-wider">
                    HARD COACH
                  </span>
                </div>

                {/* Rapid Audio Coach Call Preview */}
                <div className="flex flex-col items-center justify-center my-auto text-center gap-1">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                    CURRENT CALLOUT (COMMAND #28/55)
                  </span>
                  <div className="text-xl font-black italic uppercase text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] tracking-wide">
                    JAB - CROSS - SLIP LEFT
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/90 border border-white/10 text-[9px] font-bold text-white/80">
                    <span>⏱ Reaction: 240ms</span>
                    <span className="text-primary font-black">+100 PTS</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 z-10">
                  <div className="bg-black/70 border border-white/10 rounded-xl p-1.5 flex items-center justify-between">
                    <span className="text-[8px] text-white/40 font-bold uppercase">YOU (P1)</span>
                    <span className="text-[11px] font-black text-primary">2,850 PTS</span>
                  </div>
                  <div className="bg-black/70 border border-white/10 rounded-xl p-1.5 flex items-center justify-between">
                    <span className="text-[8px] text-white/40 font-bold uppercase">OPPONENT (P2)</span>
                    <span className="text-[11px] font-black text-amber-400">2,620 PTS</span>
                  </div>
                </div>
              </div>
            )}

            {current.id === 'guru' && (
              <div className="relative h-44 rounded-2xl border border-pink-500/30 bg-[#080407] p-3 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_25px_rgba(236,72,153,0.08)]">
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5 bg-black/80 px-2 py-1 rounded-lg border border-pink-500/40">
                    <Brain className="w-3 h-3 text-pink-400" />
                    <span className="text-[8px] font-mono font-bold text-pink-400">TACTICAL MASTERCLASS</span>
                  </div>
                  <span className="text-[8px] font-black text-white/40 uppercase">TECHNIQUE #14</span>
                </div>

                <div className="flex flex-col gap-1.5 my-auto">
                  <div className="text-sm font-black italic uppercase text-white tracking-wide">
                    SHOULDER ROLL & PULL COUNTER
                  </div>
                  <p className="text-[10px] text-white/60 font-semibold leading-relaxed">
                    Tuck the chin into the lead shoulder. Deflect opponent&apos;s straight right and return with a razor-sharp counter cross.
                  </p>
                </div>

                <div className="flex items-center justify-between bg-black/70 border border-white/10 rounded-xl p-2 z-10">
                  <span className="text-[8px] font-black text-pink-400 uppercase">DEFENSE LEVEL: ELITE</span>
                  <span className="text-[8px] font-bold text-white/50 uppercase">3 DRILLS INCLUDED</span>
                </div>
              </div>
            )}

            {current.id === 'planner' && (
              <div className="relative h-44 rounded-2xl border border-purple-500/30 bg-[#070408] p-3 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_25px_rgba(168,85,247,0.08)]">
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5 bg-black/80 px-2 py-1 rounded-lg border border-purple-500/40">
                    <Calendar className="w-3 h-3 text-purple-400" />
                    <span className="text-[8px] font-mono font-bold text-purple-400">7-DAY MICROCYCLE</span>
                  </div>
                  <span className="text-[8px] font-black text-primary uppercase">PEAK: MORNING</span>
                </div>

                {/* Micro 7-day visual calendar */}
                <div className="grid grid-cols-7 gap-1 my-auto">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <div
                      key={i}
                      className={`p-1 rounded-xl text-center border ${
                        i === 3
                          ? 'border-purple-400 bg-purple-500/20 text-white font-black'
                          : 'border-white/5 bg-black/40 text-white/40'
                      }`}
                    >
                      <div className="text-[7px] font-bold">{day}</div>
                      <div className="text-[9px] font-black">{i === 3 ? 'TODAY' : `D${i + 1}`}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-black/70 border border-white/10 rounded-xl p-2 z-10">
                  <span className="text-[9px] font-black text-white uppercase">Today: Power Punch Speed & Core</span>
                  <span className="text-[8px] font-black text-purple-400 uppercase">35 MINS</span>
                </div>
              </div>
            )}

            {/* Description & Action Button */}
            <div>
              <h3 className="text-base font-black italic uppercase text-white tracking-wide">
                {current.title}
              </h3>
              <p className="text-xs text-white/50 font-semibold mt-0.5">
                {current.subtitle}
              </p>
            </div>

            <Link href={current.href} className="w-full">
              <button
                type="button"
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-primary via-[#D4FF00] to-primary hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-black font-black text-[11px] italic uppercase tracking-wider shadow-[0_0_20px_rgba(226,255,59,0.3)]"
              >
                {current.buttonText} <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
