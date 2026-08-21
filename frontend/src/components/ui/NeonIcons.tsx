import React from 'react';
import { twMerge } from 'tailwind-merge';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
  glow?: boolean;
}

/** Electric Lime Diamond / Gem Shape (used on Explore button) */
export function ExploreDiamond({ className, size = 26, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_10px_rgba(226,255,59,0.95)]', className)}
      {...props}
    >
      <path d="M12 2.2 L20.5 9.5 L12 21.8 L3.5 9.5 Z" fill="#E2FF3B" stroke="none" />
      <path d="M12 6.5 L16.8 10.2 L12 17.2 L7.2 10.2 Z" fill="#0A0D08" opacity="0.65" stroke="none" />
    </svg>
  );
}

/** Home Icon */
export function HomeNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

/** 3-Bar Chart Icon for Progress */
export function BarChart3Icon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

/** Guru / AI Brain Icon */
export function BrainNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M12 5v13" />
      <path d="M16 8h2a2 2 0 0 1 2 2v1" />
      <path d="M8 8H6a2 2 0 0 0-2 2v1" />
    </svg>
  );
}

/** Reflex / Speed Zap Lightning Bolt */
export function ZapNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/** Calendar / Planner Icon */
export function CalendarNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/** Profile / User Icon */
export function UserNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/** Crossed Swords (Combat / Sparring) */
export function SwordsNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="11" y2="8" />
      <line x1="7" y1="17" x2="4" y2="20" />
      <line x1="3" y1="19" x2="5" y2="21" />
    </svg>
  );
}

/** Dumbbell Icon for Workouts */
export function DumbbellBarIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <path d="M6.5 6.5h11" />
      <path d="M6.5 17.5h11" />
      <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
      <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
      <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2.5" />
    </svg>
  );
}

/** Target Crosshair (Drills & Accuracy) */
export function TargetNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

/** Combat Shield */
export function ShieldNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.8)]', className)}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/** Flame (Streak & Motivation) */
export function FlameNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(245,158,11,0.85)]', className)}
      {...props}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

/** Trophy (Leaderboard & Victory) */
export function TrophyNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.85)]', className)}
      {...props}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-2c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v6a6 6 0 0 1-12 0V4Z" />
    </svg>
  );
}

/** Crown (Tier & Elite Status) */
export function CrownNeonIcon({ className, size = 22, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={twMerge('inline-block transition-all duration-200', glow && 'drop-shadow-[0_0_8px_rgba(226,255,59,0.85)]', className)}
      {...props}
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

/** Video Camera with Light Burst Rays (AI Video Analysis card) */
export function AnalysisCamIcon({ className, size = 28, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 28 24"
      width={size}
      height={(size * 24) / 28}
      className={twMerge('inline-block transition-all duration-200 shrink-0', glow && 'drop-shadow-[0_0_10px_rgba(226,255,59,0.9)]', className)}
      {...props}
    >
      {/* Light Burst Rays */}
      <line x1="3.5" y1="3.5" x2="5.5" y2="5.5" stroke="#E2FF3B" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9" y1="1.5" x2="9" y2="4.5" stroke="#E2FF3B" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14.5" y1="3.5" x2="12.5" y2="5.5" stroke="#E2FF3B" strokeWidth="1.8" strokeLinecap="round" />

      {/* Main Camera Body */}
      <rect x="2" y="7" width="16" height="13" rx="3.5" fill="#E2FF3B" />

      {/* Lens Funnel */}
      <path d="M18 11.5 L25 8 V19 L18 15.5 Z" fill="#E2FF3B" />

      {/* Play Triangle Inside Camera */}
      <polygon points="7.5,10.5 12.5,13.5 7.5,16.5" fill="#080B06" />
    </svg>
  );
}

/** Boxing Gloves Pair (Sparring card) matching reference design */
export function BoxingGlovesIcon({ className, size = 28, glow = true, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 26"
      width={size}
      height={(size * 26) / 32}
      className={twMerge('inline-block transition-all duration-200 shrink-0', glow && 'drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]', className)}
      {...props}
    >
      {/* Left Glove */}
      <g transform="translate(1, 2) rotate(-18 8 10)">
        {/* Main Glove Fist */}
        <path
          d="M4 6 C4 2.5 7 1 10.5 1 C14 1 16 3 16 6.5 C16 10 13.5 12.5 10 12.5 C8.5 12.5 7.5 12 6.5 11 L6.5 14 L3 14 L3 8 C3 7 3.5 6.5 4 6 Z"
          fill="#F59E0B"
        />
        {/* Thumb */}
        <path
          d="M4 6.5 C2.5 6.5 1.5 8 1.5 9.5 C1.5 11 2.8 11.8 4.2 11.8 L4.5 10 C3.8 10 3.2 9.5 3.2 9 C3.2 8.3 3.6 7.8 4.2 7.8 Z"
          fill="#D97706"
        />
        {/* Cuff Ribbing */}
        <rect x="2.5" y="13.5" width="4.5" height="4.5" rx="1" fill="#F59E0B" />
        <line x1="2.5" y1="15.5" x2="7" y2="15.5" stroke="#080B06" strokeWidth="1" />
      </g>

      {/* Right Glove */}
      <g transform="translate(14, 2) rotate(18 8 10)">
        {/* Main Glove Fist */}
        <path
          d="M12 6 C12 2.5 9 1 5.5 1 C2 1 0 3 0 6.5 C0 10 2.5 12.5 6 12.5 C7.5 12.5 8.5 12 9.5 11 L9.5 14 L13 14 L13 8 C13 7 12.5 6.5 12 6 Z"
          fill="#F59E0B"
        />
        {/* Thumb */}
        <path
          d="M12 6.5 C13.5 6.5 14.5 8 14.5 9.5 C14.5 11 13.2 11.8 11.8 11.8 L11.5 10 C12.2 10 12.8 9.5 12.8 9 C12.8 8.3 12.4 7.8 11.8 7.8 Z"
          fill="#D97706"
        />
        {/* Cuff Ribbing */}
        <rect x="9" y="13.5" width="4.5" height="4.5" rx="1" fill="#F59E0B" />
        <line x1="9" y1="15.5" x2="13.5" y2="15.5" stroke="#080B06" strokeWidth="1" />
      </g>
    </svg>
  );
}

/** Neon Glow Wrapper for any Icon */
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
