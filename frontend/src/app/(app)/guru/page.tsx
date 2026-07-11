'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Brain, ChevronRight, Award } from 'lucide-react';
import { techniquesData } from '@/lib/techniques-data';
import { GlassCard } from '@/components/ui/GlassCard';

export default function GuruPage() {
  const router = useRouter();
  
  // Calculate catalog stats
  const stats = useMemo(() => {
    let totalCount = 0;
    let totalScore = 0;

    Object.keys(techniquesData).forEach(cat => {
      const list = techniquesData[cat] || [];
      totalCount += list.length;
      list.forEach(item => {
        totalScore += item.score || 75;
      });
    });

    const averageMastery = totalCount > 0 ? Math.round(totalScore / totalCount) : 0;
    return {
      totalCount,
      averageMastery
    };
  }, []);

  const categories = [
    { key: 'stances', title: 'STANCES', label: 'STANCE' },
    { key: 'punches', title: 'PUNCHES', label: 'PUNCH' },
    { key: 'kicks', title: 'KICKS', label: 'KICK' },
    { key: 'defense', title: 'MOVEMENT & DEFENSE', label: 'DEFENSE' }
  ];

  const handleTechClick = (id: string) => {
    router.push(`/guru/${id}`);
  };

  const strokeCircumference = 2 * Math.PI * 15.9155; // Radius matches legacy SVG (15.9155)
  const strokeOffset = strokeCircumference - (stats.averageMastery / 100) * strokeCircumference;

  return (
    <div className="flex flex-col gap-6 anim-fade-in">
      {/* Top HUD Telemetry Display */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80">MODULE: COMBAT GURU CATALOG</span>
        <span className="opacity-40">MASTERY_INDEX_LOADED</span>
      </div>

      {/* Page Header */}
      <header className="flex justify-between items-center">
        <div>
          <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">
            AI COUNSEL
          </div>
          <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
            COMBAT GURU
          </h1>
        </div>
        
        <div className="w-10 h-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(226,255,59,0.15)] animate-pulse">
          <Brain className="w-4 h-4" />
        </div>
      </header>

      {/* Mastery Dashboard Card */}
      <GlassCard className="flex justify-between items-center p-6 border-green-500/20 bg-green-500/[0.02]">
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-black text-white/40 tracking-wider uppercase mb-1">
            Total Skills Available
          </span>
          <span className="text-3xl font-black text-white leading-none">
            {stats.totalCount}
          </span>
          <div className="flex items-center gap-1 text-[9px] font-bold text-primary mt-2">
            <Sparkles className="w-3 h-3 fill-primary/20" />
            <span>+2% Growth This Week</span>
          </div>
        </div>

        {/* Circular Mastery Chart */}
        <div className="relative w-20 h-20 flex items-center justify-center select-none">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            <circle 
              className="text-white/10" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              fill="transparent" 
              r="15.9155" 
              cx="18" 
              cy="18" 
            />
            <circle 
              className="text-primary transition-all duration-1000 ease-out" 
              stroke="currentColor" 
              strokeWidth="2.8" 
              strokeDasharray={strokeCircumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              fill="transparent" 
              r="15.9155" 
              cx="18" 
              cy="18" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-black text-white">{stats.averageMastery}%</span>
            <span className="text-[5px] font-black tracking-widest text-white/40 uppercase">MASTERY</span>
          </div>
        </div>
      </GlassCard>

      {/* Category Sections */}
      <div className="flex flex-col gap-6">
        {categories.map(cat => {
          const items = techniquesData[cat.key] || [];
          if (items.length === 0) return null;

          return (
            <div key={cat.key} className="flex flex-col gap-3">
              <div className="flex items-center gap-3 select-none">
                <span className="text-[9px] font-black tracking-[3px] text-white/30 uppercase">
                  {cat.title}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {items.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => handleTechClick(item.id)}
                    className="group bg-black/40 border border-white/5 rounded-3xl p-3.5 flex flex-col justify-between hover:border-primary/20 cursor-pointer transition-all duration-300 relative overflow-hidden"
                  >
                    {item.isAiPick && (
                      <div className="absolute top-2 right-2 bg-primary text-black font-black text-[6px] tracking-wider px-2 py-0.5 rounded-full uppercase z-10 shadow-[0_0_5px_rgba(226,255,59,0.4)]">
                        AI PICK
                      </div>
                    )}

                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black relative mb-3">
                      <img 
                        src={`/assets/${item.id}.jpg`} 
                        onError={(e) => {
                          // Fallback placeholder image with technique name
                          (e.target as HTMLImageElement).src = `https://placehold.co/300x300/111115/333339/png?text=${encodeURIComponent(item.name)}`;
                        }}
                        alt={item.name} 
                        className="w-full h-full object-cover opacity-75 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    </div>

                    <div className="flex flex-col">
                      <h4 className="text-[11px] font-black uppercase text-white tracking-wide group-hover:text-primary transition-all">
                        {item.name}
                      </h4>
                      <span className="text-[8px] font-black tracking-wider text-primary uppercase mt-0.5">
                        {item.subtitle}
                      </span>
                      <p className="text-[9px] text-white/40 line-clamp-2 mt-1 leading-normal">
                        {item.description}
                      </p>

                      {/* Effectiveness bar */}
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-3 mb-1">
                        <div 
                          className="h-full bg-primary shadow-[0_0_5px_rgba(226,255,59,0.3)]"
                          style={{ width: `${item.score || 75}%` }}
                        />
                      </div>
                      <span className="text-[7px] font-black text-white/30 uppercase tracking-widest block text-left">
                        EFFECTIVENESS: {item.score || 75}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
