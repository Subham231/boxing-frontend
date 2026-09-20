'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, ChevronRight, Search, Star, Flame, Trophy, BookOpen, Swords, X } from 'lucide-react';
import { techniquesData, allTechniques, overallRating, TechniqueDetail } from '@/lib/techniques-data';
import { loadAllProgress, loadRecentlyViewed, computeLearningStreak, computeAchievements, LearningStage } from '@/lib/guru-progress';
import { GlassCard } from '@/components/ui/GlassCard';

const QUOTES = [
  "Discipline is doing what needs to be done even when you don't feel like doing it.",
  "You don't have to be great to start, but you have to start to be great.",
  "The fight is won or lost far away from witnesses — in the gym.",
  "Champions keep playing until they get it right.",
  "It's not the will to win that matters — it's the will to prepare.",
];

const STAGE_WEIGHT: Record<LearningStage, number> = {
  Beginner: 0, Learning: 25, Practicing: 50, Confident: 75, Mastered: 100,
};

const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<any>> = {
  book: BookOpen, swords: Swords, brain: Brain, flame: Flame, trophy: Trophy,
};

function dayIndex(len: number): number {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start.getTime();
  const day = Math.floor(diff / 86400000);
  return len ? day % len : 0;
}

function techImage(item: TechniqueDetail) {
  return item.image;
}

