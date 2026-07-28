'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap, Flame, Trophy, ChevronRight, Video, CalendarDays,
  Swords, Activity, BarChart3, Crown, Bell, Star,
} from 'lucide-react';
import HomeCta from './HomeCta';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const QUICK_ACTIONS = [
  { icon: Video, label: 'AI Analysis' },
  { icon: CalendarDays, label: 'Planner' },
  { icon: Swords, label: 'Guru' },
  { icon: Activity, label: 'Reflex' },
  { icon: BarChart3, label: 'Analytics' },
];

const LEADERBOARD = [
  { rank: '🥇', name: 'Ishaan R.' },
  { rank: '🥈', name: 'Marcus T.' },
  { rank: '🥉', name: 'Priya K.' },
];

export default function HomeContent() {
  return (
    <div className="relative min-h-screen bg-[#08080A] text-white font-sans overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full bg-primary/10 blur-[120px]"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 -right-40 w-[380px] h-[380px] rounded-full bg-red-600/10 blur-[130px]"
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-primary/30"
            style={{
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              left: `${(i * 41) % 100}%`,
              top: `${(i * 29) % 100}%`,
            }}
            animate={{ opacity: [0.1, 0.5, 0.1], y: [0, -16, 0] }}
            transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      <header className="max-w-5xl mx-auto flex items-center justify-between px-5 sm:px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-black tracking-[3px] uppercase">Sparai</span>
        </div>
        <nav className="flex items-center gap-3 sm:gap-5 text-[9px] sm:text-xs font-bold uppercase tracking-widest text-white/50">
          <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/legal/security" className="hidden sm:inline hover:text-white transition-colors">Security</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-6">
        <motion.section
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="py-10 sm:py-16 flex flex-col items-start gap-5"
        >
          <span className="text-[10px] font-black tracking-[3px] text-primary uppercase flex items-center gap-1.5">
            <Star className="w-3 h-3" /> Your Fighter Command Center
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Sparai is your <span className="text-primary">AI boxing coach.</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl font-medium">
            One app for your training program, live form analysis, reflex drills,
            streaks, and rank — built to feel like a premium sports command center,
            not a to-do list.
          </p>
          <div className="w-full sm:w-auto">
            <HomeCta />
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="pb-6"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-4">
            What opens when you log in
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <motion.div
              whileTap={{ scale: 0.97, rotate: -0.5 }}
              className="col-span-2 relative rounded-[22px] p-5 bg-white/[0.04] border border-white/10 backdrop-blur-xl overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                    <Flame className="w-3.5 h-3.5" /> 12 Day Streak
                  </div>
                  <p className="text-white/50 text-xs font-semibold">3 AI analyses left today</p>
                  <p className="text-white/50 text-xs font-semibold">2 planner runs left this week</p>
                </div>
                <div className="relative w-16 h-16 shrink-0">
                  <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                    <circle cx="32" cy="32" r="27" strokeWidth="6" className="stroke-white/10" fill="none" />
                    <motion.circle
                      cx="32" cy="32" r="27" strokeWidth="6" fill="none"
                      strokeLinecap="round"
                      className="stroke-primary"
                      strokeDasharray={2 * Math.PI * 27}
                      initial={{ strokeDashoffset: 2 * Math.PI * 27 }}
                      whileInView={{ strokeDashoffset: 2 * Math.PI * 27 * 0.28 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black">72%</span>
                </div>
              </div>
            </motion.div>

            <div className="col-span-2 flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
                <motion.div
                  key={label}
                  whileTap={{ scale: 0.9 }}
                  className="shrink-0 w-[76px] flex flex-col items-center gap-1.5 rounded-2xl py-3 bg-white/[0.04] border border-white/10"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-white/60 text-center leading-tight">{label}</span>
                </motion.div>
              ))}
            </div>

            <div className="rounded-[22px] p-4 bg-white/[0.04] border border-white/10 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
                <Trophy className="w-3.5 h-3.5 text-primary" /> Leaderboard
              </div>
              {LEADERBOARD.map((f) => (
                <div key={f.name} className="flex items-center gap-2 text-xs font-semibold text-white/80">
                  <span>{f.rank}</span> {f.name}
                </div>
              ))}
            </div>

            <div className="rounded-[22px] p-4 bg-white/[0.04] border border-white/10 flex flex-col justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50">
                <Bell className="w-3.5 h-3.5 text-primary" /> AI Coach
              </div>
              <p className="text-xs font-semibold text-white/80 leading-snug">
                &ldquo;Your jab accuracy improved 8% this week — keep it up.&rdquo;
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-8 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" /> How Sparai works
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white/60 text-xs sm:text-sm font-medium leading-relaxed">
            <li className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><span className="text-primary font-black">1.</span> Verify your number with a one-time code — no passwords.</li>
            <li className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><span className="text-primary font-black">2.</span> Tell us your goals — your program is built around you.</li>
            <li className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><span className="text-primary font-black">3.</span> Train with guided sessions, AI form checks, reflex drills.</li>
            <li className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><span className="text-primary font-black">4.</span> Track streaks and rank on the leaderboard, weekly.</li>
          </ol>
        </motion.section>

        <footer className="py-8 border-t border-white/10 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-white/30 text-xs font-semibold">© {new Date().getFullYear()} Sparai. All rights reserved.</p>
            <Link
              href="/onboarding"
              className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-1 transition-colors"
            >
              Open the app <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span className="text-white/15">•</span>
            <Link href="/legal/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
            <span className="text-white/15">•</span>
            <Link href="/legal/security" className="hover:text-white transition-colors">Security</Link>
            <span className="text-white/15">•</span>
            <Link href="/legal/refund" className="hover:text-white transition-colors">Refund Policy</Link>
            <span className="text-white/15">•</span>
            <Link href="/legal/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}