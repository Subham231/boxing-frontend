'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Brain, Play, Zap, Calendar, User, Flame } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export function BottomNav() {
  const pathname = usePathname();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('boxing_streak_data');
      if (stored) {
        const data = JSON.parse(stored);
        setStreak(data.currentStreak || 0);
      }
    } catch (e) {
      console.error('Failed to load streak data:', e);
    }
  }, []);

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
    <nav className="fixed bottom-0 left-0 w-full h-[90px] bg-[#08090b] border-t border-white/10 grid grid-cols-[1fr_1fr_1fr_70px_1fr_1fr_1fr] items-center px-1 z-[999] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link key={item.label} href={item.href} className={twMerge(
            "flex flex-col items-center justify-center gap-1.5 no-underline transition-all duration-200",
            active ? "opacity-100 text-primary" : "opacity-40 text-white hover:opacity-70"
          )}>
            <Icon className={twMerge("w-5 h-5", active && "drop-shadow-[0_0_8px_var(--primary)]")} />
            <span className="text-[9px] font-black tracking-wider uppercase">{item.label}</span>
          </Link>
        );
      })}

      {/* Hex Video Button */}
      <Link href="/vision" className="relative -top-5 flex flex-col items-center cursor-pointer z-[1000] no-underline group select-none">
        {/* Streak badge */}
        <div className="absolute -top-3.5 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 text-black font-black text-[8px] tracking-wider shadow-[0_0_8px_rgba(249,115,22,0.4)]">
          <Flame className="w-2.5 h-2.5 fill-black stroke-none" />
          <span>{streak}</span>
        </div>

        <div className="w-[58px] relative bg-black transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:rotate-6 flex items-center justify-center shadow-[0_0_15px_rgba(226,255,59,0.25)] border border-primary/20"
             style={{
               clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
               height: '64px'
             }}>
          <div className="absolute inset-[2px] bg-black z-10 flex items-center justify-center"
               style={{
                 clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
               }}>
            <Play className="w-5 h-5 text-primary fill-primary/20 drop-shadow-[0_0_5px_rgba(226,255,59,0.8)]" />
          </div>
        </div>
        <span className="mt-2.5 text-[9px] font-black tracking-wider text-primary uppercase">VIDEO</span>
      </Link>

      {rightNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link key={item.label} href={item.href} className={twMerge(
            "flex flex-col items-center justify-center gap-1.5 no-underline transition-all duration-200",
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
