'use client';

import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

export function HudHeader() {
  const [userName, setUserName] = useState('UNKNWN');
  const [bpm, setBpm] = useState(92);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('boxing_onboarding_data');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.ring_name) {
          setUserName(data.ring_name.toUpperCase());
        } else if (data.ringName) {
          setUserName(data.ringName.toUpperCase());
        }
      }
    } catch (e) {
      console.error('Failed to load user name for HUD:', e);
    }

    const interval = setInterval(() => {
      setBpm(Math.floor(Math.random() * (98 - 90 + 1)) + 90);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full z-[1000] pt-[env(safe-area-inset-top,20px)] px-5 py-4 flex justify-between items-start pointer-events-none select-none">
      <div className="font-mono text-[10px] text-primary font-extrabold tracking-wider">
        <div className="animate-pulse">SYS_ID: <span className="text-white">{userName}</span></div>
        <div className="opacity-50 mt-0.5">STATUS: <span className="animate-pulse">MONITORING...</span></div>
      </div>
      
      <div className="text-right text-[#ff2d55] font-mono text-sm font-black flex items-center gap-1.5">
        <Heart className="w-4 h-4 fill-[#ff2d55] stroke-none animate-pulse" />
        <span className="text-[10px] tracking-wider">{bpm}_BPM</span>
      </div>
    </div>
  );
}
