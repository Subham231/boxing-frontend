'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BarChart3, Brain, Zap, Calendar, User, Flame } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { useRankState } from '@/lib/rank-client';

type ExploreMode = 'vision' | 'spar';

/** Diamond / gem mark used on the Explore hex (matches reference). */
function ExploreDiamond({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.2 20.2 9.5 12 21.8 3.8 9.5 12 2.2Z" opacity="0.95" />
      <path d="M12 6.2 16.8 10.2 12 17.5 7.2 10.2 12 6.2Z" fill="#0A0D08" opacity="0.55" />
    </svg>
  );
}

/** Play + bolt — AI Analysis swipe state on the Explore button. */
function PlayBoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M8.5 5.8v12.4L18.2 12 8.5 5.8Z"
        fill="currentColor"
        fillOpacity="0.35"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 4.2 12.6 7.4h2.4L11.8 13l1.5-3.2H11l3.2-5.6Z"
        fill="#FCD34D"
        stroke="#FCD34D"
        strokeWidth="0.4"
      />
    </svg>
  );
}

/** Video camera + sparkles — AI tile logo. */
function AnalysisCamIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <rect x="4" y="14" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="2.4" />
      <path d="M32 20l10-5v18l-10-5V20Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="18" cy="24" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M34 8l1.2 2.4L38 12l-2.8 1.2L34 16l-1.2-2.8L30 12l2.8-1.6L34 8Z" fill="currentColor" />
      <path d="M40 14l0.7 1.4L42 16l-1.3.6L40 18l-.7-1.4L38 16l1.3-.6L40 14Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

