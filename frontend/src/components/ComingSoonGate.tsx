'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Loader2, Zap } from 'lucide-react';

interface LaunchState {
  launched: boolean;
  launchAt: string;
  serverNow: string;
}

const pad = (value: number) => String(Math.max(0, value)).padStart(2, '0');

export function ComingSoonGate() {
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [notificationState, setNotificationState] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/launch-status', { cache: 'no-store' });
        const data = await response.json();
        if (!cancelled) {
          setLaunch(data);
          setNow(new Date(data.serverNow).getTime());
        }
      } catch { }
    };
    load();
    const interval = window.setInterval(load, 30000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const remaining = useMemo(() => {
    if (!launch) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const seconds = Math.max(0, Math.ceil((new Date(launch.launchAt).getTime() - now) / 1000));
    return {
      days: Math.floor(seconds / 86400),
      hours: Math.floor((seconds % 86400) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      seconds: seconds % 60,
    };
  }, [launch, now]);

  useEffect(() => {
    if (launch?.launched) window.location.reload();
  }, [launch?.launched]);

  const enableNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotificationState('unsupported');
      return;
    }
    setNotificationState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotificationState('denied');
        return;
      }
      await navigator.serviceWorker.register('/launch-notifications.js');
      setNotificationState('granted');
    } catch {
      setNotificationState('denied');
    }
  };

  if (!launch) {
    return <div className="flex min-h-screen items-center justify-center bg-[#070907]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070907] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(226,255,59,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.12),transparent_40%)]" />
      <section className="relative z-10 w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary shadow-[0_0_30px_rgba(226,255,59,0.2)]">
          <Zap className="h-7 w-7" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">SPARAI ONLINE LAUNCH</p>
        <h1 className="mt-4 text-5xl font-black italic uppercase leading-[0.9] tracking-tight">Coming <span className="text-primary">Soon.</span></h1>
        <p className="mx-auto mt-5 max-w-md text-sm font-semibold leading-relaxed text-white/60">Your fighter dashboard, AI vision, daily grind, and live sparring arena are being unlocked.</p>
        <div className="mt-8 grid grid-cols-4 gap-2">
          {[
            ['DAYS', remaining.days],
            ['HOURS', remaining.hours],
            ['MINUTES', remaining.minutes],
            ['SECONDS', remaining.seconds],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/40 px-2 py-4">
              <div className="text-2xl font-black text-primary">{label === 'DAYS' ? value : pad(Number(value))}</div>
              <div className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/40">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-white/35">Launches automatically at 12:00 AM IST</p>
        <button onClick={enableNotifications} disabled={notificationState === 'loading' || notificationState === 'granted'} className="mx-auto mt-8 flex h-12 items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-5 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/20 disabled:opacity-70">
          {notificationState === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : notificationState === 'granted' ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {notificationState === 'granted' ? 'Launch notifications enabled' : notificationState === 'denied' ? 'Notifications blocked' : notificationState === 'unsupported' ? 'Notifications unavailable' : 'Notify me when SparAI goes live'}
        </button>
        <p className="mt-4 text-[10px] font-semibold text-white/35">You can change notification permission in your browser settings.</p>
      </section>
    </main>
  );
}
