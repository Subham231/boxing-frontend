'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Flame, Trophy, ChevronRight, Video, CalendarDays,
  Swords, Activity, BarChart3, Crown, Bell, Star, User,
  Play, GraduationCap, Sparkles, ShieldCheck, Check, Lock, Gift,
} from 'lucide-react';
import HomeCta from './HomeCta';
import { SparFreePromoModal } from '@/components/ui/SparFreePromoModal';
import { PwaInstallModal } from '@/components/ui/PwaInstallModal';
import { useFirebaseUser } from '@/lib/useFirebaseUser';

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

// Static demo content for the tabbed "Feature Deep Dive" section — every
// feature gets its own dedicated tab per the spec, but data here is
// illustrative/fixed since this is the public marketing page (no login).
const DEEP_DIVE_TABS = [
  {
    id: 'analysis', label: 'AI Analysis', icon: Video,
    stats: [
      { k: 'Remaining Today', v: '3 of 5' },
      { k: 'Last Score', v: '87 / 100' },
      { k: 'Accuracy', v: '91%' },
      { k: 'Technique', v: '83%' },
      { k: 'Weekly Improvement', v: '+6%' },
    ],
    ctas: ['Analyze Video', 'View Previous Sessions'],
  },
  {
    id: 'planner', label: 'Planner', icon: CalendarDays,
    stats: [
      { k: 'Protocol', v: 'Speed & Power' },
      { k: 'Week / Day', v: 'Week 3 · Day 4' },
      { k: 'Difficulty', v: 'Intermediate' },
      { k: 'Weekly Progress', v: '4 of 6 sessions' },
      { k: 'Generations Left', v: '2 this week' },
    ],
    ctas: ['Continue Workout', 'Open Full Planner'],
  },
  {
    id: 'grind', label: 'Daily Grind', icon: Flame,
    stats: [
      { k: "Today's Exercises", v: '6 total' },
      { k: 'Completed', v: '2 of 6' },
      { k: 'Est. Duration', v: '32 min' },
      { k: 'Rest Between Sets', v: '45 sec' },
    ],
    ctas: ["Start Today's Workout", 'View All Exercises'],
  },
  {
    id: 'guru', label: 'Guru', icon: GraduationCap,
    stats: [
      { k: 'Current Skill', v: 'Slip & Counter' },
      { k: 'Skill Progress', v: '64%' },
      { k: 'Skills Completed', v: '11 of 24' },
      { k: 'Recommended Next', v: 'Body Shot Setups' },
    ],
    ctas: ['Continue Learning', 'Browse Skills'],
  },
  {
    id: 'reflex', label: 'Reflex', icon: Activity,
    stats: [
      { k: 'Personal Best', v: '198 ms' },
      { k: 'Weekly Best', v: '214 ms' },
      { k: 'Weekly Rank', v: '#12' },
      { k: 'Games Played', v: '37' },
    ],
    ctas: ['Play Reflex', 'Weekly Leaderboard'],
  },
  {
    id: 'leaderboard', label: 'Leaderboard', icon: Trophy,
    stats: [
      { k: 'Fighter Rank', v: '#47' },
      { k: 'Reflex Rank', v: '#12' },
      { k: 'Combo Rank', v: '#83' },
      { k: 'Season', v: 'Season 4' },
    ],
    ctas: ['View Full Leaderboard'],
  },
  {
    id: 'analytics', label: 'Analytics', icon: BarChart3,
    stats: [
      { k: 'Weekly Activity', v: '+14%' },
      { k: 'Total Sessions', v: '58' },
      { k: 'Training Time', v: '4h 20m this week' },
      { k: 'Performance Score', v: '87 / 100' },
    ],
    ctas: ['Open Full Analytics'],
  },
  {
    id: 'subscription', label: 'Subscription', icon: Crown,
    stats: [
      { k: 'Current Plan', v: 'Elite (Yearly)' },
      { k: 'Days Remaining', v: '18' },
      { k: 'Daily AI Usage', v: 'Unlimited' },
      { k: 'Weekly Planner Usage', v: 'Unlimited' },
    ],
    ctas: ['Upgrade Subscription'],
  },
];

