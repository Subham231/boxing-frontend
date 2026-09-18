'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Brain, Check, Circle, RotateCcw, Zap } from 'lucide-react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

type Punch = {
  index: number;
  speed: number;
  power: number;
  reaction: number;
  form: number;
  rotation: number;
  hip: number;
  knee: number;
  weight: number;
  pivot: number;
  hit: boolean;
};

const TOTAL_PUNCHES = 10168;
const BIN_COUNT = 48;

function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function makePunches(): Punch[] {
  const next = random(10168);
  return Array.from({ length: TOTAL_PUNCHES }, (_, index) => {
    const poorForm = next() < 0.07;
    return {
      index: index + 1,
      speed: Math.round((poorForm ? 520 : 690) + next() * (poorForm ? 170 : 230)),
      power: Math.round((poorForm ? 76 : 90) + next() * (poorForm ? 12 : 10)),
      reaction: Math.round((poorForm ? 390 : 255) + next() * (poorForm ? 190 : 190)),
      form: Math.round((poorForm ? 72 : 91) + next() * (poorForm ? 12 : 9)),
      rotation: Math.round((poorForm ? 70 : 91) + next() * (poorForm ? 14 : 9)),
      hip: Math.round((poorForm ? 68 : 89) + next() * (poorForm ? 16 : 11)),
      knee: Math.round((poorForm ? 70 : 90) + next() * (poorForm ? 15 : 10)),
      weight: Math.round((poorForm ? 69 : 89) + next() * (poorForm ? 16 : 11)),
      pivot: Math.round((poorForm ? 68 : 88) + next() * (poorForm ? 17 : 12)),
      hit: next() > (poorForm ? 0.12 : 0.015),
    };
  });
}

function path(values: number[], height = 130, width = 640) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 18) - 9;
    return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function Ring({ label, value }: { label: string; value: number }) {
  const radius = 29;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] py-4">
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
          <circle cx="38" cy="38" r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
          <circle cx="38" cy="38" r={radius} fill="none" stroke="#e2ff3b" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{Math.round(value)}%</span>
      </div>
      <span className="text-[8px] font-black uppercase tracking-widest text-white/50">{label}</span>
    </div>
  );
}

