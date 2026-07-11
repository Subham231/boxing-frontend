'use client';

import React from 'react';
import { HudHeader } from './HudHeader';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-bg-dark text-white flex flex-col">
      {/* Scanline pattern overlay (design touch) */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-[9999] opacity-15"></div>
      
      {/* Telemetry Header */}
      <HudHeader />
      
      {/* Main content body with standard mobile-constrained width */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-20 pb-[120px] flex flex-col">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
