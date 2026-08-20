'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  BarChart3,
  Brain,
  Play,
  Zap,
  Calendar,
  User,
  Flame,
  Swords,
  Compass,
  ChevronUp,
  Video,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { useRankState } from '@/lib/rank-client';

type ExploreMode = 'vision' | 'spar';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { rankState } = useRankState();
  const streak = rankState?.current_streak ?? 0;

  const [mode, setMode] = useState<ExploreMode>('vision');
  const [menuOpen, setMenuOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: 'HOME', icon: Home, href: '/dashboard' },
    { label: 'ANALYSIS', icon: BarChart3, href: '/analytics' },
    { label: 'GURU', icon: Brain, href: '/guru' },
  ];

  const rightNavItems = [
    { label: 'REFLEX', icon: Zap, href: '/reflex' },
    { label: 'PLANNER', icon: Calendar, href: '/planner' },
    { label: 'PROFILE', icon: User, href: '/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    return pathname.startsWith(href) && href !== '/dashboard';
  };

  // Auto-swipe Explore preview between Sparring and AI Analysis
  useEffect(() => {
    if (menuOpen) return;
    const id = window.setInterval(() => {
      setMode((m) => (m === 'vision' ? 'spar' : 'vision'));
    }, 2800);
    return () => window.clearInterval(id);
  }, [menuOpen]);

  // Close flyout on outside tap / route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = exploreRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [menuOpen]);

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  return (
    <nav
      className="sticky bottom-0 left-0 w-full bg-[#08090b] border-t border-white/10 grid grid-cols-[1fr_1fr_1fr_70px_1fr_1fr_1fr] items-center px-1 z-[999] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      style={{
        height: 'calc(90px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={twMerge(
              'flex flex-col items-center justify-center gap-1.5 no-underline transition-all duration-200 min-w-[44px] min-h-[44px]',
              active ? 'opacity-100 text-primary' : 'opacity-40 text-white hover:opacity-70',
            )}
          >
            <Icon className={twMerge('w-5 h-5', active && 'drop-shadow-[0_0_8px_var(--primary)]')} />
            <span className="text-[9px] font-black tracking-wider uppercase">{item.label}</span>
          </Link>
        );
      })}

      {/* Explore center control */}
      <div ref={exploreRef} className="relative -top-6 flex flex-col items-center z-[1000] select-none">
        {/* Upward dual-option menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-[min(92vw,340px)]"
            >
              <div className="rounded-2xl border border-white/10 bg-[#0c0e0c]/95 backdrop-blur-xl p-2.5 shadow-[0_0_40px_rgba(0,0,0,0.75),0_0_24px_rgba(226,255,59,0.12)] grid grid-cols-2 gap-2">
                {/* AI Video Analysis */}
                <button
                  type="button"
                  onClick={() => go('/vision')}
                  className="relative flex flex-col items-center text-center gap-2 rounded-xl border border-primary/35 bg-gradient-to-b from-primary/15 to-transparent px-2 py-4 active:scale-[0.97] transition-transform"
                >
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 text-black font-black text-[8px] tracking-wider shadow-[0_0_12px_rgba(249,115,22,0.55)] stealth-sensitive whitespace-nowrap">
                    <Flame className="w-2.5 h-2.5 fill-black stroke-none" />
                    {streak} Day Streak
                  </span>
                  <div
                    className="mt-2 w-12 h-12 flex items-center justify-center text-primary"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: 'linear-gradient(180deg, rgba(226,255,59,0.35), rgba(226,255,59,0.08))',
                    }}
                  >
                    <Video className="w-5 h-5 drop-shadow-[0_0_8px_rgba(226,255,59,0.9)]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wide text-primary leading-tight">
                    AI Video Analysis
                  </span>
                  <span className="text-[9px] text-white/55 font-semibold leading-snug px-0.5">
                    Analyze your technique and improve with AI.
                  </span>
                </button>

                {/* Sparring */}
                <button
                  type="button"
                  onClick={() => go('/spar')}
                  className="relative flex flex-col items-center text-center gap-2 rounded-xl border border-orange-400/40 bg-gradient-to-b from-orange-500/15 to-transparent px-2 py-4 active:scale-[0.97] transition-transform"
                >
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-primary text-black font-black text-[8px] tracking-widest shadow-[0_0_12px_rgba(226,255,59,0.5)]">
                    FREE
                  </span>
                  <div
                    className="mt-2 w-12 h-12 flex items-center justify-center text-orange-400"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: 'linear-gradient(180deg, rgba(249,115,22,0.4), rgba(249,115,22,0.08))',
                    }}
                  >
                    <Swords className="w-5 h-5 drop-shadow-[0_0_8px_rgba(249,115,22,0.9)]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wide text-orange-400 leading-tight">
                    Sparring
                  </span>
                  <span className="text-[9px] text-white/55 font-semibold leading-snug px-0.5">
                    Watch ads to start sparring for free.
                  </span>
                </button>
              </div>
              <div className="flex justify-center pt-1.5">
                <ChevronUp className="w-4 h-4 text-white/35" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          aria-label="Explore"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="relative flex flex-col items-center cursor-pointer group"
        >
          {/* Cycling tag */}
          <div className="absolute -top-4 h-5 overflow-hidden z-20">
            <AnimatePresence mode="wait">
              {mode === 'vision' ? (
                <motion.div
                  key="streak-tag"
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 text-black font-black text-[8px] tracking-wider shadow-[0_0_12px_rgba(249,115,22,0.6)] stealth-sensitive"
                >
                  <Flame className="w-2.5 h-2.5 fill-black stroke-none" />
                  <span>{streak}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="free-tag"
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="px-2.5 py-0.5 rounded-full bg-primary text-black font-black text-[8px] tracking-widest shadow-[0_0_12px_rgba(226,255,59,0.55)]"
                >
                  FREE
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className={twMerge(
              'absolute top-0 w-[64px] h-[70px] rounded-full blur-md transition-all duration-500 animate-pulse',
              mode === 'spar' ? 'bg-orange-500/35 group-hover:bg-orange-500/55' : 'bg-primary/40 group-hover:bg-primary/70',
            )}
          />

          <div
            className={twMerge(
              'w-[62px] relative transition-all duration-300 group-hover:scale-110 group-active:scale-95 flex items-center justify-center',
              mode === 'spar'
                ? 'bg-gradient-to-b from-orange-400 via-orange-500/80 to-amber-600 shadow-[0_0_25px_rgba(249,115,22,0.55)]'
                : 'bg-gradient-to-b from-primary via-primary/80 to-amber-400 shadow-[0_0_25px_rgba(226,255,59,0.6)]',
            )}
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              height: '68px',
            }}
          >
            <div
              className="absolute inset-[2.5px] bg-[#0A0D08] z-10 flex items-center justify-center overflow-hidden group-hover:bg-[#12160d] transition-colors"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              }}
            >
              <AnimatePresence mode="wait">
                {mode === 'vision' ? (
                  <motion.div
                    key="vision-icon"
                    initial={{ x: 22, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -22, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="relative"
                  >
                    <Play className="w-5 h-5 text-primary fill-primary/30 drop-shadow-[0_0_10px_rgba(226,255,59,1)]" />
                    <Zap className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="spar-icon"
                    initial={{ x: 22, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -22, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  >
                    <Swords className="w-5 h-5 text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,1)]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Label: Explore + swiping mode hint */}
          <div className="mt-1 h-[22px] overflow-hidden flex flex-col items-center">
            <span className="text-[8px] font-black tracking-[0.2em] text-white/40 uppercase leading-none mb-0.5 flex items-center gap-0.5">
              <Compass className="w-2.5 h-2.5" /> Explore
            </span>
            <div className="h-[11px] overflow-hidden relative w-[72px]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={mode}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className={twMerge(
                    'absolute inset-x-0 text-center text-[9px] font-black tracking-widest uppercase drop-shadow-[0_0_8px_rgba(226,255,59,0.5)]',
                    mode === 'spar' ? 'text-orange-400' : 'text-primary',
                  )}
                >
                  {mode === 'spar' ? 'Sparring' : 'AI Analysis'}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </button>
      </div>

      {rightNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={twMerge(
              'flex flex-col items-center justify-center gap-1.5 no-underline transition-all duration-200 min-w-[44px] min-h-[44px]',
              active ? 'opacity-100 text-primary' : 'opacity-40 text-white hover:opacity-70',
            )}
          >
            <Icon className={twMerge('w-5 h-5', active && 'drop-shadow-[0_0_8px_var(--primary)]')} />
            <span className="text-[9px] font-black tracking-wider uppercase">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