export default function TenKAnalysisPage() {
  const [punches] = useState<Punch[]>(makePunches);
  const [page, setPage] = useState(1);
  const [showOnlyPoorForm, setShowOnlyPoorForm] = useState(false);
  const pageSize = 18;

  const report = useMemo(() => {
    const hits = punches.filter((punch) => punch.hit);
    const accuracy = (hits.length / punches.length) * 100;
    const power = average(punches.map((punch) => punch.power));
    const avgReaction = average(punches.map((punch) => punch.reaction));
    const reflex = Math.max(0, Math.min(100, 100 - (avgReaction - 250) / 16));
    const form = average(punches.map((punch) => punch.form));
    const rotation = average(punches.map((punch) => punch.rotation));
    const hip = average(punches.map((punch) => punch.hip));
    const knee = average(punches.map((punch) => punch.knee));
    const weight = average(punches.map((punch) => punch.weight));
    const pivot = average(punches.map((punch) => punch.pivot));
    const stability = Math.max(0, 100 - Math.sqrt(average(punches.map((punch) => (punch.form - form) ** 2))) * 1.55);
    const overall = average([accuracy, power, reflex, stability, rotation, hip, knee, weight, pivot]);
    const bins = Array.from({ length: BIN_COUNT }, (_, index) => {
      const start = Math.floor(index * punches.length / BIN_COUNT);
      const end = Math.floor((index + 1) * punches.length / BIN_COUNT);
      const slice = punches.slice(start, end);
      return { speed: average(slice.map((punch) => punch.speed)), power: average(slice.map((punch) => punch.power)), form: average(slice.map((punch) => punch.form)), reflex: Math.max(0, Math.min(100, 100 - (average(slice.map((punch) => punch.reaction)) - 250) / 16)) };
    });
    return { accuracy, power, avgReaction, reflex, form, rotation, hip, knee, weight, pivot, stability, overall, bins, hits };
  }, [punches]);

  const filtered = showOnlyPoorForm ? punches.filter((punch) => punch.form < 80) : punches;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const poorCount = punches.filter((punch) => punch.form < 80).length;
  const setPoorFilter = (value: boolean) => { setShowOnlyPoorForm(value); setPage(1); };

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-16">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link href="/vision" className="mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> AI Vision</Link>
            <span className="block text-[9px] font-black uppercase tracking-[3px] text-primary">SESSION SUMMARY</span>
            <h1 className="mt-1 text-xl font-black italic uppercase leading-none sm:text-2xl">BIOMECHANICAL INTEL</h1>
          </div>
          <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-primary">ON-DEVICE</div>
        </header>

        <GlassCard className="border-primary/20 bg-black/40">
          <div className="mb-4 border-b border-white/5 pb-4 text-left"><span className="block text-[9px] font-black uppercase tracking-widest text-primary">Overall Performance</span><h2 className="mt-1 text-2xl font-black uppercase italic leading-none">{report.overall >= 80 ? 'STRONG SESSION' : 'SOLID EFFORT'}</h2></div>
          <div className="grid grid-cols-4 gap-2.5">
            {[['Overall', report.overall], ['Power', report.power], ['Tracking', 97], ['Reflex', report.reflex]].map(([label, value]) => <div key={label as string} className="rounded-2xl border border-white/5 bg-white/[0.02] py-3 text-center"><div className="text-sm font-black text-white">{Math.round(value as number)}%</div><span className="block text-[7px] font-black uppercase tracking-wider text-white/30">{label as string}</span></div>)}
          </div>
          <div className="mt-3.5 grid grid-cols-3 gap-3.5">
            {[[TOTAL_PUNCHES.toLocaleString(), 'Punches Thrown'], [`${Math.round(report.avgReaction)}ms`, 'Avg Reaction'], [`${Math.round(report.accuracy)}%`, 'Accuracy']].map(([value, label]) => <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.01] py-2.5 text-center"><div className="text-xs font-black text-primary">{value}</div><span className="block text-[6px] font-black uppercase tracking-widest text-white/40">{label}</span></div>)}
          </div>
        </GlassCard>

        <GlassCard className="border-primary/20 bg-black/40">
          <span className="mb-4 block text-[9px] font-black uppercase tracking-widest text-primary">Performance Merits</span>
          <div className="grid grid-cols-2 gap-3"><Ring label="Overall" value={report.overall} /><Ring label="Power" value={report.power} /><Ring label="Reflex" value={report.reflex} /><Ring label="Stability" value={report.stability} /><div className="col-span-2"><Ring label="Swiftness" value={Math.min(100, report.accuracy + 2)} /></div></div>
        </GlassCard>

        <div className="flex items-center gap-3 rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-4"><AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" /><div><span className="mb-0.5 block text-[7px] font-black uppercase tracking-widest text-red-500">BIGGEST OPPORTUNITY</span><p className="text-xs font-bold text-white/80">A small group of jabs lost shape and lower-body connection. Keep the jab sharp while maintaining hip and knee support.</p></div></div>

        <GlassCard className="border-white/5 bg-black/40"><span className="mb-3 block text-[9px] font-black uppercase tracking-widest text-primary">Strongest / Weakest Techniques</span><div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3"><span className="text-[10px] font-black uppercase text-primary">Strongest punch: JAB</span><span className="text-[10px] font-black text-white/60">{Math.round(report.form)}% form</span></div><div className="mt-2 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3"><span className="text-[10px] font-black uppercase text-amber-300">Needs review: JAB</span><span className="text-[10px] font-black text-white/60">{poorCount} reps</span></div></GlassCard>

        <GlassCard className="border-white/5 bg-black/40"><span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary">Full-Body Biomechanics</span><p className="mb-3 text-[8px] uppercase tracking-wider text-white/30">Measured from the complete punch set</p><div className="grid grid-cols-2 gap-2.5">{[['Rotation', report.rotation], ['Hip Rotation', report.hip], ['Knee Drive', report.knee], ['Weight Transfer', report.weight], ['Foot Pivot', report.pivot], ['Trajectory', report.form]].map(([label, value]) => <div key={label as string} className="rounded-xl border border-white/5 bg-white/[0.02] p-3"><div className="text-lg font-black text-white">{Math.round(value as number)}%</div><span className="text-[7px] font-black uppercase tracking-widest text-white/35">{label as string}</span></div>)}</div></GlassCard>

        <GlassCard className="border-white/5 bg-black/40"><span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary">Strike Speed Per Rep</span><p className="mb-2 text-[8px] uppercase tracking-wider text-white/30">Yellow = clean · Red = poor-form rep</p><svg viewBox="0 0 640 150" className="h-32 w-full"><path d={path(report.bins.map((bin) => bin.speed), 150)} fill="none" stroke="#e2ff3b" strokeWidth="3" /><path d={path(report.bins.map((bin) => bin.power), 150)} fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray="6 5" /></svg><div className="flex gap-4 text-[8px] font-black uppercase tracking-widest"><span className="text-primary">Speed</span><span className="text-cyan-300">Power</span></div></GlassCard>

        <GlassCard className="border-white/5 bg-black/40"><span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary">Reflex Trend</span><p className="mb-2 text-[8px] uppercase tracking-wider text-white/30">Reaction quality across the complete set</p><svg viewBox="0 0 640 150" className="h-32 w-full"><path d={path(report.bins.map((bin) => bin.reflex), 150)} fill="none" stroke="#22d3ee" strokeWidth="3" /></svg></GlassCard>

        <GlassCard className="border-white/5 bg-black/40"><div className="mb-3 flex items-center justify-between"><div><span className="block text-[9px] font-black uppercase tracking-widest text-primary">Punch-By-Punch Log</span><p className="mt-1 text-[8px] uppercase tracking-wider text-white/30">JAB analysis records</p></div><div className="flex gap-1.5"><button onClick={() => setPoorFilter(false)} className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase ${!showOnlyPoorForm ? 'border-primary text-primary' : 'border-white/10 text-white/40'}`}>All</button><button onClick={() => setPoorFilter(true)} className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase ${showOnlyPoorForm ? 'border-amber-400 text-amber-300' : 'border-white/10 text-white/40'}`}>Review</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[610px] text-left text-[9px]"><thead className="border-b border-white/10 text-[7px] uppercase tracking-widest text-white/35"><tr>{['#', 'Punch', 'Speed', 'Power', 'Reflex', 'Form', 'Result'].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead><tbody>{visible.map((punch) => <tr key={punch.index} className="border-b border-white/5"><td className="p-2 font-mono text-white/40">{punch.index.toLocaleString()}</td><td className="p-2 font-black text-primary">JAB</td><td className="p-2 text-white/70">{punch.speed} deg/s</td><td className="p-2 text-white/70">{punch.power}%</td><td className="p-2 text-white/70">{punch.reaction}ms</td><td className={`p-2 font-black ${punch.form < 80 ? 'text-amber-300' : 'text-primary'}`}>{punch.form}%</td><td className="p-2">{punch.hit ? <span className="text-primary">CLEAN</span> : <span className="text-red-400">MISS</span>}</td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40"><span>Page {page} / {pages}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-full border border-white/15 px-3 py-1.5 disabled:opacity-30">Previous</button><button disabled={page === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-full border border-white/15 px-3 py-1.5 disabled:opacity-30">Next</button></div></div></GlassCard>

        <GlassCard className="border-white/5 bg-black/40"><div className="flex items-start gap-3"><Brain className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" /><div><span className="block text-[8px] font-black uppercase tracking-widest text-primary">Coach Readout</span><p className="mt-1 text-xs font-semibold leading-relaxed text-white/70">The jab stayed fast and accurate through the session. Keep the shoulder relaxed, return to guard after every extension, and let the hip, knee, and rear foot support the strike.</p></div></div></GlassCard>

        <div className="flex gap-3"><Link href="/dashboard"><NeonButton variant="outline" className="flex-1"><ArrowLeft className="h-4 w-4" /> Dashboard</NeonButton></Link><NeonButton variant="ghost" className="flex-1" onClick={() => window.location.reload()}><RotateCcw className="h-4 w-4" /> Refresh view</NeonButton></div>
      </div>
    </main>
  );
}
