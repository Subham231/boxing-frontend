'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sun, CloudSun, Moon, Ghost, Clock } from 'lucide-react';
import type { PlannerProfile } from '@/types';

const PEAK_CHOICES = [
  { key: 'MORNING', icon: Sun, label: 'Morning Warrior', time: '5:00 AM – 11:00 AM', desc: 'Discipline & consistency' },
  { key: 'AFTERNOON', icon: CloudSun, label: 'Afternoon Session', time: '11:00 AM – 5:00 PM', desc: 'Flexible, balanced energy' },
  { key: 'EVENING', icon: Moon, label: 'Evening Grind', time: '5:00 PM – 10:00 PM', desc: 'Focused after work/school' },
  { key: 'NIGHT', icon: Ghost, label: 'Night Owl', time: '10:00 PM – 2:00 AM', desc: 'Performs best late at night' },
];

const DURATIONS = [
  { minutes: 20, emoji: '⚡' },
  { minutes: 30, emoji: '🥊' },
  { minutes: 45, emoji: '🔥' },
  { minutes: 60, emoji: '💪' },
  { minutes: 90, emoji: '🏆' },
];

const WEEKDAYS = [
  { key: 'MON', label: 'Monday' },
  { key: 'TUE', label: 'Tuesday' },
  { key: 'WED', label: 'Wednesday' },
  { key: 'THU', label: 'Thursday' },
  { key: 'FRI', label: 'Friday' },
  { key: 'SAT', label: 'Saturday' },
  { key: 'SUN', label: 'Sunday' },
];

const TIME_RANGES: Record<string, [number, number]> = {
  MORNING: [5, 11],
  AFTERNOON: [11, 17],
  EVENING: [17, 22],
  NIGHT: [22, 26], // wraps past midnight
};

function generateTimeOptions(peakWindow: string): string[] {
  const [startH, endH] = TIME_RANGES[peakWindow] || TIME_RANGES.MORNING;
  const options: string[] = [];
  for (let h = startH; h < endH; h++) {
    const hour = h % 24;
    for (const m of [0, 30]) {
      const ap = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      options.push(`${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`);
    }
  }
  return options;
}

function to24Hour(display: string): string {
  const match = display.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return '07:30';
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ap = match[3].toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

function to12Hour(value: string): string {
  const [hStr, m] = value.split(':');
  let h = parseInt(hStr, 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ap}`;
}

interface ScheduleStepProps {
  profile: PlannerProfile;
  update: (patch: Partial<PlannerProfile>) => void;
  toggleWeekday: (day: string) => void;
}

export default function ScheduleStep({ profile, update, toggleWeekday }: ScheduleStepProps) {
  const timeOptions = useMemo(() => generateTimeOptions(profile.peakWindow || 'MORNING'), [profile.peakWindow]);
  const selectedDays = profile.trainingDays || [];

  const estimatedWeeklyMinutes = (profile.minutesPerSession || 30) * selectedDays.length;
  const hours = Math.floor(estimatedWeeklyMinutes / 60);
  const mins = estimatedWeeklyMinutes % 60;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="text-[9px] font-black text-primary tracking-widest uppercase block mb-3">Preferred Training Period</label>
        <div className="grid grid-cols-2 gap-3">
          {PEAK_CHOICES.map((choice) => {
            const Icon = choice.icon;
            const active = profile.peakWindow === choice.key;
            return (
              <button
                key={choice.key}
                type="button"
                onClick={() => update({ peakWindow: choice.key, preferredTime: to24Hour(generateTimeOptions(choice.key)[0]) })}
                className={`flex flex-col items-start gap-1.5 p-4 rounded-3xl border text-left transition-all duration-300 ${
                  active ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-white/40'}`} />
                <span className={`text-[11px] font-black uppercase ${active ? 'text-primary' : 'text-white/70'}`}>{choice.label}</span>
                <span className="text-[8px] text-white/30 font-semibold">{choice.time}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[9px] font-black text-primary tracking-widest uppercase block mb-3">Preferred Start Time</label>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {timeOptions.map((t) => {
            const active = to24Hour(t) === profile.preferredTime;
            return (
              <button
                key={t}
                type="button"
                onClick={() => update({ preferredTime: to24Hour(t) })}
                className={`shrink-0 px-4 py-2.5 rounded-full border text-[11px] font-black uppercase tracking-wide transition-all ${
                  active ? 'bg-primary/10 border-primary text-primary' : 'bg-black/30 border-white/10 text-white/50 hover:border-white/20'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[9px] font-black text-primary tracking-widest uppercase block mb-3">How long can you realistically train?</label>
        <div className="flex gap-2 flex-wrap">
          {DURATIONS.map((d) => {
            const active = profile.minutesPerSession === d.minutes;
            return (
              <button
                key={d.minutes}
                type="button"
                onClick={() => update({ minutesPerSession: d.minutes })}
                className={`px-4 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-wide transition-all flex items-center gap-2 ${
                  active ? 'bg-primary/10 border-primary text-primary' : 'bg-black/30 border-white/10 text-white/50 hover:border-white/20'
                }`}
              >
                <span>{d.emoji}</span> {d.minutes} Min
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[9px] font-black text-primary tracking-widest uppercase block mb-3">Weekly Training Days</label>
        <div className="flex gap-1.5 flex-wrap">
          {WEEKDAYS.map((d) => {
            const active = selectedDays.includes(d.key);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => toggleWeekday(d.key)}
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-[10px] font-black uppercase transition-all ${
                  active ? 'bg-primary text-black border-primary' : 'bg-black/30 border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                {d.key.slice(0, 2)}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-white/40 font-semibold mt-2">
          You'll train <span className="text-primary font-black">{selectedDays.length}</span> {selectedDays.length === 1 ? 'day' : 'days'} each week.
        </p>
      </div>

      {/* Live AI Preview */}
      <motion.div
        key={`${profile.peakWindow}-${profile.preferredTime}-${profile.minutesPerSession}-${selectedDays.join(',')}`}
        initial={{ opacity: 0.4, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="glass-card p-5 rounded-3xl border-primary/20 bg-primary/[0.04] flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black text-primary uppercase tracking-wide">Your Weekly Training Schedule</span>
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
          <span className="text-white/40 font-bold uppercase">Start Time</span>
          <span className="text-white font-black text-right">{profile.preferredTime ? to12Hour(profile.preferredTime) : '—'}</span>
          <span className="text-white/40 font-bold uppercase">Session Length</span>
          <span className="text-white font-black text-right">{profile.minutesPerSession || 30} Minutes</span>
          <span className="text-white/40 font-bold uppercase">Weekly Sessions</span>
          <span className="text-white font-black text-right">{selectedDays.length}</span>
          <span className="text-white/40 font-bold uppercase">Est. Weekly Time</span>
          <span className="text-white font-black text-right">{hours}h {mins}m</span>
          <span className="text-white/40 font-bold uppercase">Adaptive Schedule</span>
          <span className="text-primary font-black text-right">Enabled</span>
        </div>
      </motion.div>
    </div>
  );
}
