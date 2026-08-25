import React from 'react';
import { twMerge } from 'tailwind-merge';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  glow?: boolean;
}

export function NeonButton({
  children,
  className,
  variant = 'primary',
  glow = true,
  ...props
}: NeonButtonProps) {
  return (
    <button
      className={twMerge(
        "relative flex items-center justify-center gap-2 px-6 py-3.5 font-bold uppercase tracking-wider text-sm rounded-full transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        
        // Variants
        variant === 'primary' && "bg-primary text-black hover:bg-primary/95",
        variant === 'secondary' && "bg-white text-black hover:bg-white/90",
        variant === 'outline' && "bg-transparent text-white border border-white/20 hover:border-white/40 hover:bg-white/5",
        variant === 'ghost' && "bg-transparent text-white/60 hover:text-white hover:bg-white/5",

        // Glow
        variant === 'primary' && glow && "hover:shadow-[0_0_30px_rgba(226,255,59,0.45)]",
        variant === 'secondary' && glow && "hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]",

        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
