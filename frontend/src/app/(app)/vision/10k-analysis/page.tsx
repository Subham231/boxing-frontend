'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, CheckCircle2, CircleAlert, Crosshair, Gauge, Target, Zap } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

type PunchType = 'JAB' | 'CROSS' | 'HOOK' | 'UPPERCUT';
type Punch = {
  id: number;
  type: PunchType;
  speed: number;
  power: number;
  reflex: number;
  form: number;
  accuracy: number;
  rotation: number;
  trajectory: number;
  hit: boolean;
};

const TOTAL_PUNCHES = 10000;
const CHART_BINS = 40;
const PUNCH_TYPES: PunchType[] = ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'];
const TYPE_COLORS: Record<PunchType, string> = {
  JAB: '#e2ff3b',
  CROSS: '#22d3ee',
  HOOK: '#f59e0b',
  UPPERCUT: '#c084fc',
};

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function makePunches(): Punch[] {
  const random = seededRandom(10000);
  return Array.from({ length: TOTAL_PUNCHES }, (_, index) => {
    const poorForm = random() < 0.065;
    const type = PUNCH_TYPES[Math.floor(random() * PUNCH_TYPES.length)];
    const quality = poorForm ? 0.58 + random() * 0.2 : 0.92 + random() * 0.08;
    const speed = Math.round((poorForm ? 430 : 650) + random() * (poorForm ? 210 : 330));
    const power = Math.round(Math.min(100, (poorForm ? 78 : 90) + random() * (poorForm ? 12 : 10)));
    const reflex = Math.round((poorForm ? 360 : 250) + random() * (poorForm ? 220 : 230));
    const form = Math.round(Math.min(100, quality * 100));
    const accuracy = Math.round(Math.min(100, quality * 100 + (random() - 0.5) * 5));
    const rotation = Math.round(Math.min(100, (poorForm ? 65 : 88) + random() * (poorForm ? 20 : 12)));
    const trajectory = Math.round(Math.min(100, (poorForm ? 68 : 91) + random() * (poorForm ? 18 : 9)));
    return {
      id: index + 1,
      type,
      speed,
      power,
      reflex,
      form,
      accuracy,
      rotation,
      trajectory,
      hit: random() < (poorForm ? 0.89 : 0.985),
    };
  });
}

function linePath(values: number[], width = 640, height = 180) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 24) - 12;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function Metric({ label, value, suffix = '%' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="text-2xl font-black text-white">{Math.round(value)}{suffix}</div>
      <div className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/40">{label}</div>
    </div>
  );
}

function MiniBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-32 items-end gap-1">
      {values.map((value, index) => (
        <div key={index} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: color, opacity: 0.45 + (index % 4) * 0.1 }} />
      ))}
    </div>
  );
}

