import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number; // width/height in px
  strokeWidth?: number;
  className?: string;
  glow?: boolean;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  glow = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className={twMerge("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {/* Background Circle */}
        <circle
          className="text-white/5"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Foreground Circle */}
        <circle
          className="text-primary transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            filter: glow ? 'drop-shadow(0 0 6px rgba(226, 255, 59, 0.6))' : 'none',
          }}
        />
      </svg>
      {/* Center content slot */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black tracking-tight text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
