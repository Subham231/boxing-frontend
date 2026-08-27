'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { Flame, ChevronUp } from 'lucide-react';
import { useRankState } from '@/lib/rank-client';
import {
  ExploreDiamond,
  AnalysisCamIcon,
  BoxingGlovesIcon,
  HomeNeonIcon,
  BarChart3Icon,
  BrainNeonIcon,
  ZapNeonIcon,
  CalendarNeonIcon,
  UserNeonIcon,
} from '@/components/ui/NeonIcons';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { rankState } = useRankState();
  const streak = rankState?.current_streak ?? 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);

  const leftNavItems = [
    { label: 'HOME', icon: HomeNeonIcon, href: '/dashboard' },
    { label: 'PROGRESS', icon: BarChart3Icon, href: '/analytics' },
    { label: 'GURU', icon: BrainNeonIcon, href: '/guru' },
  ];

  const rightNavItems = [
    { label: 'REFLEX', icon: ZapNeonIcon, href: '/reflex' },
    { label: 'PLANNER', icon: CalendarNeonIcon, href: '/planner' },
    { label: 'PROFILE', icon: UserNeonIcon, href: '/settings' },
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
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="w-[min(90vw,340px)] mb-2 pointer-events-auto transform-gpu"
          >
            {/* Glass Tray Container with Arched Top Chevron */}
            <div className="relative rounded-[22px] border border-white/15 bg-[#090d07]/95 backdrop-blur-2xl p-2 shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_25px_rgba(226,255,59,0.08)]">
              {/* Arched Top Chevron Center Tab */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-t-lg bg-[#090d07] border-t border-x border-white/15 flex items-center justify-center shadow-md">
                <ChevronUp className="w-3 h-3 text-[#E2FF3B]" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Card 1: AI Video Analysis */}
                <button
                  type="button"
                  onClick={() => go('/vision')}
                  className="relative flex flex-col justify-between rounded-[18px] border border-[#E2FF3B]/60 bg-gradient-to-b from-[#131d0b] via-[#0b1007] to-[#060804] p-2.5 h-[66px] shadow-[inset_0_0_15px_rgba(226,255,59,0.06),0_0_15px_rgba(226,255,59,0.12)] active:scale-[0.97] transition-all text-left overflow-hidden group"
                >
                  {/* Streak Badge */}
                  <div className="self-end flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/85 border border-orange-500/50 text-[8px] font-black text-amber-300 tracking-tight">
                    <Flame className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
                    <span>{streak} Streak</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <AnalysisCamIcon size={26} className="text-[#E2FF3B] shrink-0 drop-shadow-[0_0_8px_rgba(226,255,59,0.9)]" />
                    <span className="text-[11px] font-black text-white leading-[1.1] uppercase tracking-tight">
                      AI Video<br />Analysis
                    </span>
                  </div>
                </button>

                {/* Card 2: Sparring */}
                <button
                  type="button"
                  onClick={() => go('/spar')}
                  className="relative flex flex-col justify-between rounded-[18px] border border-amber-500/60 bg-gradient-to-b from-[#221609] via-[#120d05] to-[#070503] p-2.5 h-[66px] shadow-[inset_0_0_15px_rgba(245,158,11,0.06),0_0_15px_rgba(245,158,11,0.12)] active:scale-[0.97] transition-all text-left overflow-hidden group"
                >
                  {/* Free Badge */}
                  <div className="self-end px-2 py-0.5 rounded-full bg-[#E2FF3B] text-black font-black text-[8px] tracking-wider shadow-[0_0_8px_rgba(226,255,59,0.7)]">
                    FREE
                  </div>

                  <div className="flex items-center gap-2">
                    <BoxingGlovesIcon size={26} className="text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                    <span className="text-[11px] font-black text-white leading-tight uppercase tracking-tight">
                      Sparring
                    </span>
                  </div>
                </button>
              </div>
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

