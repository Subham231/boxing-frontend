'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap, Flame, Trophy, ChevronRight, Video, CalendarDays,
  Swords, Activity, BarChart3, Crown, Bell, Star, User,
  Play, GraduationCap, Sparkles,
} from 'lucide-react';
import HomeCta from './HomeCta';

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC marketing home page (sparai.in). Must stay a real, crawlable,
// non-gated page — no auth check, no live personal data. The "phone
// preview" below is a static, clearly-labeled DEMO MOCKUP of what the app
// looks like once logged in. It is not the real /dashboard, and nothing
// inside the actual app is touched by this file.
// ─────────────────────────────────────────────────────────────────────────

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

const WEEKLY_RINGS = [
  { label: 'Workouts', pct: 0.8, color: 'text-primary', stroke: 'stroke-primary' },
  { label: 'Consistency', pct: 0.65, color: 'text-red-400', stroke: 'stroke-red-400' },
  { label: 'Weekly Goal', pct: 0.9, color: 'text-white', stroke: 'stroke-white' },
];

const MINI_STATS = [
  { label: 'Weekly Activity', value: '+14%' },
  { label: 'Analysis Score', value: '87/100' },
  { label: 'Training Time', value: '4h 20m' },
  { label: 'Punch Trend', value: '↑ Sharper' },
];

function Ring({ pct, strokeClass }: { pct: number; strokeClass: string }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="w-12 h-12 -rotate-90">
      <circle cx="28" cy="28" r={r} strokeWidth="5" className="stroke-white/10" fill="none" />
      <motion.circle
        cx="28" cy="28" r={r} strokeWidth="5" fill="none" strokeLinecap="round"
        className={strokeClass}
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        whileInView={{ strokeDashoffset: c * (1 - pct) }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
      />
    </svg>
  );
}

