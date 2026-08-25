import React from 'react';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverGlow?: boolean;
}

export function GlassCard({ children, className, hoverGlow = false, ...props }: GlassCardProps) {
  return (
    <div
      className={twMerge(
        "glass-card relative overflow-hidden rounded-3xl p-6 transition-all duration-300",
        hoverGlow && "hover:border-primary/40 hover:shadow-[0_0_30px_rgba(226,255,59,0.15)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