export default function TenKAnalysisPage() {
  const [punches] = useState<Punch[]>(makePunches);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<PunchType | 'ALL'>('ALL');
  const pageSize = 20;

  const report = useMemo(() => {
    const hits = punches.filter((punch) => punch.hit);
    const accuracy = average(punches.map((punch) => punch.accuracy));
    const form = average(punches.map((punch) => punch.form));
    const power = average(punches.map((punch) => punch.power));
    const reflex = Math.max(0, Math.min(100, 100 - (average(punches.map((punch) => punch.reflex)) - 250) / 16));
    const rotation = average(punches.map((punch) => punch.rotation));
    const trajectory = average(punches.map((punch) => punch.trajectory));
    const stability = Math.max(0, 100 - Math.sqrt(average(punches.map((punch) => (punch.form - form) ** 2))) * 1.45);
    const overall = average([accuracy, form, power, reflex, rotation, trajectory, stability]);
    const trends = Array.from({ length: CHART_BINS }, (_, bin) => {
      const slice = punches.slice(Math.floor((bin * punches.length) / CHART_BINS), Math.floor(((bin + 1) * punches.length) / CHART_BINS));
      return {
        speed: average(slice.map((punch) => punch.speed)),
        form: average(slice.map((punch) => punch.form)),
        accuracy: average(slice.map((punch) => punch.accuracy)),
        reflex: Math.max(0, Math.min(100, 100 - (average(slice.map((punch) => punch.reflex)) - 250) / 16)),
      };
    });
    const typeCounts = PUNCH_TYPES.map((type) => ({ type, count: punches.filter((punch) => punch.type === type).length }));
    const formBuckets = [0, 0, 0, 0];
    punches.forEach((punch) => formBuckets[Math.min(3, Math.floor(punch.form / 25))]++);
    return { accuracy, form, power, reflex, rotation, trajectory, stability, overall, trends, typeCounts, formBuckets, hits };
  }, [punches]);

  const visiblePunches = useMemo(() => {
    const filtered = filter === 'ALL' ? punches : punches.filter((punch) => punch.type === filter);
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filter, page, punches]);
  const filteredCount = filter === 'ALL' ? punches.length : punches.filter((punch) => punch.type === filter).length;
  const pages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const poorCount = punches.filter((punch) => punch.form < 80).length;

  const setFilterAndReset = (value: PunchType | 'ALL') => {
    setFilter(value);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[#070908] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/vision" className="mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to AI Vision
            </Link>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3 text-primary"><Crosshair className="h-6 w-6" /></div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Presentation Analysis</p>
                <h1 className="text-2xl font-black uppercase italic tracking-tight sm:text-4xl">10K Punch Intelligence</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-xs font-semibold leading-relaxed text-white/50">A complete in-memory analysis view built from 10,000 generated punch records. Nothing is saved or sent anywhere.</p>
          </div>
          <div className="rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Simulated demo data</div>
        </header>

        <GlassCard className="mb-5 border-primary/25 bg-black/35 p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_2fr] lg:items-center">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Session complete</p>
              <div className="mt-2 flex items-end gap-3"><span className="text-6xl font-black leading-none text-white">{Math.round(report.overall)}%</span><span className="pb-1 text-xs font-black uppercase tracking-widest text-primary">overall score</span></div>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/60"><CheckCircle2 className="h-4 w-4 text-primary" /> {TOTAL_PUNCHES.toLocaleString()} punches analyzed</div>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-amber-300/80"><CircleAlert className="h-3.5 w-3.5" /> {poorCount.toLocaleString()} reps flagged for form review</div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"><Metric label="Accuracy" value={report.accuracy} /><Metric label="Reflex" value={report.reflex} /><Metric label="Power" value={report.power} /><Metric label="Stability" value={report.stability} /></div>
          </div>
        </GlassCard>

        <section className="grid gap-5 lg:grid-cols-2">
          <GlassCard className="border-white/10 bg-black/30"><div className="mb-4 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-primary">Live-derived trend</p><h2 className="text-lg font-black uppercase">Form and Reflex</h2></div><Gauge className="h-5 w-5 text-cyan-300" /></div><svg viewBox="0 0 640 180" className="h-48 w-full overflow-visible"><path d={linePath(report.trends.map((point) => point.form))} fill="none" stroke="#e2ff3b" strokeWidth="3" /><path d={linePath(report.trends.map((point) => point.reflex))} fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray="6 5" /></svg><div className="mt-2 flex justify-between text-[8px] font-black uppercase tracking-widest text-white/35"><span>First punch</span><span>Last punch</span></div><div className="mt-3 flex gap-4 text-[9px] font-black uppercase tracking-widest"><span className="text-primary">Form</span><span className="text-cyan-300">Reflex</span></div></GlassCard>

          <GlassCard className="border-white/10 bg-black/30"><div className="mb-4 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-primary">Measured output</p><h2 className="text-lg font-black uppercase">Speed by 250 Punches</h2></div><Zap className="h-5 w-5 text-amber-300" /></div><MiniBars values={report.trends.map((point) => point.speed)} color="#f59e0b" /><div className="mt-3 flex justify-between text-[8px] font-black uppercase tracking-widest text-white/35"><span>0</span><span>10,000</span></div></GlassCard>

          <GlassCard className="border-white/10 bg-black/30"><div className="mb-4 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-primary">Technique mix</p><h2 className="text-lg font-black uppercase">Punch Distribution</h2></div><BarChart3 className="h-5 w-5 text-purple-300" /></div><div className="space-y-3">{report.typeCounts.map(({ type, count }) => <div key={type}><div className="mb-1 flex justify-between text-[9px] font-black uppercase tracking-widest"><span style={{ color: TYPE_COLORS[type] }}>{type}</span><span className="text-white/50">{count.toLocaleString()} / {Math.round((count / TOTAL_PUNCHES) * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(count / TOTAL_PUNCHES) * 100}%`, backgroundColor: TYPE_COLORS[type] }} /></div></div>)}</div></GlassCard>

          <GlassCard className="border-white/10 bg-black/30"><div className="mb-4 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-primary">Quality spread</p><h2 className="text-lg font-black uppercase">Form Score Buckets</h2></div><Target className="h-5 w-5 text-primary" /></div><MiniBars values={report.formBuckets} color="#e2ff3b" /><div className="mt-3 grid grid-cols-4 text-center text-[8px] font-black uppercase tracking-widest text-white/40"><span>0-24</span><span>25-49</span><span>50-74</span><span>75-100</span></div></GlassCard>
        </section>

        <GlassCard className="mt-5 border-white/10 bg-black/30 p-4 sm:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-widest text-primary">Dataset explorer</p><h2 className="text-lg font-black uppercase">Punch-by-punch analysis</h2></div><div className="flex flex-wrap gap-1.5">{(['ALL', ...PUNCH_TYPES] as const).map((value) => <button key={value} onClick={() => setFilterAndReset(value)} className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-widest ${filter === value ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-white/45 hover:text-white'}`}>{value}</button>)}</div></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-[10px]"><thead className="border-b border-white/10 text-[8px] uppercase tracking-widest text-white/35"><tr><th className="p-2">#</th><th className="p-2">Type</th><th className="p-2">Speed</th><th className="p-2">Power</th><th className="p-2">Reflex</th><th className="p-2">Form</th><th className="p-2">Result</th></tr></thead><tbody>{visiblePunches.map((punch) => <tr key={punch.id} className="border-b border-white/5"><td className="p-2 font-mono text-white/40">{punch.id.toLocaleString()}</td><td className="p-2 font-black" style={{ color: TYPE_COLORS[punch.type] }}>{punch.type}</td><td className="p-2 text-white/70">{punch.speed} deg/s</td><td className="p-2 text-white/70">{punch.power}%</td><td className="p-2 text-white/70">{punch.reflex} ms</td><td className={`p-2 font-black ${punch.form < 80 ? 'text-amber-300' : 'text-primary'}`}>{punch.form}%</td><td className="p-2">{punch.hit ? <span className="text-primary">CLEAN</span> : <span className="text-red-400">MISS</span>}</td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/45"><span>Page {page} / {pages} ({filteredCount.toLocaleString()} records)</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-white/15 px-3 py-1.5 disabled:opacity-30">Previous</button><button disabled={page === pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} className="rounded-full border border-white/15 px-3 py-1.5 disabled:opacity-30">Next</button></div></div></GlassCard>

        <div className="mt-5 flex flex-wrap gap-3"><Link href="/vision"><NeonButton variant="outline"><ArrowLeft className="h-4 w-4" /> Real AI analysis</NeonButton></Link><Link href="/dashboard"><NeonButton variant="ghost">Dashboard</NeonButton></Link></div>
        <p className="mt-6 text-center text-[8px] font-bold uppercase tracking-[0.18em] text-white/25">Simulated presentation view only. Records exist in memory for this page session and are discarded on navigation or refresh.</p>
      </div>
    </main>
  );
}
