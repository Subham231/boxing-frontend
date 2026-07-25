'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Activity, Zap, Trophy, ChevronRight } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

export const WELCOME_INTRO_KEY = 'boxing_welcome_intro_done';

interface Slide {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  desc: string;
}

const SLIDES: Slide[] = [
  {
    icon: Brain,
    eyebrow: 'AI COMBAT COACH',
    title: 'Welcome to\nthe corner.',
    desc: "You've got a full AI training system in your pocket now. Let's walk through what it can do — 30 seconds, promise.",
  },
  {
    icon: Activity,
    eyebrow: 'LIVE ANALYSER',
    title: 'It watches\nyour form.',
    desc: 'Record a round and our computer-vision engine breaks down your technique, speed, and reaction in real time.',
  },
  {
    icon: Zap,
    eyebrow: 'REFLEX GAMES',
    title: 'Train your\nreactions.',
    desc: 'Sharp hands start with a sharp mind. Quick reflex drills keep you fast between sessions — and rank you against others.',
  },
  {
    icon: Trophy,
    eyebrow: 'DAILY STREAKS',
    title: "Show up.\nRank up.",
    desc: 'Every day you train builds your streak and climbs your Combat Rank — ROOKIE all the way to MASTER.',
  },
];

interface WelcomeIntroProps {
  onDone: () => void;
}

export default function WelcomeIntro({ onDone }: WelcomeIntroProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const isLast = step === SLIDES.length - 1;

  const finish = () => {
    localStorage.setItem(WELCOME_INTRO_KEY, '1');
    onDone();
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  };

  const slide = SLIDES[step];
  const Icon = slide.icon;

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black z-[999999] flex flex-col items-center justify-center p-8 text-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Ambient glow backdrop */}
      <motion.div
        key={`glow-${step}`}
        className="absolute w-[420px] h-[420px] rounded-full bg-primary/10 blur-[100px] pointer-events-none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* Skip */}
      <button
        onClick={finish}
        className="absolute top-8 right-6 text-[10px] font-black text-white/30 hover:text-white/70 uppercase tracking-widest z-10 py-2 px-2"
      >
        Skip
      </button>

      <div className="relative w-full max-w-[300px] flex flex-col items-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 18 }}
              className="w-20 h-20 rounded-3xl bg-primary/10 border-2 border-primary flex items-center justify-center text-primary mb-7 shadow-[0_0_25px_rgba(226,255,59,0.35)]"
            >
              <Icon className="w-9 h-9" strokeWidth={2.2} />
            </motion.div>

            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="text-[10px] font-black text-primary tracking-[3px] uppercase mb-3 block"
            >
              {slide.eyebrow}
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="text-3xl font-black uppercase italic text-white tracking-wide leading-[1.05] mb-4 whitespace-pre-line"
            >
              {slide.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="text-xs text-white/55 font-semibold leading-relaxed"
            >
              {slide.desc}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mt-10 mb-8 relative z-10">
        {SLIDES.map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded-full bg-white/10 overflow-hidden"
            animate={{ width: i === step ? 24 : 6 }}
            transition={{ duration: 0.25 }}
          >
            {i === step && (
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.25 }}
              />
            )}
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-[260px] relative z-10">
        <NeonButton onClick={next} className="w-full flex items-center justify-center gap-2">
          {isLast ? "LET'S TRAIN 🥊" : 'NEXT'}
          {!isLast && <ChevronRight className="w-4 h-4 stroke-[3]" />}
        </NeonButton>
      </div>
    </motion.div>
  );
}
