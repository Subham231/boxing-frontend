'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flame, Power } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';

const FinalPromise: React.FC = () => {
  const router = useRouter();
  const { data, prevStep, syncToSupabase } = useOnboarding();
  const [launching, setLaunching] = useState(false);

  const handleLaunch = async () => {
    setLaunching(true);
    await syncToSupabase();
    router.replace('/dashboard');
  };

  return (
    <div className="relative flex flex-col min-h-[85vh] justify-between py-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-primary/30"
            style={{ width: 2, height: 2, left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ opacity: [0.1, 0.5, 0.1], y: [0, -12, 0] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>

      <StepBadge className="relative z-10" />

      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-left"
      >
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
          <Flame className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-4xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          {data.ringName ? <>Welcome, <span className="text-primary">{data.ringName}</span>.</> : <>You're <span className="text-primary">verified</span>.</>}
        </h1>
        <p className="text-white/50 mt-5 text-sm leading-relaxed font-semibold pr-4">
          Identity confirmed. Your Tactical Protocol is waiting — the only thing left is to walk
          through the door and start.
        </p>
      </motion.header>

      <motion.footer
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="relative z-10 mt-10 flex flex-col gap-4"
      >
        <button
          onClick={handleLaunch}
          disabled={launching}
          className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_10px_40px_rgba(226,255,59,0.25)]"
        >
          {launching ? 'ENTERING THE RING...' : (
            <>
              ENTER THE RING <Power size={22} />
            </>
          )}
        </button>
        <button onClick={prevStep} disabled={launching} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </motion.footer>
    </div>
  );
};

export default FinalPromise;