// One row per major app feature — icon-based "visual" card + written
// description, rendered one after another below the two previews above.
const FEATURE_SHOWCASE = [
  {
    id: 'analysis', icon: Video, image: '/images/promos/vision_hud.jpg', title: 'AI Video Analysis',
    description: 'Record a round on your phone and Sparai breaks down your form — punch accuracy, technique score, and exactly what to fix, with your score tracked session over session.',
    stat: { label: 'Last Session', value: '87/100', sub: '+6% technique' },
  },
  {
    id: 'planner', icon: CalendarDays, image: '/images/promos/guru_tactics.jpg', title: 'Tactical Planner',
    description: "A weekly training protocol built around your goals and experience level — today's workout, this week's roadmap, and recovery days all mapped out for you.",
    stat: { label: 'This Week', value: 'Day 4 of 6', sub: 'Week 3 · Intermediate' },
  },
  {
    id: 'grind', icon: Flame, image: '/images/promos/vision_hud.jpg', title: 'Daily Grind',
    description: "Every exercise for today broken into sets, reps, and rest time — check them off as you go and watch your completion bar fill in real time.",
    stat: { label: 'Today', value: '2 of 6 done', sub: '32 min estimated' },
  },
  {
    id: 'guru', icon: GraduationCap, image: '/images/promos/guru_tactics.jpg', title: 'Guru Skill Lessons',
    description: 'Bite-sized technique lessons — slips, counters, footwork, body shots — that unlock as you progress, with a clear path from beginner fundamentals to advanced combos.',
    stat: { label: 'Current Skill', value: '64% complete', sub: 'Slip & Counter' },
  },
  {
    id: 'reflex', icon: Activity, image: '/images/promos/spar_arena.jpg', title: 'Reflex Enhancer',
    description: 'Fast-paced reaction drills that sharpen how quickly you see and respond — your best time, weekly average, and rank against other fighters are all tracked automatically.',
    stat: { label: 'Personal Best', value: '198 ms', sub: 'Rank #12 this week' },
  },
  {
    id: 'leaderboard', icon: Trophy, image: '/images/promos/spar_arena.jpg', title: 'Leaderboards',
    description: 'Separate rankings for overall training, reflex speed, and combo mastery, updated live each week — see exactly where you stand and who to chase.',
    stat: { label: 'Fighter Rank', value: '#47', sub: 'Season 4' },
  },
  {
    id: 'analytics', icon: BarChart3, image: '/images/promos/vision_hud.jpg', title: 'Performance Analytics',
    description: "Weekly and monthly graphs of your training time, streaks, and analysis scores — so improvement isn't just a feeling, it's a number you can see move.",
    stat: { label: 'Performance Score', value: '87/100', sub: '+14% this week' },
  },
  {
    id: 'subscription-feature', icon: Crown, image: '/images/promos/guru_tactics.jpg', title: 'Elite Subscription',
    description: 'Unlock unlimited AI analyses, unlimited weekly planner regenerations, and premium Guru skills with an Elite membership — cancel anytime.',
    stat: { label: 'Elite Plan', value: 'Unlimited usage', sub: '18 days remaining' },
  },
];

// Public plan metadata; prices are fetched only after the server reports launch.
const PRICING_PLANS = [
  { 
    name: 'SparAI Monthly', 
    price: '', 
    originalPrice: '',
    discountTag: '51% OFF',
    period: '/ month', 
    features: ['1 AI Video Analysis / day', '1 Planner Generation / week', '1 Live Spar / day'] 
  },
  { 
    name: 'SparAI Pro', 
    price: '', 
    originalPrice: '',
    discountTag: '54% OFF',
    period: '/ month', 
    features: ['2 AI Video Analyses / day', '2 Planner Generations / week', '2 Live Spars / day'], 
    highlight: true 
  },
  { 
    name: 'SparAI Performance', 
    price: '', 
    originalPrice: '',
    discountTag: '59% OFF',
    period: '/ 3 months', 
    features: ['3 AI Video Analyses / day', '3 Planner Generations / week', '3 Live Spars / day'] 
  },
  {
    name: 'SparAI Elite 👑', 
    price: '', 
    originalPrice: '',
    discountTag: '60% OFF',
    period: '/ year', 
    highlight: true,
    features: ['Unlimited AI Video Analyses', 'Unlimited Planner Generations', 'Unlimited Live Spars', 'Premium Guru skills unlocked', 'Elite Member badge'],
  },
];

