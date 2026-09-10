'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  // Live camera sessions: AI Video Analysis (/vision) and Live 1v1 Sparring Match (/spar/match)
  const isLiveSession = pathname.startsWith('/spar/match') || pathname.startsWith('/vision');

  return (
    <div className="relative min-h-screen bg-bg-dark text-white flex flex-col">
      {/* Scanline pattern overlay (only on standard pages to preserve camera FPS on live sessions) */}
      {!isLiveSession && (
        <div className="fixed inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-[9999] opacity-15" />
      )}

      {/* Main content body */}
      <main
        className={`flex-1 w-full mx-auto flex flex-col ${
          isLiveSession
            ? 'max-w-none p-0 pb-0 h-screen overflow-hidden'
            : 'max-w-md pb-[120px] px-4 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)]'
        }`}
      >
        {children}
      </main>

      {/* Bottom Navigation Dock (Hidden during live vision/sparring sessions so Pause and Terminate controls show) */}
      {!isLiveSession && <BottomNav />}
    </div>
  );
}