/** Crossed boxing gloves — Sparring tile + swipe logo. */
function BoxingGlovesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <path
        d="M14 28c-4.5 0-8-3-8-7.2C6 16 9.2 12 14 12c2.2 0 4 .8 5.4 2.1C21 11.5 24.2 9 28.5 9 34 9 38 13.2 38 18.8c0 2.6-1 4.9-2.6 6.6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M12 22c0 6 3.5 11 8 14v5h-5.5C10 41 7 37.5 7 32.5V28"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 24c0 6-2.5 11-7 14v5h6c4.5 0 8-3.8 8-8.5V30"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function HexShell({
  tone,
  children,
  size = 56,
}: {
  tone: 'lime' | 'orange';
  children: React.ReactNode;
  size?: number;
}) {
  const glow =
    tone === 'lime'
      ? 'from-[#D4FF00] via-[#B8E000] to-[#8FBF00] shadow-[0_0_22px_rgba(212,255,0,0.55)]'
      : 'from-[#FF9A1F] via-[#FF7A00] to-[#E85D00] shadow-[0_0_22px_rgba(255,122,0,0.5)]';
  return (
    <div
      className={twMerge('relative flex items-center justify-center bg-gradient-to-b', glow)}
      style={{
        width: size,
        height: Math.round(size * 1.1),
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      }}
    >
      <div
        className="absolute inset-[2.5px] bg-[#0A0D08] flex items-center justify-center"
        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
      >
        {children}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    if (menuOpen) return;
    const id = window.setInterval(() => {
      setMode((m) => (m === 'vision' ? 'spar' : 'vision'));
    }, 2800);
    return () => window.clearInterval(id);
  }, [menuOpen]);

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
      className="sticky bottom-0 left-0 w-full bg-[#08090b] border-t border-white/10 grid grid-cols-[1fr_1fr_1fr_74px_1fr_1fr_1fr] items-center px-1 z-[999] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      style={{
        height: 'calc(92px + env(safe-area-inset-bottom))',
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

      <div ref={exploreRef} className="relative -top-7 flex flex-col items-center z-[1000] select-none">
        {/* Upward bubble menu — matches reference */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="absolute bottom-[calc(100%+18px)] left-1/2 -translate-x-1/2 w-[min(94vw,360px)] pointer-events-auto"
            >
              <div className="flex justify-center mb-1">
                <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-b-[8px] border-l-transparent border-r-transparent border-b-white/25" />
              </div>

              <div className="rounded-[22px] border border-white/12 bg-[#0d0f0c]/97 backdrop-blur-xl p-2.5 shadow-[0_12px_48px_rgba(0,0,0,0.85),0_0_28px_rgba(212,255,0,0.1)] grid grid-cols-2 gap-2.5">
                {/* AI Video Analysis */}
                <button
                  type="button"
                  onClick={() => go('/vision')}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#D4FF00]/45 bg-[#0a0c08] px-2 pt-5 pb-3.5 shadow-[inset_0_0_24px_rgba(212,255,0,0.06),0_0_16px_rgba(212,255,0,0.12)] active:scale-[0.97] transition-transform"
                >
                  <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/80 border border-orange-400/40 text-[8px] font-black text-amber-300 tracking-wide stealth-sensitive">
                    <Flame className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
                    {streak} Streak
                  </span>
                  <AnalysisCamIcon className="w-10 h-10 text-[#D4FF00] drop-shadow-[0_0_10px_rgba(212,255,0,0.85)]" />
                  <span className="text-[11px] font-black text-white uppercase tracking-wide leading-tight text-center">
                    AI Video Analysis
                  </span>
                </button>

                {/* Sparring */}
                <button
                  type="button"
                  onClick={() => go('/spar')}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-orange-400/50 bg-[#0a0c08] px-2 pt-5 pb-3.5 shadow-[inset_0_0_24px_rgba(255,122,0,0.07),0_0_16px_rgba(255,122,0,0.14)] active:scale-[0.97] transition-transform"
                >
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#D4FF00] text-black text-[8px] font-black tracking-widest">
                    FREE
                  </span>
                  <BoxingGlovesIcon className="w-10 h-10 text-orange-400 drop-shadow-[0_0_10px_rgba(255,122,0,0.85)]" />
                  <span className="text-[11px] font-black text-white uppercase tracking-wide leading-tight text-center">
                    Sparring
                  </span>
                </button>
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
          {/* Cycling FREE / streak tag — hidden while menu open */}
          {!menuOpen && (
            <div className="absolute -top-3.5 z-20 flex justify-center w-full pointer-events-none">
              <AnimatePresence mode="wait">
                {mode === 'vision' ? (
                  <motion.div
                    key="streak-tag"
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.32 }}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 text-black font-black text-[8px] tracking-wider shadow-[0_0_12px_rgba(249,115,22,0.65)] stealth-sensitive"
                  >
                    <Flame className="w-2.5 h-2.5 fill-black stroke-none" />
                    <span>{streak}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="free-tag"
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.32 }}
                    className="px-2.5 py-0.5 rounded-full bg-[#D4FF00] text-black font-black text-[8px] tracking-widest shadow-[0_0_12px_rgba(212,255,0,0.55)]"
                  >
                    FREE
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div
            className={twMerge(
              'absolute top-1 w-[66px] h-[72px] rounded-full blur-md transition-colors duration-500 animate-pulse',
              mode === 'spar' && !menuOpen ? 'bg-orange-500/40' : 'bg-[#D4FF00]/35',
            )}
          />

          <HexShell tone={mode === 'spar' && !menuOpen ? 'orange' : 'lime'} size={62}>
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {menuOpen ? (
                  <motion.div
                    key="explore-diamond"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ExploreDiamond className="w-7 h-7 text-[#D4FF00] drop-shadow-[0_0_10px_rgba(212,255,0,1)]" />
                  </motion.div>
                ) : mode === 'vision' ? (
                  <motion.div
                    key="vision-icon"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.38, ease: 'easeInOut' }}
                  >
                    <PlayBoltIcon className="w-7 h-7 text-[#D4FF00] drop-shadow-[0_0_10px_rgba(212,255,0,1)]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="spar-icon"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.38, ease: 'easeInOut' }}
                  >
                    <BoxingGlovesIcon className="w-7 h-7 text-orange-400 drop-shadow-[0_0_10px_rgba(255,122,0,1)]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </HexShell>

          <div className="mt-1.5 flex flex-col items-center leading-none gap-0.5">
            <span className="text-[8px] font-black tracking-[0.22em] text-[#D4FF00]/70 uppercase">Explore</span>
            <div className="h-[12px] overflow-hidden relative w-[78px]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={menuOpen ? 'open' : mode}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.32 }}
                  className={twMerge(
                    'absolute inset-x-0 text-center text-[9px] font-black tracking-widest uppercase',
                    menuOpen
                      ? 'text-[#D4FF00]'
                      : mode === 'spar'
                        ? 'text-orange-400'
                        : 'text-[#D4FF00]',
                  )}
                >
                  {menuOpen ? 'Menu' : mode === 'spar' ? 'Sparring' : 'AI Analysis'}
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