const SECURITY_POINTS = [
  { title: 'Phone-Only Sign-In', body: 'Firebase Phone Auth verifies you with a one-time code — Sparai never creates or stores a password.' },
  { title: 'Database & Encryption', body: 'Your profile and training data live in Supabase, encrypted at rest and in transit (TLS/SSL) between your device and our servers.' },
  { title: 'Payments via Razorpay', body: 'Subscription payments are handled by Razorpay, a PCI-DSS compliant processor — Sparai never sees or stores your card details.' },
];

const JOURNEY_STAGES = [
  { id: 'day1', label: 'Day 1', body: 'Onboarding builds your profile — goals, experience, equipment — and your first training session is generated around you.' },
  { id: 'week1', label: 'Week 1', body: 'Your first AI form analyses land. You start seeing concretely what to fix, not just a feeling that something\u2019s off.' },
  { id: 'month1', label: 'Month 1', body: 'Reflex times trend down, technique scores trend up, and a full month of streak and session data starts telling a clear story.' },
  { id: 'champion', label: 'Champion', body: 'Consistent training, tracked and adjusted week over week — the compounding result of training smarter, not just harder.' },
];

const JOURNEY_MILESTONES = ['Better Accuracy', 'Faster Reflexes', 'More Power', 'Better Technique', 'Higher Confidence'];

const AI_COACH_LINES = [
  'Your jab accuracy improved by 12%.',
  'Rotate your hips more on the cross.',
  'Keep your guard higher after combinations.',
  'You\u2019re improving faster than last week.',
];

const FIGHTER_TYPES = [
  { id: 'beginner', label: 'Beginner', body: 'Start with fundamentals — stance, guard, and basic combinations — with a plan that scales up as your technique score improves.' },
  { id: 'intermediate', label: 'Intermediate', body: 'Sharpen technique and combinations with tactical planning, form analysis, and reflex drills tuned to close specific gaps.' },
  { id: 'professional', label: 'Professional', body: 'Fine-tune power, accuracy, and consistency with detailed session-over-session analytics and unlimited AI analysis on Elite.' },
  { id: 'fitness', label: 'Fitness Boxing', body: 'Use the Daily Grind and reflex drills for a structured, trackable workout — no competitive goals required.' },
  { id: 'kickboxing', label: 'Kickboxing', body: 'Apply the same form-analysis and reflex training approach to kickboxing fundamentals and combinations.' },
  { id: 'boxing', label: 'Boxing', body: 'The core Sparai experience — AI form analysis, tactical planning, Guru lessons, and leaderboard ranking built around boxing.' },
];

const AI_PIPELINE = [
  { step: 'Upload Video', body: 'Record a round on your phone, right in the app.' },
  { step: 'AI Detects Body', body: 'Pose-detection locates your joints and limbs frame by frame.' },
  { step: 'Tracks Movement', body: 'Your motion is tracked across the full clip, punch by punch.' },
  { step: 'Measures Technique', body: 'Form, accuracy, and power are scored against good technique.' },
  { step: 'Generates Report', body: 'You get a session score and specific, concrete feedback.' },
  { step: 'Creates Training Plan', body: 'Your plan adjusts to reinforce whatever needs the most work.' },
];

// Honest, verifiable product facts — deliberately not invented usage/growth
// numbers (e.g. "5,000+ sessions"), since Sparai has no audited figures to
// back those claims yet.
const PRODUCT_FACTS = [
  { value: '33', label: 'Body Landmarks Tracked', sub: 'per frame, via pose detection' },
  { value: '6', label: 'Core Training Modules', sub: 'Analysis, Planner, Grind, Guru, Reflex, Analytics' },
  { value: '4', label: 'Subscription Tiers', sub: 'Monthly to Yearly Elite' },
  { value: '0', label: 'Passwords Required', sub: 'phone OTP sign-in only' },
];

const WHY_PEOPLE_STAY = [
  { title: 'Clarity, not guesswork', body: 'You stop wondering what you\u2019re doing wrong and start seeing it, session by session.' },
  { title: 'Reflexes that actually improve', body: 'Reaction-time drills are tracked, so faster hands aren\u2019t just a feeling — they\u2019re a number going down.' },
  { title: 'A plan that adapts to you', body: 'Your weekly plan reflects your actual level and progress, not a generic template.' },
  { title: 'Discipline that compounds', body: 'Streaks and weekly tracking turn a few good sessions into a consistent habit.' },
];

