'use client';

import React from 'react';
import { motion } from 'framer-motion';

// A small "SAMPLE DATA" tag used on every illustrative chart/dashboard in the
// onboarding, per the requirement that illustrative data is never confused
// with the user's real (not-yet-existing) progress.
export function SampleTag({ label = 'SAMPLE DATA' }: { label?: string }) {
    return (
        <span className="text-[8px] font-black tracking-[2px] uppercase text-white/30 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            {label}
        </span>
    );
}

export function AnimatedRing({
    percent,
    size = 88,
    stroke = 8,
    label,
    sublabel,
}: {
    percent: number;
    size?: number;
    stroke?: number;
    label: string;
    sublabel?: string;
}) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        stroke="var(--primary)"
                        strokeWidth={stroke}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={c}
                        initial={{ strokeDashoffset: c }}
                        whileInView={{ strokeDashoffset: c - (percent / 100) * c }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-black text-white">{percent}%</span>
                </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wide text-white/70 text-center">{label}</span>
            {sublabel && <span className="text-[8px] text-white/30 font-semibold text-center">{sublabel}</span>}
        </div>
    );
}

export function AnimatedBars({ values, labels }: { values: number[]; labels: string[] }) {
    const max = Math.max(...values, 1);
    return (
        <div className="flex items-end justify-between gap-2 h-28">
            {values.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <motion.div
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${(v / max) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                    />
                    <span className="text-[8px] font-bold text-white/30 uppercase">{labels[i]}</span>
                </div>
            ))}
        </div>
    );
}

export function SparkLine({ points, height = 64 }: { points: number[]; height?: number }) {
    const width = 280;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const path = points
        .map((p, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - ((p - min) / range) * height;
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
            <motion.path
                d={path}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
            />
        </svg>
    );
}

export function AnimatedCounter({ value, suffix = '', label }: { value: number; suffix?: string; label: string }) {
    const [display, setDisplay] = React.useState(0);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    const start = performance.now();
                    const duration = 1000;
                    const tick = (now: number) => {
                        const progress = Math.min(1, (now - start) / duration);
                        setDisplay(Math.round(progress * value));
                        if (progress < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                    obs.disconnect();
                }
            },
            { threshold: 0.4 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [value]);

    return (
        <div ref={ref} className="flex flex-col gap-1">
            <span className="text-2xl font-black text-white leading-none">
                {display}
                {suffix}
            </span>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wide">{label}</span>
        </div>
    );
}