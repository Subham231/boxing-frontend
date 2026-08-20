'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { Home, Calendar, User, Flame, ChevronUp } from 'lucide-react';
import { useRankState } from '@/lib/rank-client';
import {
  ExploreDiamond,
  AnalysisCamIcon,
  BoxingGlovesIcon,
  BarChart3Icon,
  ZapNeonIcon,
  BrainNeonIcon,
} from '@/components/ui/NeonIcons';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { rankState } = useRankState();
  const streak = rankState?.current_streak ?? 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);

  const leftNavItems = [
    { label: 'HOME', icon: Home, href: '/dashboard' },
    { label: 'PROGRESS', icon: BarChart3Icon, href: '/analytics' },
    { label: 'GURU', icon: BrainNeonIcon, href: '/guru' },
  ];

  const rightNavItems = [
    { label: 'REFLEX', icon: ZapNeonIcon, href: '/reflex' },
    { label: 'PLANNER', icon: Calendar, href: '/planner' },
    { label: 'PROFILE', icon: User, href: '/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    return pathname.startsWith(href) && href !== '/dashboard';
  };

  const isExploreActive = pathname.startsWith('/vision') || pathname.startsWith('/spar');

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = exploreRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer, { passive: true });
    document.addEventListener('touchstart', onPointer, { passive: true });
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
    <div ref={exploreRef} className="fixed bottom-0 left-0 right-0 z-[999] pointer-events-none select-none flex flex-col items-center">
      {/* Floating Dual-Card Tray (Shown when Explore is opened) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className="w-[min(94vw,400px)] mb-3 pointer-events-auto transform-gpu"
          >
            {/* Top Chevron Indicator */}
            <div className="flex justify-center -mb-2 z-20 relative">
              <div className="w-8 h-8 rounded-full bg-[#10130d] border border-white/10 flex items-center justify-center text-[#E2FF3B] shadow-[0_0_12px_rgba(226,255,59,0.3)]">
                <ChevronUp className="w-4 h-4 text-[#E2FF3B]" />
              </div>
            </div>

            {/* Glass Tray Container */}
            <div className="rounded-[26px] border border-white/15 bg-[#0b0e09]/95 backdrop-blur-2xl p-3 shadow-[0_16px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(226,255,59,0.1)] grid grid-cols-2 gap-2.5">
              {/* Card 1: AI Video Analysis */}
              <button
                type="button"
                onClick={() => go('/vision')}
                className="relative flex flex-col items-start justify-between rounded-2xl border border-[#E2FF3B]/50 bg-gradient-to-b from-[#16200d] via-[#0d1208] to-[#070905] p-3.5 min-h-[92px] shadow-[inset_0_0_24px_rgba(226,255,59,0.08),0_0_20px_rgba(226,255,59,0.15)] active:scale-[0.97] transition-all text-left group overflow-hidden"
              >
                {/* Glow aura */}
                <div className="absolute -top-6 -left-6 w-20 h-20 bg-[#E2FF3B]/20 rounded-full blur-xl pointer-events-none" />

                {/* Streak Badge */}
                <div className="self-end flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 border border-orange-500/40 text-[9px] font-black text-amber-300 tracking-wide stealth-sensitive">
                  <Flame className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
                  <span>{streak} Streak</span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <AnalysisCamIcon className="w-8 h-8 text-[#E2FF3B] shrink-0 drop-shadow-[0_0_10px_rgba(226,255,59,0.9)]" />
                  <span className="text-xs font-black text-white leading-tight uppercase tracking-tight">
                    AI Video<br />Analysis
                  </span>
                </div>
              </button>

              {/* Card 2: Sparing */}
              <button
                type="button"
                onClick={() => go('/spar')}
                className="relative flex flex-col items-start justify-between rounded-2xl border border-amber-500/50 bg-gradient-to-b from-[#24170a] via-[#140e06] to-[#080604] p-3.5 min-h-[92px] shadow-[inset_0_0_24px_rgba(245,158,11,0.08),0_0_20px_rgba(245,158,11,0.15)] active:scale-[0.97] transition-all text-left group overflow-hidden"
              >
                {/* Glow aura */}
                <div className="absolute -top-6 -left-6 w-20 h-20 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />

                {/* Free Badge */}
                <div className="self-end px-2.5 py-0.5 rounded-full bg-[#E2FF3B] text-black font-black text-[9px] tracking-widest shadow-[0_0_10px_rgba(226,255,59,0.6)]">
                  FREE
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <BoxingGlovesIcon className="w-8 h-8 text-amber-400 shrink-0 drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]" />
                  <span className="text-xs font-black text-white leading-tight uppercase tracking-tight">
                    Sparing
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bottom Dock Bar with 7 balanced navigation items */}
      <nav
        className="w-full bg-[#08090b]/98 backdrop-blur-xl border-t border-white/10 grid grid-cols-[1fr_1fr_1fr_64px_1fr_1fr_1fr] items-center px-1 pointer-events-auto shadow-[0_-12px_40px_rgba(0,0,0,0.85)] relative transform-gpu"
        style={{
          height: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Left Navigation: Home, Progress, Guru */}
        {leftNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={twMerge(
                'flex flex-col items-center justify-center gap-1 no-underline transition-all duration-200 min-w-[40px] min-h-[44px] active:scale-95',
                active ? 'opacity-100 text-[#E2FF3B]' : 'opacity-40 text-white hover:opacity-75',
              )}
            >
              <Icon className={twMerge('w-5 h-5', active && 'text-[#E2FF3B] drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]')} />
              <span className="text-[8px] font-black tracking-wider uppercase">{item.label}</span>
            </Link>
          );
        })}

        {/* Center: Elevated Hexagon Explore Button */}
        <div className="relative -top-4 flex flex-col items-center justify-center">
          {/* Subtle notch aura behind hexagon */}
          <div
            className={twMerge(
              'absolute top-0 w-[58px] h-[58px] rounded-full blur-md transition-all duration-500',
              menuOpen || isExploreActive ? 'bg-[#E2FF3B]/35 scale-110' : 'bg-[#E2FF3B]/15',
            )}
          />

          <button
            type="button"
            aria-label="Explore"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="relative flex flex-col items-center cursor-pointer active:scale-95 transition-transform group"
          >
            {/* Hexagon Shell */}
            <div
              className="relative flex items-center justify-center bg-gradient-to-b from-[#E2FF3B] via-[#C8F500] to-[#8FB500] shadow-[0_0_20px_rgba(226,255,59,0.6)]"
              style={{
                width: 52,
                height: 58,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              }}
            >
              {/* Inner dark core */}
              <div
                className="absolute inset-[2px] bg-[#0A0D08] flex items-center justify-center"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              >
                <ExploreDiamond className="w-6 h-6 text-[#E2FF3B] drop-shadow-[0_0_10px_rgba(226,255,59,1)]" />
              </div>
            </div>

            {/* Label */}
            <span
              className={twMerge(
                'mt-1 text-[9px] font-black tracking-widest uppercase transition-colors',
                menuOpen || isExploreActive ? 'text-[#E2FF3B] drop-shadow-[0_0_6px_rgba(226,255,59,0.7)]' : 'text-[#E2FF3B]/80',
              )}
            >
              Explore
            </span>
          </button>
        </div>

        {/* Right Navigation: Reflex, Planner, Profile */}
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
                'flex flex-col items-center justify-center gap-1 no-underline transition-all duration-200 min-w-[40px] min-h-[44px] active:scale-95',
                active ? 'opacity-100 text-[#E2FF3B]' : 'opacity-40 text-white hover:opacity-75',
              )}
            >
              <Icon className={twMerge('w-5 h-5', active && 'text-[#E2FF3B] drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]')} />
              <span className="text-[8px] font-black tracking-wider uppercase">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