function StageBadge({ stage }: { stage: LearningStage }) {
  const colors: Record<LearningStage, string> = {
    Beginner: 'bg-white/5 text-white/40 border-white/10',
    Learning: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    Practicing: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    Confident: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    Mastered: 'bg-primary/10 text-primary border-primary/30',
  };
  return (
    <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors[stage]}`}>
      {stage}
    </span>
  );
}

export default function GuruPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [progressMap, setProgressMap] = useState<Record<string, { stage: LearningStage; favorite: boolean }>>({});
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);

  const techniques = useMemo(() => allTechniques(), []);

  useEffect(() => {
    setMounted(true);
    const all = loadAllProgress();
    const map: Record<string, { stage: LearningStage; favorite: boolean }> = {};
    Object.entries(all).forEach(([id, p]) => (map[id] = { stage: p.stage, favorite: p.favorite }));
    setProgressMap(map);
    setRecentIds(loadRecentlyViewed());
    setStreak(computeLearningStreak());
  }, []);

  const stats = useMemo(() => {
    const totalCount = techniques.length;
    let totalScore = 0;
    let masteredCount = 0;
    let inProgressCount = 0;
    techniques.forEach((item) => {
      const p = progressMap[item.id];
      const stage = p?.stage || 'Beginner';
      totalScore += STAGE_WEIGHT[stage];
      if (stage === 'Mastered') masteredCount++;
      else if (stage !== 'Beginner') inProgressCount++;
    });
    const completion = totalCount > 0 ? Math.round(totalScore / totalCount) : 0;
    return { totalCount, completion, masteredCount, inProgressCount };
  }, [techniques, progressMap]);

  const skillOfDay = techniques[dayIndex(techniques.length)];

  const recommendedNext = useMemo(() => {
    const notStarted = techniques.find((t) => !progressMap[t.id] || progressMap[t.id].stage === 'Beginner');
    return notStarted || skillOfDay;
  }, [techniques, progressMap, skillOfDay]);

  const favorites = techniques.filter((t) => progressMap[t.id]?.favorite);
  const recentTechniques = recentIds.map((id) => techniques.find((t) => t.id === id)).filter(Boolean) as TechniqueDetail[];
  const achievements = mounted ? computeAchievements(techniques.length) : [];
  const quote = QUOTES[dayIndex(QUOTES.length)];

  const categories = [
    { key: 'stances', title: 'STANCES' },
    { key: 'punches', title: 'PUNCHES' },
    { key: 'kicks', title: 'KICKS' },
    { key: 'defense', title: 'MOVEMENT & DEFENSE' },
  ];

  const handleTechClick = (id: string) => router.push(`/guru/${id}`);

  const matchesQuery = (item: TechniqueDetail) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.difficulty || '').toLowerCase().includes(q)
    );
  };

  return (
    <div className="flex flex-col gap-6 anim-fade-in">
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80">MODULE: COMBAT GURU CATALOG</span>
        <span className="opacity-40">MASTERY_INDEX_LOADED</span>
      </div>

      {/* Hero */}
      <header className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">AI COUNSEL</div>
            <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">COMBAT GURU</h1>
          </div>
          <div className="w-10 h-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(226,255,59,0.15)] animate-pulse">
            <Brain className="w-4 h-4" />
          </div>
        </div>
        <p className="text-xs italic text-white/40 font-semibold leading-relaxed pr-4">&quot;{quote}&quot;</p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills, categories, difficulty..."
          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-xs font-bold text-white outline-none focus:border-primary placeholder:text-white/25"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!query && (
        <>
          {/* Skill of the Day */}
          {skillOfDay && (
            <GlassCard
              onClick={() => handleTechClick(skillOfDay.id)}
              className="p-5 border-primary/25 bg-primary/[0.04] cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-3 right-3 bg-primary text-black font-black text-[7px] tracking-wider px-2 py-0.5 rounded-full uppercase">
                SKILL OF THE DAY
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black shrink-0">
                  <img
                    src={techImage(skillOfDay)}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/200x200/111115/333339/png?text=${encodeURIComponent(skillOfDay.name)}`; }}
                    alt={skillOfDay.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black uppercase text-white">{skillOfDay.name}</h3>
                  <span className="text-[9px] font-black text-primary uppercase tracking-wide">{skillOfDay.subtitle}</span>
                  <p className="text-[10px] text-white/40 line-clamp-1 mt-1">{skillOfDay.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-primary shrink-0" />
              </div>
            </GlassCard>
          )}

          {/* Learning Progress Overview */}
          <GlassCard className="flex justify-between items-center p-6 border-green-500/20 bg-green-500/[0.02]">
            <div className="flex flex-col text-left gap-3">
              <div>
                <span className="text-[9px] font-black text-white/40 tracking-wider uppercase block mb-1">Total Skills Available</span>
                <span className="text-3xl font-black text-white leading-none">{stats.totalCount}</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="text-sm font-black text-primary block">{stats.masteredCount}</span>
                  <span className="text-[8px] text-white/40 font-bold uppercase">Mastered</span>
                </div>
                <div>
                  <span className="text-sm font-black text-white block">{stats.inProgressCount}</span>
                  <span className="text-[8px] text-white/40 font-bold uppercase">In Progress</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-primary" />
                  <div>
                    <span className="text-sm font-black text-white block leading-none">{streak}</span>
                    <span className="text-[8px] text-white/40 font-bold uppercase">Day Streak</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative w-20 h-20 flex items-center justify-center select-none shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle className="text-white/10" stroke="currentColor" strokeWidth="2.5" fill="transparent" r="15.9155" cx="18" cy="18" />
                <circle
                  className="text-primary transition-all duration-1000 ease-out"
                  stroke="currentColor" strokeWidth="2.8"
                  strokeDasharray={2 * Math.PI * 15.9155}
                  strokeDashoffset={2 * Math.PI * 15.9155 - (stats.completion / 100) * 2 * Math.PI * 15.9155}
                  strokeLinecap="round" fill="transparent" r="15.9155" cx="18" cy="18"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-white">{stats.completion}%</span>
                <span className="text-[5px] font-black tracking-widest text-white/40 uppercase">COMPLETE</span>
              </div>
            </div>
          </GlassCard>

          {/* Recommended Next Lesson */}
          {recommendedNext && (
            <GlassCard onClick={() => handleTechClick(recommendedNext.id)} className="p-4 border-white/5 bg-black/40 cursor-pointer flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-wide block">Recommended Next Lesson</span>
                <span className="text-xs font-black text-white uppercase">{recommendedNext.name}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </GlassCard>
          )}

          {/* Achievements */}
          {mounted && (
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black tracking-[3px] text-white/30 uppercase">Achievements</span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {achievements.map((a) => {
                  const Icon = ACHIEVEMENT_ICONS[a.icon];
                  return (
                    <div
                      key={a.id}
                      className={`shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl border w-20 text-center ${
                        a.earned ? 'bg-primary/10 border-primary/30' : 'bg-black/30 border-white/5 opacity-40'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${a.earned ? 'text-primary' : 'text-white/30'}`} />
                      <span className="text-[7px] font-black uppercase text-white/70 leading-tight">{a.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black tracking-[3px] text-white/30 uppercase">Favorites</span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {favorites.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleTechClick(f.id)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/30 border border-white/10 hover:border-primary/30"
                  >
                    <Star className="w-3 h-3 text-primary fill-primary" />
                    <span className="text-[10px] font-black text-white uppercase">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentTechniques.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black tracking-[3px] text-white/30 uppercase">Recently Viewed</span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {recentTechniques.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleTechClick(r.id)}
                    className="shrink-0 px-3 py-2 rounded-full bg-black/30 border border-white/10 hover:border-primary/30"
                  >
                    <span className="text-[10px] font-black text-white uppercase">{r.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Category Sections */}
      <div className="flex flex-col gap-6">
        {categories.map((cat) => {
          const items = (techniquesData[cat.key] || []).filter(matchesQuery);
          if (items.length === 0) return null;

          return (
            <div key={cat.key} className="flex flex-col gap-3">
              <div className="flex items-center gap-3 select-none">
                <span className="text-[9px] font-black tracking-[3px] text-white/30 uppercase">{cat.title}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {items.map((item) => {
                  const stage = progressMap[item.id]?.stage || 'Beginner';
                  const rating = overallRating(item.metrics);
                  return (
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
                      {mounted && progressMap[item.id]?.favorite && (
                        <div className="absolute top-2 left-2 z-10">
                          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                        </div>
                      )}

                      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black relative mb-3">
                        <img
                          src={techImage(item)}
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/300x300/111115/333339/png?text=${encodeURIComponent(item.name)}`; }}
                          alt={item.name}
                          className="w-full h-full object-cover opacity-75 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-black uppercase text-white tracking-wide group-hover:text-primary transition-all">
                            {item.name}
                          </h4>
                          {mounted && <StageBadge stage={stage} />}
                        </div>
                        <span className="text-[8px] font-black tracking-wider text-primary uppercase mt-0.5">{item.subtitle}</span>
                        <p className="text-[9px] text-white/40 line-clamp-2 mt-1 leading-normal">{item.description}</p>

                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-3 mb-1">
                          <div className="h-full bg-primary shadow-[0_0_5px_rgba(226,255,59,0.3)]" style={{ width: `${rating}%` }} />
                        </div>
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-widest block text-left">
                          COMBAT RATING: {rating}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