const FAQ_ITEMS = [
  { q: 'How accurate is Sparai\u2019s AI analysis?', a: 'Sparai uses pose-detection technology to track 33 body landmarks per frame, scoring your technique, accuracy, and power based on your recorded video. It\u2019s a training aid to help you spot patterns — not a certified coaching replacement.' },
  { q: 'Do I need boxing experience to start?', a: 'No. Onboarding asks about your experience level and builds your plan around it, whether you\u2019re a complete beginner or training competitively.' },
  { q: 'Can beginners use the AI Analysis feature?', a: 'Yes — it\u2019s designed to be useful at every level, from cleaning up basic stance and guard to refining advanced combinations.' },
  { q: 'How does the AI analysis actually work?', a: 'You record a short clip, Sparai\u2019s pose-detection model tracks your movement frame by frame, measures it against good technique, and returns a score with specific feedback.' },
  { q: 'Can I cancel my subscription anytime?', a: 'Yes. Subscriptions can be cancelled at any time from your account — see our Refund Policy for details on billing.' },
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

function DeepDiveTabs() {
  const [active, setActive] = useState(DEEP_DIVE_TABS[0].id);
  const tab = DEEP_DIVE_TABS.find((t) => t.id === active)!;

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      {/* Tab row */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 mb-4">
        {DEEP_DIVE_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                isActive ? 'bg-primary text-black' : 'bg-white/5 text-white/50 hover:text-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <motion.div
        key={tab.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {tab.stats.map((s) => (
            <div key={s.k} className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <p className="text-[8px] font-bold uppercase tracking-wide text-white/40 mb-1">{s.k}</p>
              <p className="text-xs font-black text-primary leading-tight">{s.v}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {tab.ctas.map((cta, i) => (
            <span
              key={cta}
              className={`text-[10px] font-black uppercase tracking-widest rounded-full px-4 py-2 ${
                i === 0 ? 'bg-primary text-black' : 'bg-white/10 text-white/70 border border-white/10'
              }`}
            >
              {cta}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function FeatureRow({ feature, reversed }: { feature: typeof FEATURE_SHOWCASE[number]; reversed: boolean }) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6 }}
      className={`flex flex-col ${reversed ? 'sm:flex-row-reverse' : 'sm:flex-row'} items-center gap-5 sm:gap-8 py-6 border-b border-white/5 last:border-b-0`}
    >
      {/* Visual */}
      <div className="w-full sm:w-[220px] shrink-0">
        <div className="relative overflow-hidden rounded-[22px] bg-white/[0.04] border border-white/10">
          <Image src={feature.image} alt="" width={440} height={280} className="h-32 w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="relative -mt-10 p-4 flex flex-col items-center text-center gap-2">
            <div className="w-11 h-11 rounded-2xl bg-black/80 border border-primary/30 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-black text-primary leading-none">{feature.stat.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{feature.stat.label}</p>
            <p className="text-[10px] font-semibold text-white/60">{feature.stat.sub}</p>
          </div>
        </div>
      </div>
      {/* Text */}
      <div className="flex-1">
        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2">{feature.title}</h3>
        <p className="text-white/60 text-sm leading-relaxed font-medium">{feature.description}</p>
      </div>
    </motion.div>
  );
}

function JourneyTimeline() {
  const [active, setActive] = useState(JOURNEY_STAGES[0].id);
  const stage = JOURNEY_STAGES.find((s) => s.id === active)!;
  return (
    <div>
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide pb-2">
        {JOURNEY_STAGES.map((s, i) => (
          <React.Fragment key={s.id}>
            <button
              onClick={() => setActive(s.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors ${
                active === s.id ? 'bg-primary text-black' : 'bg-white/5 text-white/50 hover:text-white/80'
              }`}
            >
              {s.label}
            </button>
            {i < JOURNEY_STAGES.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0" />}
          </React.Fragment>
        ))}
      </div>
      <motion.div
        key={stage.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-4 rounded-[20px] bg-white/[0.03] border border-white/10 p-4 sm:p-5"
      >
        <p className="text-white/70 text-sm font-medium leading-relaxed mb-4">{stage.body}</p>
        <div className="flex flex-wrap gap-2">
          {JOURNEY_MILESTONES.map((m) => (
            <span key={m} className="text-[9px] font-black uppercase tracking-widest rounded-full px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary">
              {m}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function FighterTypeTabs() {
  const [active, setActive] = useState(FIGHTER_TYPES[0].id);
  const type = FIGHTER_TYPES.find((t) => t.id === active)!;
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {FIGHTER_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-xl px-3 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors ${
              active === t.id ? 'bg-primary text-black' : 'bg-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <motion.p
        key={type.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-white/60 text-sm font-medium leading-relaxed rounded-[20px] bg-white/[0.03] border border-white/10 p-4 sm:p-5"
      >
        {type.body}
      </motion.p>
    </div>
  );
}

function AiPipeline() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch gap-2">
      {AI_PIPELINE.map((p, i) => (
        <React.Fragment key={p.step}>
          <div className="flex-1 rounded-[18px] bg-white/[0.03] border border-white/10 p-3.5 flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-primary">{String(i + 1).padStart(2, '0')}</span>
            <p className="text-[11px] font-black uppercase tracking-wide text-white/85">{p.step}</p>
            <p className="text-[10px] text-white/50 font-medium leading-snug">{p.body}</p>
          </div>
          {i < AI_PIPELINE.length - 1 && (
            <div className="hidden sm:flex items-center justify-center text-white/20">
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function StatCounter({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-[20px] bg-white/[0.03] border border-white/10 p-5 flex flex-col gap-1"
    >
      <span className="text-3xl sm:text-4xl font-black text-primary leading-none">{value}</span>
      <span className="text-[11px] font-black uppercase tracking-wide text-white/80 mt-1">{label}</span>
      <span className="text-[10px] text-white/40 font-medium">{sub}</span>
    </motion.div>
  );
}

function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="flex flex-col gap-2">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={item.q} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <button
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
              <span className="text-xs sm:text-sm font-bold text-white/85">{item.q}</span>
              <ChevronRight className={`w-4 h-4 text-primary shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.25 }}
                className="px-4 pb-4"
              >
                <p className="text-[11px] sm:text-xs text-white/55 font-medium leading-relaxed">{item.a}</p>
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HomeContent() {
  const [launchReady, setLaunchReady] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/launch-status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setLaunchReady(data.launched === true))
      .catch(() => setLaunchReady(false));
    fetch('/api/public-pricing', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setLivePrices(Object.fromEntries((data.plans || []).map((plan: { name: string; price: string }) => [plan.name, plan.price]))))
      .catch(() => setLivePrices({}));
  }, []);
  const router = useRouter();
  const { user, loading } = useFirebaseUser();

  useEffect(() => {
    if (loading || !user) return;
    try {
      const isDone = localStorage.getItem('boxing_onboarding_done') === 'true';
      const stored = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
      if (isDone || stored?.onboarding_completed) {
        router.replace('/dashboard');
      }
    } catch {
      // ignore
    }
  }, [user, loading, router]);

  return (
    <div className="relative min-h-screen bg-[#08080A] text-white font-sans overflow-x-hidden">
      {/* Interactive Mobile-Ready Free Spar & Deals Popup */}
      <SparFreePromoModal />

      {/* ── Boxing-themed animated background — HOME PAGE ONLY ── */}
      {/* NOTE: No overflow-hidden here — that clips the negatively-positioned orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">

        {/* Ambient glow orbs */}
        <motion.div
          className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/[0.18] blur-[80px]"
          style={{ willChange: 'transform' }}
          animate={{ x: [0, 40, 0], y: [0, 28, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[35%] -right-28 w-[360px] h-[360px] rounded-full bg-red-600/[0.16] blur-[80px]"
          style={{ willChange: 'transform' }}
          animate={{ x: [0, -32, 0], y: [0, -22, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Third orb — hidden on mobile to save GPU */}
        <motion.div
          className="absolute bottom-[5%] left-[28%] w-[300px] h-[300px] rounded-full bg-primary/[0.10] blur-[70px] hidden sm:block"
          style={{ willChange: 'transform' }}
          animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Static grid — zero CPU cost, purely decorative */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(226,255,59,0.7) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(226,255,59,0.7) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />

        {/* Floating hexagons */}
        {[
          { size: 110, left: '7%',  top: '10%', delay: 0,   dur: 14 },
          { size: 75,  left: '76%', top: '8%',  delay: 2.5, dur: 17 },
          { size: 58,  left: '55%', top: '55%', delay: 4,   dur: 11 },
          { size: 92,  left: '15%', top: '68%', delay: 1,   dur: 20 },
        ].map((h, i) => (
          <motion.svg
            key={`hex-${i}`}
            width={h.size}
            height={h.size}
            viewBox="0 0 100 100"
            className="absolute"
            style={{ left: h.left, top: h.top, willChange: 'transform, opacity' }}
            initial={{ opacity: 0.18, y: 0, rotate: 0 }}
            animate={{ y: [0, -18, 0], rotate: [0, 45, 0], opacity: [0.18, 0.35, 0.18] }}
            transition={{ duration: h.dur, repeat: Infinity, ease: 'easeInOut', delay: h.delay }}
          >
            <polygon
              points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
              fill="none"
              stroke="#E2FF3B"
              strokeWidth="2"
            />
          </motion.svg>
        ))}

        {/* Glowing particles */}
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.span
            key={`pt-${i}`}
            className="absolute rounded-full"
            style={{
              width:  3 + (i % 2),
              height: 3 + (i % 2),
              left: `${(i * 43 + 6) % 100}%`,
              top:  `${(i * 31 + 8) % 100}%`,
              backgroundColor: 'rgba(226,255,59,0.7)',
              boxShadow: '0 0 6px rgba(226,255,59,0.5)',
              willChange: 'transform, opacity',
            }}
            animate={{ opacity: [0.2, 0.7, 0.2], y: [0, -(10 + (i % 7)), 0] }}
            transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.35 }}
          />
        ))}

        {/* Slow-drifting vertical rope line */}
        <motion.div
          className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent"
          style={{ left: '50%', willChange: 'transform' }}
          animate={{ x: ['-120vw', '120vw'] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        />

        {/* Pulsing concentric rings */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-primary/[0.25]"
          style={{ willChange: 'opacity' }}
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] rounded-full border border-primary/[0.20]"
          style={{ willChange: 'opacity' }}
          animate={{ opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

      </div>


      {/* Nav */}
      <header className="max-w-5xl mx-auto flex items-center justify-between px-5 sm:px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
            <Image src="/logo.jpg" alt="Sparai Logo" width={36} height={36} className="object-cover" />
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

      <main className="max-w-5xl mx-auto px-5 sm:px-6 pb-24 md:pb-0">
        {/* Hero */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="py-8 sm:py-14 grid lg:grid-cols-[1.05fr_0.95fr] items-center gap-8 lg:gap-12"
        >
          <div className="flex flex-col items-start gap-5">
            <span className="text-[10px] font-black tracking-[3px] text-primary uppercase flex items-center gap-1.5">
              <Star className="w-3 h-3" /> AI-Powered Boxing Coach
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic uppercase leading-[0.95] tracking-tighter">
              Train like a fighter.<br /><span className="text-primary">Think like one too.</span>
            </h1>
            <p className="text-white/60 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl font-medium">
              <strong className="text-white">Sparai</strong> analyzes your movement, builds your training plan, and gives you a clear next round to work on, all through your phone.
            </p>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <HomeCta />
              <Link href="/spar" className="w-full sm:w-auto text-center h-12 px-6 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
                <Swords className="w-3.5 h-3.5" /> Spar Now
              </Link>
              <a href="#explore" className="w-full sm:w-auto text-center h-12 px-6 rounded-full border border-white/15 text-white/70 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:border-primary/40 hover:text-white transition-colors">
                <Play className="w-3.5 h-3.5 fill-current" /> See How It Works
              </a>
            </div>
            <Link href="/legal/privacy" className="text-[11px] font-bold text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors">
              Read our Privacy Policy
            </Link>
          </div>

          <div className="relative min-h-[330px] sm:min-h-[390px] w-full max-w-xl mx-auto lg:mx-0">
            <div className="absolute right-0 top-3 w-[76%] overflow-hidden rounded-[28px] border border-primary/30 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.55)] rotate-3">
              <Image src="/images/promos/vision_hud.jpg" alt="Sparai AI movement analysis" width={900} height={600} className="h-64 sm:h-80 w-full object-cover" priority />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-14">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">AI VISION</p>
                <p className="mt-1 text-sm font-black uppercase">Every punch has a signal.</p>
              </div>
            </div>
            <div className="absolute left-0 bottom-3 w-[54%] overflow-hidden rounded-[24px] border border-orange-400/30 bg-black shadow-[0_18px_55px_rgba(0,0,0,0.5)] -rotate-6">
              <Image src="/images/promos/spar_arena.jpg" alt="Sparai live sparring arena" width={700} height={500} className="h-44 sm:h-56 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 pt-10">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-orange-300">LIVE SPAR</p>
              </div>
            </div>
            <div className="absolute right-2 bottom-0 rounded-full border border-primary/30 bg-black/90 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-primary shadow-lg">
              33 landmarks / frame
            </div>
          </div>
        </motion.section>

        {/* Why Sparai exists */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight mb-4">
            Every great fighter needs<br className="hidden sm:block" /> a great coach.
          </h2>
          <div className="text-white/60 text-sm sm:text-base font-medium leading-relaxed max-w-2xl space-y-2">
            <p>Most fighters train hard. Very few train intelligently.</p>
            <p>Most athletes don&apos;t have access to a professional coach every single day.</p>
            <p>Sparai bridges that gap with AI — watching your technique, studying your movement, measuring your progress, and guiding your improvement every day.</p>
            <p className="text-white font-black">Instead of guessing what to improve, you&apos;ll know exactly what to improve.</p>
          </div>
        </motion.section>

        {/* Boxing journey timeline */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2">
            Your boxing journey
          </h2>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-5 max-w-2xl">
            Tap a stage to see what tends to improve, and when.
          </p>
          <JourneyTimeline />
        </motion.section>

        {/* Without vs With Sparai */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-5">
            The difference AI coaching makes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-[20px] p-5 bg-white/[0.02] border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Without Sparai</p>
              <ul className="flex flex-col gap-2.5">
                {['Random practice', 'No feedback on form', 'Slow, unclear improvement', 'Mistakes you never notice'].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-white/50 font-medium">
                    <span className="text-red-400 mt-0.5">✕</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[20px] p-5 bg-primary/[0.06] border border-primary/25">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">With Sparai</p>
              <ul className="flex flex-col gap-2.5">
                {['AI analyzes every punch', 'A tactical plan built for you', 'Real-time technique feedback', 'Weekly progress you can see', 'Continuous, guided improvement'].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-white/80 font-medium">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
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

        {/* Your Personal AI Coach */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">Your personal AI coach</h2>
          </div>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-5 max-w-2xl">
            Sparai isn&apos;t here to replace a coach — it&apos;s a coach that&apos;s available around the clock, giving you specific feedback after every session.
          </p>
          <div className="flex flex-col gap-2.5 max-w-md">
            {AI_COACH_LINES.map((line, i) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold w-fit max-w-[85%] ${
                  i % 2 === 0 ? 'bg-primary/10 border border-primary/25 text-white/90' : 'bg-white/5 border border-white/10 text-white/70'
                }`}
              >
                {line}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Feature deep-dive — every feature gets its own dedicated tab,
            still static demo content, still no login required */}
        <motion.section
          id="explore"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="pb-10 scroll-mt-20"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
              Every feature, up close
            </h2>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 border border-white/10 rounded-full px-2 py-1">
              Preview
            </span>
          </div>
          <DeepDiveTabs />
        </motion.section>

        {/* Feature-by-feature showcase — one section per app feature,
            visual + written description, alternating sides */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="pb-10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2">
            Everything inside Sparai
          </h2>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-2 max-w-2xl">
            A closer look at each part of the app.
          </p>
          <div>
            {FEATURE_SHOWCASE.map((feature, i) => (
              <FeatureRow key={feature.id} feature={feature} reversed={i % 2 === 1} />
            ))}
          </div>
        </motion.section>

        {/* Built for every fighter */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2">Built for every fighter</h2>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-5 max-w-2xl">
            Whatever level you&apos;re training at, Sparai adapts to it.
          </p>
          <FighterTypeTabs />
        </motion.section>

        {/* How AI actually works */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2">How the AI analysis works</h2>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-5 max-w-2xl">
            From a recorded video to a real training plan, in six steps.
          </p>
          <AiPipeline />
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

        {/* Why consistency wins */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2 flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" /> Why consistency wins
          </h2>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-5 max-w-2xl">
            One great session doesn&apos;t make a fighter. A tracked, visible streak does.
          </p>
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
            {['Current Streak', 'Longer Streak', 'Better Habits', 'Better Boxer'].map((step, i, arr) => (
              <React.Fragment key={step}>
                <div className="shrink-0 rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-white/80">{step}</span>
                </div>
                {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </motion.section>

        {/* Real progress, honest numbers */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2">Real progress, not guesswork</h2>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-5 max-w-2xl">
            What&apos;s actually inside the app — no invented numbers, just what Sparai does.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRODUCT_FACTS.map((f) => (
              <StatCounter key={f.label} value={f.value} label={f.label} sub={f.sub} />
            ))}
          </div>
        </motion.section>

        {/* Why people stay */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-5">Why people stay</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WHY_PEOPLE_STAY.map((r) => (
              <div key={r.title} className="rounded-[18px] bg-white/[0.03] border border-white/10 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary mb-1.5">{r.title}</p>
                <p className="text-[11px] sm:text-xs text-white/60 font-medium leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Subscription plans — real pricing, matches /subscription exactly */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-8 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" /> Plans & pricing
          </h2>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-4 max-w-2xl">
            {launchReady ? 'Start free during onboarding, upgrade whenever you want unlimited AI analyses. Cancel anytime.' : 'Plans and pricing will be revealed when SparAI goes live.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[20px] p-4 flex flex-col justify-between gap-3 border ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-primary/15 to-transparent border-primary/30'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wide text-white/80">{plan.name}</p>
                    {plan.discountTag && (
                      <span className="text-[7px] font-black uppercase tracking-wider text-black bg-primary rounded-full px-2 py-0.5">
                        {plan.discountTag}
                      </span>
                    )}
                  </div>
                  <div className={!launchReady ? 'relative overflow-hidden' : undefined}>
                    {launchReady && plan.originalPrice && (
                      <span className={`text-[11px] font-bold text-red-400/80 line-through block ${!launchReady ? 'select-none blur-md' : ''}`}>
                        {plan.originalPrice}
                      </span>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-white">{launchReady ? (livePrices[plan.name] || plan.price) : '••••'}</span>
                      {launchReady && <span className="text-[10px] font-bold text-white/40">{plan.period}</span>}
                    </div>
                  </div>
                  {!launchReady && <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-primary/80">Reveals at launch</span>}
                </div>

                <ul className="flex flex-col gap-1.5 mt-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[10px] font-semibold text-white/60 leading-snug">
                      <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/onboarding"
                  className={`mt-2 py-2 rounded-xl text-center text-[10px] font-black uppercase tracking-wider transition-all ${
                    plan.highlight
                      ? 'bg-primary text-black hover:bg-[#cdea2a]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  GET INTO MY APP
                </Link>
              </div>
            ))}
          </div>
          {/* Referral trial callout */}
          <div className="mt-3 rounded-[20px] p-4 sm:p-5 bg-white/[0.03] border border-primary/20 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/90">Refer 5 friends, get 14 days free</p>
              <p className="text-[11px] text-white/50 font-medium mt-0.5">
                Share your referral code from the app — once 5 people sign up with it, you get a 14-day premium trial automatically.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Security & Data — names the actual infra, for both users and
            Google OAuth reviewers */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-8 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Your data is safe
          </h2>
          <p className="text-white/50 text-xs sm:text-sm font-medium mb-4 max-w-2xl">
            Sparai is built on infrastructure that&apos;s encrypted by default — here&apos;s exactly what powers it.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SECURITY_POINTS.map((point) => (
              <div key={point.title} className="rounded-xl bg-white/[0.03] border border-white/5 p-4 flex flex-col gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <p className="text-xs font-black uppercase tracking-wide text-white/80">{point.title}</p>
                <p className="text-[11px] text-white/60 font-medium leading-relaxed">{point.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-white/10"
        >
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-5">Frequently asked questions</h2>
          <FaqAccordion />
        </motion.section>

        {/* Second CTA banner */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="py-10"
        >
          <div className="rounded-[28px] p-6 sm:p-10 bg-gradient-to-br from-primary/15 via-white/[0.03] to-transparent border border-primary/20 flex flex-col items-center text-center gap-4">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight">
              Every champion starts somewhere.
            </h2>
            <p className="text-white/60 text-sm font-medium max-w-md">
              You don&apos;t become better by training harder. You become better by training smarter.
              Sign in with your phone number and build your training profile in under two minutes.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-primary text-black text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all"
            >
              Start Training with Sparai <ChevronRight size={16} />
            </Link>
          </div>
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

      {/* Sticky mobile CTA */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-black/85 backdrop-blur-xl px-4 pt-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <HomeCta />
      </div>

      {/* Non-overlapping Modals */}
      <SparFreePromoModal />
      <PwaInstallModal />
    </div>
  );
}