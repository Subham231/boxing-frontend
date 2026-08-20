import React from 'react';
import { twMerge } from 'tailwind-merge';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
  glow?: boolean;
}

const baseSvg =
  'inline-block stroke-current fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round transition-all duration-200';

/** Electric Lime Diamond / Gem Shape (used on Explore button & stats) */
export function ExploreDiamond({ className, size = 26, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={twMerge(baseSvg, glow && 'drop-shadow-[0_0_10px_rgba(226,255,59,0.9)]', className)}
      {...props}
    >
      <path d="M12 2.2 L20.5 9.5 L12 21.8 L3.5 9.5 Z" fill="currentColor" fillOpacity="0.95" stroke="none" />
      <path d="M12 6.5 L16.8 10.2 L12 17.2 L7.2 10.2 Z" fill="#0A0D08" fillOpacity="0.6" stroke="none" />
    </svg>
  );
}

/** Video Camera with Light Burst Rays (AI Video Analysis card) */
export function AnalysisCamIcon({ className, size = 34, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={twMerge(baseSvg, glow && 'drop-shadow-[0_0_12px_rgba(226,255,59,0.85)]', className)}
      {...props}
    >
      {/* Light Burst Rays */}
      <path d="M7 6 L9 8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 4 L14 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M21 6 L19 8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />

      {/* Main Camera Body */}
      <rect x="3" y="11" width="22" height="18" rx="5" fill="currentColor" fillOpacity="0.95" stroke="none" />

      {/* Lens Funnel */}
      <path d="M25 17 L36 12 V28 L25 23 Z" fill="currentColor" fillOpacity="0.95" stroke="none" />

      {/* Play Triangle Inside Camera */}
      <polygon points="10.5,15.5 18,20 10.5,24.5" fill="#0A0D08" />
    </svg>
  );
}

/** Boxing Gloves Pair (Sparring card) */
export function BoxingGlovesIcon({ className, size = 34, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={twMerge(baseSvg, glow && 'drop-shadow-[0_0_12px_rgba(245,158,11,0.85)]', className)}
      {...props}
    >
      {/* Left Glove */}
      <path
        d="M15 19 C15 13 11 9 7 12 C3 15 3 21 6 25.5 C8.5 28 11 27.5 13 26 L14 30 L18.5 29 L17.5 24.5 C17.5 22 15 21 15 19 Z"
        fill="currentColor"
        fillOpacity="0.95"
        stroke="none"
      />
      {/* Right Glove */}
      <path
        d="M24 19 C24 13 28 9 32 12 C36 15 36 21 33 25.5 C30.5 28 28 27.5 26 26 L25 30 L20.5 29 L21.5 24.5 C21.5 22 24 21 24 19 Z"
        fill="currentColor"
        fillOpacity="0.95"
        stroke="none"
      />
      {/* Contrast Stitching */}
      <path d="M13.5 17 L10 18" stroke="#0A0D08" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M25.5 17 L29 18" stroke="#0A0D08" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** 3-Bar Chart Icon for Progress (Vertical bars) */
export function BarChart3Icon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={twMerge(baseSvg, className)} {...props}>
      <rect x="17" y="4" width="3.5" height="16" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="10.25" y="9" width="3.5" height="11" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="3.5" y="14" width="3.5" height="6" rx="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Dumbbell Icon for Workouts */
export function DumbbellBarIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={twMerge(baseSvg, className)} {...props}>
      {/* Center bar */}
      <rect x="7" y="10.5" width="10" height="3" rx="1" fill="currentColor" stroke="none" />
      {/* Left weights */}
      <rect x="4" y="7" width="2.5" height="10" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="1.5" y="8.5" width="2" height="7" rx="1" fill="currentColor" stroke="none" />
      {/* Right weights */}
      <rect x="17.5" y="7" width="2.5" height="10" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="20.5" y="8.5" width="2" height="7" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Neon Glow Wrapper for icons */
export function NeonIconWrapper({
  children,
  color = 'lime',
  size = 'md',
  className,
}: {
  children: React.ReactNode;
  color?: 'lime' | 'orange' | 'cyan' | 'purple' | 'red';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const colorMap = {
    lime: 'text-[#E2FF3B] drop-shadow-[0_0_8px_rgba(226,255,59,0.7)]',
    orange: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.7)]',
    cyan: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]',
    purple: 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.7)]',
    red: 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.7)]',
  };

  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  return (
    <div className={twMerge('inline-flex items-center justify-center transform-gpu', colorMap[color], sizeMap[size], className)}>
      {children}
    </div>
  );
}
