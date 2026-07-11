'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Target, 
  Lightbulb, 
  AlertTriangle, 
  ChevronRight,
  Shield,
  Activity,
  Flame,
  Zap,
  PersonStanding,
  Sparkles
} from 'lucide-react';
import { techniquesData, TechniqueDetail } from '@/lib/techniques-data';
import { GlassCard } from '@/components/ui/GlassCard';

export default function TechniqueDetailPage() {
  const router = useRouter();
  const params = useParams();
  
  const techId = String(params?.technique || '').toLowerCase();

  // Find the technique and its category key
  const { technique, categoryKey, categoryLabel } = useMemo(() => {
    let foundTech: TechniqueDetail | null = null;
    let foundCatKey = '';
    let foundCatLabel = 'TECHNIQUE';

    for (const key of Object.keys(techniquesData)) {
      const match = (techniquesData[key] || []).find(t => t.id === techId);
      if (match) {
        foundTech = match;
        foundCatKey = key;
        const labelMap: Record<string, string> = {
          punches: 'PUNCH',
          stances: 'STANCE',
          kicks: 'KICK',
          defense: 'DEFENSE'
        };
        foundCatLabel = labelMap[key] || key.toUpperCase();
        break;
      }
    }

    return {
      technique: foundTech,
      categoryKey: foundCatKey,
      categoryLabel: foundCatLabel
    };
  }, [techId]);

  // Find related techniques in the same category
  const relatedTechniques = useMemo(() => {
    if (!categoryKey || !technique) return [];
    return (techniquesData[categoryKey] || []).filter(t => t.id !== technique.id);
  }, [categoryKey, technique]);

  if (!technique) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-10 text-white/40 font-bold uppercase text-xs">
        Technique not found. <Link href="/guru" className="text-primary mt-2 uppercase font-black tracking-wider">Back to Guru</Link>
      </div>
    );
  }

  // Related category icons mapping
  const categoryIcon = (key: string) => {
    if (key === 'punches') return <Target className="w-5 h-5" />;
    if (key === 'stances') return <PersonStanding className="w-5 h-5" />;
    if (key === 'defense') return <Shield className="w-5 h-5" />;
    return <Zap className="w-5 h-5" />;
  };

  return (
    <div className="flex flex-col gap-6 anim-fade-in pb-16">
      {/* Top HUD Telemetry Display */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80">MODULE: TECHNICAL BREAKDOWN</span>
        <span className="opacity-40 uppercase">GURU_{categoryLabel}_ANALYSIS</span>
      </div>

      {/* Page Header */}
      <header className="flex justify-between items-center">
        <div>
          <div className="text-[10px] font-black text-primary tracking-wider uppercase mb-0.5">
            {categoryLabel} DETAILS
          </div>
          <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
            TECHNICAL BREAKDOWN
          </h1>
        </div>
        
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </header>

      {/* Hero Visual Card */}
      <div className="relative rounded-3xl h-64 border border-white/10 bg-black/45 overflow-hidden shadow-2xl">
        <img 
          src={`/assets/${technique.id}.jpg`} 
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/600x400/111115/333339/png?text=${encodeURIComponent(technique.name)}`;
          }}
          alt={technique.name} 
          className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        
        <div className="absolute bottom-5 left-5 right-5 z-10 flex flex-col gap-3">
          <div className="bg-primary text-black font-black text-[7px] tracking-widest px-3.5 py-0.5 rounded-full uppercase self-start shadow-[0_0_8px_rgba(226,255,59,0.3)]">
            TECHNIQUE OF THE DAY
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase text-white leading-none mb-1">
              {technique.name}
            </h2>
            <p className="text-xs text-white/50 font-semibold line-clamp-2 max-w-[85%] leading-snug">
              {technique.description}
            </p>
          </div>

          {/* Effectiveness bar */}
          <div className="flex items-center gap-3 pr-10">
            <span className="text-[7px] font-black text-primary uppercase tracking-widest">
              EFFECTIVENESS
            </span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary shadow-[0_0_5px_rgba(226,255,59,0.4)]"
                style={{ width: `${technique.score}%` }}
              />
            </div>
            <span className="text-[9px] font-black text-primary tracking-widest">
              {technique.score}%
            </span>
          </div>
        </div>
      </div>

      {/* Core Breakdown Card */}
      <GlassCard className="p-6 border-primary/20 bg-black/40">
        <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-lg font-black uppercase text-primary italic leading-none mb-0.5">
              {technique.name}
            </h3>
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
              {technique.subtitle || 'Combatives Entry'}
            </span>
          </div>
          <Shield className="w-5 h-5 text-primary" />
        </div>

        {/* Steps timeline */}
        <div className="flex flex-col gap-5 border-l-2 border-primary/20 pl-5 ml-2.5 my-4">
          {technique.steps.map((step, idx) => (
            <div key={idx} className="relative">
              {/* Timeline circle badge */}
              <div className="absolute -left-[29px] top-0 w-4 h-4 rounded-full bg-primary text-black font-black text-[8px] flex items-center justify-center shadow-[0_0_8px_rgba(226,255,59,0.4)]">
                {idx + 1}
              </div>
              <p className="text-sm font-semibold text-white/80 leading-relaxed">
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* Horizontal metrics display */}
        {technique.stats && technique.stats.length > 0 && (
          <div className="grid grid-cols-3 gap-3.5 mt-6 pt-4 border-t border-white/5">
            {technique.stats.map((stat, idx) => (
              <div 
                key={idx}
                className="bg-white/[0.02] border border-white/5 rounded-2xl py-3 flex flex-col items-center justify-center"
              >
                <span className="text-sm font-black text-primary italic leading-none mb-1">
                  {stat.val}
                </span>
                <span className="text-[7px] font-black text-white/30 tracking-wider uppercase">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Primary Targets */}
      {technique.targets && technique.targets.length > 0 && (
        <div className="flex flex-col gap-2.5 select-none">
          <span className="text-[9px] font-black text-white/40 tracking-[2px] uppercase">
            PRIMARY TARGETS
          </span>
          <div className="flex gap-2 flex-wrap">
            {technique.targets.map((t, idx) => (
              <div 
                key={idx}
                className="px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5"
              >
                <Target className="w-3 h-3 text-red-500" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Coach Pro Tip */}
      {technique.pro_tip && (
        <GlassCard className="p-5 border-primary/45 bg-primary/[0.03] flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="w-4 h-4 fill-primary/10" />
            <span className="text-[9px] font-black uppercase tracking-[3px]">
              AI COACH TIP
            </span>
          </div>
          <p className="text-xs text-white/80 font-bold italic leading-relaxed">
            &ldquo;{technique.pro_tip}&rdquo;
          </p>
        </GlassCard>
      )}

      {/* Common Mistakes */}
      {technique.mistakes && technique.mistakes.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-[9px] font-black text-red-500/80 tracking-[2px] uppercase">
            COMMON MISTAKES
          </span>
          <div className="flex flex-col gap-2.5">
            {technique.mistakes.map((m, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 p-4 bg-red-500/[0.02] border border-red-500/10 rounded-2xl"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/80 leading-normal font-semibold">
                  {m}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encyclopedia/Related */}
      <div>
        <div className="flex items-center gap-3 mb-4 select-none">
          <span className="text-[9px] font-black tracking-[4px] text-white/30 uppercase">
            ENCYCLOPEDIA
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {relatedTechniques.length > 0 ? (
            relatedTechniques.map(rel => (
              <div 
                key={rel.id}
                onClick={() => router.push(`/guru/${rel.id}`)}
                className="bg-black/40 border border-white/5 hover:border-primary/20 rounded-3xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-[0_0_10px_rgba(226,255,59,0.1)]">
                    {categoryIcon(categoryKey)}
                  </div>
                  {rel.isAiPick && (
                    <span className="bg-primary text-black font-black text-[6px] tracking-wider px-2 py-0.5 rounded-full uppercase">
                      FOUNDATION
                    </span>
                  )}
                </div>
                
                <div>
                  <h4 className="text-xs font-black uppercase text-white truncate mb-0.5">
                    {rel.name}
                  </h4>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                    {rel.subtitle}
                  </span>
                  
                  {/* Related Effectiveness */}
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-3 mb-1">
                    <div className="h-full bg-primary" style={{ width: `${rel.score}%` }} />
                  </div>
                  <span className="text-[6px] font-black text-primary uppercase tracking-widest">
                    {rel.score}% EFFECTIVENESS
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-6 text-white/20 text-xs font-bold uppercase">
              No related techniques.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