export default function HomeContent() {
  return (
    <div className="relative min-h-screen bg-[#08080A] text-white font-sans overflow-x-hidden">
      {/* Animated ambient background */}
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

      {/* Nav */}
      <header className="max-w-5xl mx-auto flex items-center justify-between px-5 sm:px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black tracking-[3px] uppercase">Sparai</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 hidden sm:block">AI Boxing Coach App</span>
          </div>
        </div>
        <nav className="flex items-center gap-3 sm:gap-5 text-[9px] sm:text-xs font-bold uppercase tracking-widest text-white/50">
          <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/legal/security" className="hidden sm:inline hover:text-white transition-colors">Security</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-6">
        {/* Hero */}
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
            <strong className="text-white">Sparai</strong> is a mobile web app that gives boxers a
            personalized training program, real-time AI feedback on punch form using your
            phone&apos;s camera, reflex-speed drills, and weekly progress tracking with streaks
            and a leaderboard — all in one place.
          </p>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <HomeCta />
            <Link href="/legal/privacy" className="text-[11px] font-bold text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors">
              Read our Privacy Policy
            </Link>
          </div>
        </motion.section>

        {/* ── Phone-mockup dashboard preview (static demo data) ── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="pb-10"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
              What opens when you log in
            </h2>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 border border-white/10 rounded-full px-2 py-1">
              Preview
            </span>
          </div>

          {/* phone frame */}
          <div className="mx-auto max-w-sm rounded-[32px] border border-white/10 bg-black/60 backdrop-blur-xl p-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="rounded-[24px] bg-[#0A0A0C] border border-white/5 p-4 flex flex-col gap-3">

              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider leading-none mb-1">Good Evening</p>
                    <p className="text-xs font-black leading-none flex items-center gap-1">
                      Alex M. <Crown className="w-3 h-3 text-primary" />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary rounded-full px-2 py-1">Gold Rank</span>
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-white/60" />
                  </div>
                </div>
              </div>

              {/* Hero progress card */}
              <motion.div
                whileTap={{ scale: 0.97, rotate: -0.4 }}
                className="relative rounded-[20px] p-4 bg-white/[0.04] border border-white/10 overflow-hidden"
              >
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/10 blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary mb-1.5">
                      <Flame className="w-3.5 h-3.5" /> 12 Day Streak
                    </div>
                    <p className="text-white/50 text-[10px] font-semibold">3 AI analyses left today</p>
                    <p className="text-white/50 text-[10px] font-semibold">2 planner runs left this week</p>
                  </div>
                  <div className="relative w-14 h-14 shrink-0">
                    <Ring pct={0.72} strokeClass="stroke-primary" />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">72%</span>
                  </div>
                </div>
                <button className="mt-3 w-full h-9 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
                  Continue Training <ChevronRight size={12} />
                </button>
              </motion.div>

              {/* Today's tactical protocol */}
              <div className="rounded-[20px] p-4 bg-white/[0.04] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Today · Week 3, Day 4</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Intermediate</span>
                </div>
                <p className="text-sm font-black uppercase mb-1">Speed & Combo Circuit</p>
                <p className="text-[10px] text-white/40 font-semibold mb-2">Est. 32 min</p>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '45%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <button className="w-full h-9 rounded-xl bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
                  <Play size={11} className="fill-current" /> Start Workout
                </button>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
                  <motion.div
                    key={label}
                    whileTap={{ scale: 0.9 }}
                    className="shrink-0 w-[70px] flex flex-col items-center gap-1.5 rounded-2xl py-2.5 bg-white/[0.04] border border-white/10"
                  >
                    <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wide text-white/60 text-center leading-tight">{label}</span>
                  </motion.div>
                ))}
              </div>

              {/* AI Analysis + Reflex preview */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[20px] p-3 bg-white/[0.04] border border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">
                    <Video className="w-3.5 h-3.5 text-primary" /> AI Analysis
                  </div>
                  <p className="text-lg font-black text-primary leading-none">87<span className="text-[9px] text-white/40 font-bold"> /100</span></p>
                  <p className="text-[8px] font-bold uppercase tracking-wide text-white/40">Last session · +6% technique</p>
                </div>
                <div className="rounded-[20px] p-3 bg-white/[0.04] border border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">
                    <Activity className="w-3.5 h-3.5 text-primary" /> Reflex
                  </div>
                  <p className="text-lg font-black text-primary leading-none">214<span className="text-[9px] text-white/40 font-bold"> ms</span></p>
                  <p className="text-[8px] font-bold uppercase tracking-wide text-white/40">Best time · Rank #12 weekly</p>
                </div>
              </div>

              {/* Weekly progress rings */}
              <div className="rounded-[20px] p-4 bg-white/[0.04] border border-white/10 flex items-center justify-around">
                {WEEKLY_RINGS.map((ring) => (
                  <div key={ring.label} className="flex flex-col items-center gap-1.5">
                    <div className="relative w-12 h-12">
                      <Ring pct={ring.pct} strokeClass={ring.stroke} />
                      <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-black ${ring.color}`}>
                        {Math.round(ring.pct * 100)}%
                      </span>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wide text-white/40">{ring.label}</span>
                  </div>
                ))}
              </div>

              {/* AI coach */}
              <div className="rounded-[20px] p-4 bg-white/[0.04] border border-white/10 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">AI Coach</p>
                  <p className="text-[11px] font-semibold text-white/80 leading-snug">
                    &ldquo;Your jab accuracy improved 8% this week — one more session to hit Gold Rank.&rdquo;
                  </p>
                </div>
              </div>

              {/* Mini analytics strip */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                {MINI_STATS.map((s) => (
                  <div key={s.label} className="shrink-0 w-[100px] rounded-2xl p-3 bg-white/[0.04] border border-white/10">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-white/40 mb-1">{s.label}</p>
                    <p className="text-xs font-black text-primary">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Leaderboard + Guru row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[20px] p-3 bg-white/[0.04] border border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">
                    <Trophy className="w-3.5 h-3.5 text-primary" /> Leaderboard
                  </div>
                  {LEADERBOARD.map((f) => (
                    <div key={f.name} className="flex items-center gap-1.5 text-[10px] font-semibold text-white/80">
                      <span>{f.rank}</span> {f.name}
                    </div>
                  ))}
                </div>
                <div className="rounded-[20px] p-3 bg-white/[0.04] border border-white/10 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/50">
                    <GraduationCap className="w-3.5 h-3.5 text-primary" /> Guru
                  </div>
                  <p className="text-[10px] font-semibold text-white/80 leading-snug">Slip & Counter Fundamentals</p>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-white/40">Beginner · 9 min</span>
                </div>
              </div>

              {/* Achievement */}
              <div className="rounded-[20px] p-4 bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-base">
                    🏅
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">Latest Badge</p>
                    <p className="text-[11px] font-bold text-white/80">7 Day Streak</p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">View All</span>
              </div>

              {/* Subscription card */}
              <div className="rounded-[20px] p-4 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Elite Plan</p>
                  <p className="text-[10px] text-white/50 font-semibold">18 days remaining · Unlimited usage</p>
                </div>
                <button className="h-8 px-3 rounded-xl bg-primary text-black text-[9px] font-black uppercase tracking-widest">
                  Manage
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Data transparency — required for Google OAuth verification */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-8 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2">
            What data Sparai uses, and why
          </h2>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-4 max-w-2xl">
            We only ask for what&apos;s needed to run the app. Here&apos;s exactly what we collect
            and what it&apos;s used for — full detail is in our{' '}
            <Link href="/legal/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary mb-1.5">Phone Number</p>
              <p className="text-[11px] text-white/60 font-medium leading-relaxed">Used only to verify your identity via one-time code (Firebase Phone Auth). No password is ever created or stored.</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary mb-1.5">Training Data</p>
              <p className="text-[11px] text-white/60 font-medium leading-relaxed">Your goals, experience level, and progress are used to personalize your training program and track streaks.</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary mb-1.5">Camera (Optional)</p>
              <p className="text-[11px] text-white/60 font-medium leading-relaxed">Used only during an active AI Form Analysis session to check your technique. Never recorded without your action.</p>
            </div>
          </div>
        </motion.section>

        {/* How it works — condensed */}
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