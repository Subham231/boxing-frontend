'use client';

import React, { Suspense } from 'react';
import SparMatchClient from './SparMatchClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] text-white/40 flex items-center justify-center text-xs font-black uppercase tracking-widest">
          Loading match…
        </div>
      }
    >
      <SparMatchClient />
    </Suspense>
  );
}
