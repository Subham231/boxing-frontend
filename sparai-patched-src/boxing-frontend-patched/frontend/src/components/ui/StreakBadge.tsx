import React from 'react';
import { Flame } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface StreakBadgeProps {
  streak: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakBadge({ streak, className, size = 'md' }: StreakBadgeProps) {
  return (
    <div
      className={twMerge(
        "inline-flex items-center gap-1.5 rounded-full font-black text-black bg-gradient-to-r from-orange-500 to-yellow-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]",
        size === 'sm' && "px-2 py-0.5 text-xs",
        size === 'md' && "px-3.5 py-1.5 text-sm",
        size === 'lg' && "px-5 py-2.5 text-lg",
        className
      )}
    >
      <Flame className={twMerge(
        "fill-black stroke-none",
        size === 'sm' && "w-3.5 h-3.5",
        size === 'md' && "w-4.5 h-4.5",
        size === 'lg' && "w-6 h-6"
      )} />
      <span>{streak} DAY{streak !== 1 ? 'S' : ''}</span>
    </div>
  );
}
