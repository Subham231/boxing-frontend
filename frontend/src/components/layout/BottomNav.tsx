'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { Flame, ChevronDown, Lock, X } from 'lucide-react';
import { useRankState } from '@/lib/rank-client';
import {
  ExploreDiamond,
  HomeNeonIcon,
  BarChart3Icon,
  BrainNeonIcon,
  ZapNeonIcon,
  CalendarNeonIcon,
  UserNeonIcon,
} from '@/components/ui/NeonIcons';
import { useFreeSparringTutorial, TUTORIAL_STORAGE_KEY } from './FreeSparringTutorial';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { rankState } = useRankState();
  const streak = rankState?.current_streak ?? 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);

  const { tutorialStep, dismissTutorial } = useFreeSparringTutorial(menuOpen);

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
      if (e.target instanceof Node && !el.contains(e.target)) {
        dismissTutorial();
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer, { passive: true });
    document.addEventListener('touchstart', onPointer, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [menuOpen, dismissTutorial]);

  const go = (href: string) => {
    dismissTutorial();
    setMenuOpen(false);
    router.push(href);
  };

  const handleToggleExplore = () => {
    if (menuOpen) {
      dismissTutorial();
    }
    setMenuOpen((o) => !o);
  };

  return (
    <>
      {/* Full-screen Dark Blurred Backdrop with Glowing Tactical Cyber Grid */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="explore-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => {
              dismissTutorial();
              setMenuOpen(false);
            }}
            className="fixed inset-0 z-[995] bg-black/85 backdrop-blur-md pointer-events-auto overflow-hidden"
            aria-hidden="true"
          >
            {/* GPU-Optimized Glowing Cyber Tactical Grid */}
            <div className="absolute inset-0 pointer-events-none transform-gpu">
              {/* Static GPU-cached Grid Pattern */}
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(226, 255, 59, 0.16) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(226, 255, 59, 0.16) 1px, transparent 1px)
                  `,
                  backgroundSize: '36px 36px',
                  maskImage: 'radial-gradient(ellipse 95% 85% at 50% 85%, black 35%, transparent 95%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 95% 85% at 50% 85%, black 35%, transparent 95%)',
                }}
              />

              {/* Glowing Grid Intersection Points */}
              <div
                className="absolute inset-0 filter drop-shadow-[0_0_6px_rgba(226,255,59,0.7)] opacity-80"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(226, 255, 59, 0.7) 1.5px, transparent 0)`,
                  backgroundSize: '36px 36px',
                  maskImage: 'radial-gradient(ellipse 85% 75% at 50% 80%, black 25%, transparent 90%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 50% 80%, black 25%, transparent 90%)',
                }}
              />

              {/* Ambient Breathing Tactical Lime Glow radiating from bottom */}
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4 w-[600px] h-[500px] rounded-full bg-gradient-to-t from-[#E2FF3B]/30 via-[#E2FF3B]/10 to-transparent blur-3xl pointer-events-none opacity-80" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={exploreRef}
        className="fixed bottom-0 left-0 right-0 z-[999] pointer-events-none select-none flex flex-col items-center"
      >
        {/* Floating Combat Protocols Tray (Shown when Explore is opened) */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="w-[min(94vw,348px)] mb-3 pointer-events-auto transform-gpu"
            >
              {/* Tactical Glass Tray Container */}
              <div className="relative rounded-[28px] border border-white/10 bg-[#060904]/96 backdrop-blur-2xl px-3 pt-3 pb-4 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(226,255,59,0.15)] flex flex-col items-center overflow-hidden">
                {/* Tactical Radar Concentric Circles & Crosshairs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-[220px] h-[220px] rounded-full border border-[#E2FF3B]/15 pointer-events-none" />
                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-[320px] h-[320px] rounded-full border border-[#E2FF3B]/10 pointer-events-none" />
                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-[420px] h-[420px] rounded-full border border-[#E2FF3B]/[0.06] pointer-events-none" />

                  {/* Rotating Radar Sweep Cone */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[360px] h-[360px] rounded-full origin-bottom pointer-events-none"
                    style={{
                      background: 'conic-gradient(from 180deg at 50% 100%, rgba(226, 255, 59, 0.16) 0deg, transparent 55deg, transparent 360deg)',
                    }}
                  />

                  {/* Radial Crosshairs */}
                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[1px] h-full bg-gradient-to-t from-[#E2FF3B]/25 via-[#E2FF3B]/10 to-transparent pointer-events-none" />
                  <div className="absolute left-1/2 bottom-0 w-[240px] h-[1px] -translate-x-1/2 -rotate-45 origin-bottom bg-gradient-to-r from-transparent via-[#E2FF3B]/15 to-transparent pointer-events-none" />
                  <div className="absolute left-1/2 bottom-0 w-[240px] h-[1px] -translate-x-1/2 rotate-45 origin-bottom bg-gradient-to-r from-transparent via-[#E2FF3B]/15 to-transparent pointer-events-none" />

                  {/* Bottom Center Radial Glow */}
                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/3 w-[180px] h-[140px] rounded-full bg-[#E2FF3B]/25 blur-2xl pointer-events-none" />
                </div>

                {/* Step 2 Tutorial Guidance Banner: Tap Sparring for Free */}
                {tutorialStep === 'sparring' && (
                  <div className="w-[min(90vw,310px)] pointer-events-auto mb-2.5 flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full bg-[#180e05]/95 border border-orange-500/70 shadow-[0_0_25px_rgba(249,115,22,0.45)] backdrop-blur-xl relative z-30 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
                      </span>
                      <span className="text-[10.5px] font-black uppercase tracking-wide text-amber-300 truncate">
                        Select Sparring — 100% Free!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={dismissTutorial}
                      aria-label="Skip Tutorial"
                      className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[9px] font-black text-white uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <span>Skip</span>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Header: Combat Protocols Pill Button */}
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="relative z-10 mb-3.5 flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#10170a] border border-[#E2FF3B]/30 shadow-[0_0_12px_rgba(226,255,59,0.15)] active:scale-95 transition-transform cursor-pointer"
                >
                  <span className="text-[10px] font-mono font-black tracking-widest text-[#E2FF3B] uppercase">
                    COMBAT PROTOCOLS
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#E2FF3B]" />
                </button>

                {/* Grid of Badges + Hexagon Cards */}
                <div className="grid grid-cols-2 gap-3.5 w-full relative z-10 justify-items-center">
                  {/* AI VIDEO COLUMN */}
                  <div className="flex flex-col items-center gap-2 w-full max-w-[144px]">
                    {/* Streak Flame Pill Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#180808] border border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                      <Flame className="w-3.5 h-3.5 fill-red-500 text-red-500 shrink-0" />
                      <span className="text-[11px] font-extrabold text-white leading-none tracking-wide">{streak}</span>
                    </div>

                    {/* AI VIDEO Hexagon Card Button */}
                    <button
                      type="button"
                      onClick={() => go('/vision')}
                      className="relative flex items-center justify-center filter drop-shadow-[0_0_14px_rgba(226,255,59,0.6)] active:scale-95 transition-all group cursor-pointer"
                      style={{ width: 140, height: 152 }}
                    >
                      {/* Hexagon Border */}
                      <div
                        className="w-full h-full bg-gradient-to-b from-[#E2FF3B] via-[#cbf500] to-[#7fa500] group-hover:brightness-110 transition-all"
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      />
                      {/* Inner Content Area */}
                      <div
                        className="absolute inset-[2px] bg-gradient-to-b from-[#111c0c] via-[#091106] to-[#040803] flex flex-col items-center justify-center pt-2"
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      >
                        {/* Black Squircle with Neon Camera Icon */}
                        <div className="w-12 h-12 rounded-[14px] bg-[#000000] border border-[#E2FF3B]/50 flex items-center justify-center shadow-[0_0_12px_rgba(226,255,59,0.35)]">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-6 h-6 text-[#E2FF3B] drop-shadow-[0_0_6px_rgba(226,255,59,0.9)]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="2" y="6" width="13" height="12" rx="3" />
                            <path d="M15 10l5-2.5v9l-5-2.5" />
                          </svg>
                        </div>
                        <span className="mt-2 text-[8.5px] font-black tracking-widest text-[#E2FF3B] uppercase">
                          VISION HUD
                        </span>
                        <span className="text-[13px] font-black text-white tracking-wider uppercase">
                          AI VIDEO
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* SPARRING COLUMN */}
                  <div className="flex flex-col items-center gap-2 w-full max-w-[144px] relative">
                    {/* Step 2 Tutorial Pointer (Anchored directly over SPARRING card) */}
                    {tutorialStep === 'sparring' && (
                      <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-40">
                        <motion.div
                          animate={{ y: [0, 8, 0] }}
                          transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                          className="flex flex-col items-center -space-y-2.5 filter drop-shadow-[0_0_12px_rgba(249,115,22,0.95)]"
                        >
                          <ChevronDown className="w-6 h-6 text-orange-400/70" />
                          <ChevronDown className="w-7 h-7 text-orange-400" />
                        </motion.div>
                        <motion.div
                          animate={{ scale: [0.85, 1.25, 0.85], opacity: [0.5, 0.95, 0.5] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute top-5 w-20 h-20 rounded-2xl border-2 border-orange-500 shadow-[0_0_25px_#EA580C] pointer-events-none"
                        />
                      </div>
                    )}

                    {/* FREE Pill Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#101b08] border border-[#E2FF3B]/80 shadow-[0_0_12px_rgba(226,255,59,0.5)]">
                      <span className="w-2 h-2 rounded-full bg-[#84CC16] shadow-[0_0_6px_#84CC16] shrink-0" />
                      <Lock className="w-3 h-3 text-[#E2FF3B] shrink-0" />
                      <span className="text-[10px] font-black tracking-wider text-[#E2FF3B] leading-none">FREE</span>
                    </div>

                    {/* SPARRING Hexagon Card Button */}
                    <button
                      type="button"
                      onClick={() => go('/spar')}
                      className="relative flex items-center justify-center filter drop-shadow-[0_0_14px_rgba(249,115,22,0.6)] active:scale-95 transition-all group cursor-pointer"
                      style={{ width: 140, height: 152 }}
                    >
                      {/* Hexagon Border */}
                      <div
                        className="w-full h-full bg-gradient-to-b from-[#FB923C] via-[#EA580C] to-[#C2410C] group-hover:brightness-110 transition-all"
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      />
                      {/* Inner Content Area */}
                      <div
                        className="absolute inset-[2px] bg-gradient-to-b from-[#221308] via-[#120a04] to-[#080402] flex flex-col items-center justify-center pt-2"
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      >
                        {/* Black Squircle with Combat Boxers Logo */}
                        <div className="w-12 h-12 rounded-[14px] bg-[#000000] border border-orange-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.35)] p-1">
                          <img
                            src="/images/sparring-icon.png"
                            alt="Sparring"
                            className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                          />
                        </div>
                        <span className="mt-2 text-[8.5px] font-black tracking-widest text-orange-500 uppercase">
                          COMBAT MODE
                        </span>
                        <span className="text-[13px] font-black text-white tracking-wider uppercase">
                          SPARRING
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Bottom Dock Bar with 7 balanced navigation items */}
        <nav
          className="w-full bg-[#020304] border-t border-white/[0.08] grid grid-cols-[1fr_1fr_1fr_64px_1fr_1fr_1fr] items-center px-1 pointer-events-auto shadow-[0_-16px_50px_rgba(0,0,0,0.98)] relative transform-gpu"
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
            {/* Step 1 Tutorial Callout and Concentric Pointer */}
            {tutorialStep === 'explore' && !menuOpen && (
              <>
                {/* Concentric Pulsing Touch Ring around Explore Hexagon */}
                <motion.div
                  animate={{ scale: [0.92, 1.34, 0.92], opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[68px] h-[68px] rounded-full border-2 border-[#E2FF3B] shadow-[0_0_25px_#E2FF3B] pointer-events-none z-30"
                />

                {/* Callout Card & Chevrons directly centered over Explore */}
                <div className="absolute bottom-full mb-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-[1001] w-max max-w-[min(90vw,290px)]">
                  {/* Callout Card */}
                  <div className="w-full pointer-events-auto mb-2 flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full bg-[#0a1205]/95 border border-[#E2FF3B]/80 shadow-[0_0_25px_rgba(226,255,59,0.5)] backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E2FF3B] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E2FF3B]" />
                      </span>
                      <span className="text-[10.5px] font-black uppercase tracking-wide text-[#E2FF3B] truncate">
                        Tap Explore for Free Sparring
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={dismissTutorial}
                      aria-label="Skip Tutorial"
                      className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[9px] font-black text-white uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <span>Skip</span>
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Glowing Tactical Pointer (Animated Chevrons pointing straight down to Explore) */}
                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex flex-col items-center -space-y-2.5 filter drop-shadow-[0_0_12px_rgba(226,255,59,0.95)]"
                  >
                    <ChevronDown className="w-6 h-6 text-[#E2FF3B]/70" />
                    <ChevronDown className="w-7 h-7 text-[#E2FF3B]" />
                  </motion.div>
                </div>
              </>
            )}

            {/* Powerful Aura behind hexagon */}
            <div
              className={twMerge(
                'absolute top-0 w-[60px] h-[60px] rounded-full transition-all duration-500 pointer-events-none',
                menuOpen
                  ? 'bg-[#E2FF3B]/60 scale-150 blur-xl animate-pulse'
                  : isExploreActive
                  ? 'bg-[#E2FF3B]/35 scale-110 blur-md'
                  : 'bg-[#E2FF3B]/15 blur-md',
              )}
            />

            {/* Extra outer pulsing glow ring when opened */}
            {menuOpen && (
              <div className="absolute -top-1 w-[68px] h-[68px] rounded-full border border-[#E2FF3B]/80 animate-ping pointer-events-none opacity-40" />
            )}

            <button
              type="button"
              aria-label="Explore"
              aria-expanded={menuOpen}
              onClick={handleToggleExplore}
              className="relative flex flex-col items-center cursor-pointer active:scale-95 transition-transform group"
            >
              {/* Hexagon Shell */}
              <div
                className={twMerge(
                  'relative flex items-center justify-center bg-gradient-to-b from-[#E2FF3B] via-[#C8F500] to-[#8FB500] transition-all duration-300',
                  menuOpen
                    ? 'shadow-[0_0_25px_rgba(226,255,59,0.95),0_0_50px_rgba(226,255,59,0.6)] brightness-110'
                    : 'shadow-[0_0_20px_rgba(226,255,59,0.6)]',
                )}
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
                  <ExploreDiamond className="w-6 h-6 text-[#E2FF3B] drop-shadow-[0_0_12px_rgba(226,255,59,1)]" />
                </div>
              </div>

              {/* Label */}
              <span
                className={twMerge(
                  'mt-1 text-[9px] font-black tracking-widest uppercase transition-colors',
                  menuOpen || isExploreActive
                    ? 'text-[#E2FF3B] drop-shadow-[0_0_8px_rgba(226,255,59,0.9)]'
                    : 'text-[#E2FF3B]/80',
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
    </>
  );
}
