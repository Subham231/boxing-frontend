'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Brain, Play, Zap, Calendar, User, Flame } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useRankState } from '@/lib/rank-client';

export function BottomNav() {
  const pathname = usePathname();
  const { rankState } = useRankState();
  const streak = rankState?.current_streak ?? 0;

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
          <Link key={item.label} href={item.href} aria-label={item.label} aria-current={active ? 'page' : undefined} className={twMerge(
            "flex flex-col items-center justify-center gap-1.5 no-underline transition-all duration-200 min-w-[44px] min-h-[44px]",
            active ? "opacity-100 text-primary" : "opacity-40 text-white hover:opacity-70"
          )}>
            <Icon className={twMerge("w-5 h-5", active && "drop-shadow-[0_0_8px_var(--primary)]")} />
            <span className="text-[9px] font-black tracking-wider uppercase">{item.label}</span>
          </Link>
        );
      })}

      {/* Hex Video / AI Analysis Button */}
      <Link href="/vision" aria-label="AI Video Analysis" className="relative -top-6 flex flex-col items-center cursor-pointer z-[1000] no-underline group select-none">
        {/* Streak badge */}
        <div className="absolute -top-4 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 text-black font-black text-[8px] tracking-wider shadow-[0_0_12px_rgba(249,115,22,0.6)] animate-pulse stealth-sensitive z-20">
          <Flame className="w-2.5 h-2.5 fill-black stroke-none" />
          <span>{streak}</span>
        </div>

        {/* Outer Pulsing Neon Glow */}
        <div className="absolute top-0 w-[64px] h-[70px] bg-primary/40 rounded-full blur-md group-hover:bg-primary/70 transition-all duration-500 animate-pulse" />

        <div
          className="w-[62px] relative bg-gradient-to-b from-primary via-primary/80 to-amber-400 transition-all duration-300 group-hover:scale-110 group-active:scale-95 flex items-center justify-center shadow-[0_0_25px_rgba(226,255,59,0.6)]"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            height: '68px',
          }}
        >
          <div
            className="absolute inset-[2.5px] bg-[#0A0D08] z-10 flex flex-col items-center justify-center gap-0.5 group-hover:bg-[#12160d] transition-colors"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          >
            <div className="relative">
              <Play className="w-5 h-5 text-primary fill-primary/30 drop-shadow-[0_0_10px_rgba(226,255,59,1)] group-hover:scale-110 transition-transform" />
              <Zap className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
            </div>
          </div>
        </div>
        <span className="mt-1 text-[9px] font-black tracking-widest text-primary uppercase drop-shadow-[0_0_8px_rgba(226,255,59,0.7)] group-hover:text-white transition-colors">
          AI VISION
        </span>
      </Link>

      {rightNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link key={item.label} href={item.href} aria-label={item.label} aria-current={active ? 'page' : undefined} className={twMerge(
            "flex flex-col items-center justify-center gap-1.5 no-underline transition-all duration-200 min-w-[44px] min-h-[44px]",
            active ? "opacity-100 text-primary" : "opacity-40 text-white hover:opacity-70"
          )}>
            <Icon className={twMerge("w-5 h-5", active && "drop-shadow-[0_0_8px_var(--primary)]")} />
            <span className="text-[9px] font-black tracking-wider uppercase">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
