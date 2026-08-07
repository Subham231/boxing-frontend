'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Target, Lightbulb, AlertTriangle, ChevronRight, ChevronDown,
  Shield, Zap, PersonStanding, Star, Check, PlayCircle, Film, Image as ImageIcon,
  ThumbsUp, ThumbsDown, Sparkles, HelpCircle, Plus,
} from 'lucide-react';
import { getTechniqueById, getCategoryOf, techniquesData, overallRating, TechniqueDetail } from '@/lib/techniques-data';
import {
  loadTechniqueProgress, saveTechniqueProgress, markRecentlyViewed, logPractice,
  practiceTotals, STAGES, LearningStage, TechniqueProgress,
} from '@/lib/guru-progress';
import { GlassCard } from '@/components/ui/GlassCard';
import { MetricsGrid } from '@/components/guru/GuruCharts';
import { firebaseAuth } from '@/lib/firebase';

const CATEGORY_LABELS: Record<string, string> = { punches: 'PUNCH', stances: 'STANCE', kicks: 'KICK', defense: 'DEFENSE' };

function categoryIcon(key: string) {
  if (key === 'punches') return <Target className="w-5 h-5" />;
  if (key === 'stances') return <PersonStanding className="w-5 h-5" />;
  if (key === 'defense') return <Shield className="w-5 h-5" />;
  return <Zap className="w-5 h-5" />;
}

export default function TechniqueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const techId = String(params?.technique || '').toLowerCase();

  const technique = useMemo(() => getTechniqueById(techId), [techId]);
  const categoryKey = useMemo(() => getCategoryOf(techId) || '', [techId]);
  const categoryLabel = CATEGORY_LABELS[categoryKey] || categoryKey.toUpperCase();

  // "Advanced" techniques are the Premium Guru skills gated to Yearly/Elite
  // subscribers. This is checked server-side (never trusting a cached
  // client flag) the moment the page loads.
  const isPremiumTechnique = technique?.difficulty === 'Advanced';
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasEliteAccess, setHasEliteAccess] = useState(false);

  useEffect(() => {
    if (!isPremiumTechnique) {
      setCheckingAccess(false);
      return;
    }
    const unsub = firebaseAuth.onAuthStateChanged(async (user) => {
      if (!user) {
        setHasEliteAccess(false);
        setCheckingAccess(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/subscription/status', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setHasEliteAccess(!!data.premiumGuru);
      } catch {
        setHasEliteAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    });
    return () => unsub();
  }, [isPremiumTechnique]);

  const relatedTechniques = useMemo(() => {
    if (!technique) return [];
    if (technique.relatedIds?.length) {
      return technique.relatedIds.map((id) => getTechniqueById(id)).filter(Boolean) as TechniqueDetail[];
    }
    return (techniquesData[categoryKey] || []).filter((t) => t.id !== technique.id);
  }, [technique, categoryKey]);

  const [progress, setProgress] = useState<TechniqueProgress | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (!technique) return;
    const p = loadTechniqueProgress(technique.id);
    setProgress(p);
    setNotesDraft(p.notes);
    markRecentlyViewed(technique.id);
  }, [technique]);

  if (!technique) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-10 text-white/40 font-bold uppercase text-xs">
        Technique not found. <Link href="/guru" className="text-primary mt-2 uppercase font-black tracking-wider">Back to Guru</Link>
      </div>
    );
  }

  if (isPremiumTechnique && checkingAccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-white/40 font-bold uppercase text-xs gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        Verifying access…
      </div>
    );
  }

  if (isPremiumTechnique && !hasEliteAccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary text-2xl">
          🔒
        </div>
        <h2 className="text-xl font-black uppercase italic text-white">Premium Guru Skill</h2>
        <p className="text-xs text-white/50 font-semibold max-w-[280px] leading-relaxed">
          {technique.name} is part of the Premium Guru library — advanced techniques unlocked exclusively for Yearly / Elite members.
        </p>
        <Link
          href="/subscription"
          className="mt-2 px-6 py-3 rounded-2xl bg-primary text-black text-xs font-black uppercase tracking-widest"
        >
          Unlock with Yearly Plan
        </Link>
        <Link href="/guru" className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1">
          Back to Guru
        </Link>
      </div>
    );
  }

  const update = (patch: Partial<TechniqueProgress>) => {
    setProgress((prev) => {
      const next = { ...(prev as TechniqueProgress), ...patch };
      saveTechniqueProgress(technique.id, next);
      return next;
    });
  };

  const toggleChecklist = (key: keyof TechniqueProgress['checklist']) => {
    if (!progress) return;
    update({ checklist: { ...progress.checklist, [key]: !progress.checklist[key] } });
  };

  const handleNotesBlur = () => update({ notes: notesDraft });

  const handleLogPractice = (reps: number, minutes: number) => {
    const next = logPractice(technique.id, reps, minutes);
    setProgress(next);
  };

  const submitQuiz = () => {
    if (!technique.quiz) return;
    const allCorrect = technique.quiz.every((q, i) => quizAnswers[i] === q.correctIndex);
    setQuizSubmitted(true);
    if (allCorrect) update({ quizPassed: true });
  };

  const rating = overallRating(technique.metrics);
  const totals = progress ? practiceTotals(progress) : { todayReps: 0, todayMinutes: 0, weekReps: 0, weekMinutes: 0, totalReps: 0, totalMinutes: 0 };

  return (
    <div className="flex flex-col gap-6 anim-fade-in pb-16">
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80">MODULE: TECHNICAL BREAKDOWN</span>
        <span className="opacity-40 uppercase">GURU_{categoryLabel}_ANALYSIS</span>
      </div>

      <header className="flex justify-between items-center">
        <div>
          <div className="text-[10px] font-black text-primary tracking-wider uppercase mb-0.5">{categoryLabel} DETAILS</div>
          <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">TECHNICAL BREAKDOWN</h1>
        </div>
        <div className="flex items-center gap-2">
          {progress && (
            <button
              onClick={() => update({ favorite: !progress.favorite })}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                progress.favorite ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              <Star className={`w-4 h-4 ${progress.favorite ? 'fill-primary' : ''}`} />
            </button>
          )}
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Visual Card */}
      <div className="relative rounded-3xl h-64 border border-white/10 bg-black/45 overflow-hidden shadow-2xl">
        {technique.videoUrl ? (
          <video
            src={technique.videoUrl}
            poster={technique.image}
            className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={technique.image}
            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/600x400/111115/333339/png?text=${encodeURIComponent(technique.name)}`; }}
            alt={technique.name}
            className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 z-10 flex flex-col gap-3">
          {technique.isAiPick && (
            <div className="bg-primary text-black font-black text-[7px] tracking-widest px-3.5 py-0.5 rounded-full uppercase self-start shadow-[0_0_8px_rgba(226,255,59,0.3)]">
              AI RECOMMENDED
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black italic uppercase text-white leading-none mb-1">{technique.name}</h2>
            <p className="text-xs text-white/50 font-semibold line-clamp-2 max-w-[85%] leading-snug">{technique.description}</p>
          </div>
          <div className="flex items-center gap-3 pr-10">
            <span className="text-[7px] font-black text-primary uppercase tracking-widest">COMBAT RATING</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary shadow-[0_0_5px_rgba(226,255,59,0.4)]" style={{ width: `${rating}%` }} />
            </div>
            <span className="text-[9px] font-black text-primary tracking-widest">{rating}%</span>
          </div>
        </div>
      </div>

      {/* Learning Progress Stage Selector */}
      {progress && (
        <GlassCard className="p-5 border-white/5 bg-black/40">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-3">Your Learning Progress</span>
          <div className="flex gap-1.5">
            {STAGES.map((s) => {
              const active = progress.stage === s;
              return (
                <button
                  key={s}
                  onClick={() => update({ stage: s })}
                  className={`flex-1 py-2.5 rounded-xl border text-[8px] font-black uppercase tracking-wide transition-all ${
                    active ? 'bg-primary/10 border-primary text-primary' : 'bg-black/30 border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Overview */}
      <GlassCard className="p-6 border-primary/20 bg-black/40 flex flex-col gap-4">
        <div className="flex justify-between items-start border-b border-white/5 pb-4">
          <div>
            <h3 className="text-lg font-black uppercase text-primary italic leading-none mb-0.5">{technique.name}</h3>
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{technique.subtitle}</span>
          </div>
          <Shield className="w-5 h-5 text-primary" />
        </div>

        {technique.whyImportant && (
          <div>
            <span className="text-[9px] font-black text-primary/70 uppercase tracking-wide block mb-1">Why It Matters</span>
            <p className="text-xs text-white/70 font-semibold leading-relaxed">{technique.whyImportant}</p>
          </div>
        )}
        {technique.whenToUse && (
          <div>
            <span className="text-[9px] font-black text-primary/70 uppercase tracking-wide block mb-1">When To Use It</span>
            <p className="text-xs text-white/70 font-semibold leading-relaxed">{technique.whenToUse}</p>
          </div>
        )}

        {/* Steps timeline */}
        <div className="flex flex-col gap-5 border-l-2 border-primary/20 pl-5 ml-2.5 my-2">
          {technique.steps.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[29px] top-0 w-4 h-4 rounded-full bg-primary text-black font-black text-[8px] flex items-center justify-center shadow-[0_0_8px_rgba(226,255,59,0.4)]">
                {idx + 1}
              </div>
              <p className="text-sm font-semibold text-white/80 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {technique.stats && technique.stats.length > 0 && (
          <div className="grid grid-cols-3 gap-3.5 pt-4 border-t border-white/5">
            {technique.stats.map((stat, idx) => (
              <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl py-3 flex flex-col items-center justify-center">
                <span className="text-sm font-black text-primary italic leading-none mb-1">{stat.val}</span>
                <span className="text-[7px] font-black text-white/30 tracking-wider uppercase">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Full Attribute Breakdown */}
      <GlassCard className="p-5 border-white/5 bg-black/40">
        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-4">Performance Attributes</span>
        <MetricsGrid metrics={technique.metrics} />
      </GlassCard>

      {/* Primary Targets */}
      {technique.targets && technique.targets.length > 0 && (
        <div className="flex flex-col gap-2.5 select-none">
          <span className="text-[9px] font-black text-white/40 tracking-[2px] uppercase">PRIMARY TARGETS</span>
          <div className="flex gap-2 flex-wrap">
            {technique.targets.map((t, idx) => (
              <div key={idx} className="px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <Target className="w-3 h-3 text-red-500" /><span>{t}</span>
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
            <span className="text-[9px] font-black uppercase tracking-[3px]">AI COACH TIP</span>
          </div>
          <p className="text-xs text-white/80 font-bold italic leading-relaxed">&ldquo;{technique.pro_tip}&rdquo;</p>
        </GlassCard>
      )}

      {/* Coaching Tips */}
      {technique.tips && technique.tips.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-[9px] font-black text-white/40 tracking-[2px] uppercase">KEY COACHING TIPS</span>
          <div className="flex flex-col gap-2.5">
            {technique.tips.map((t, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/80 leading-normal font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Mistakes */}
      {technique.mistakes && technique.mistakes.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-[9px] font-black text-red-500/80 tracking-[2px] uppercase">COMMON MISTAKES</span>
          <div className="flex flex-col gap-2.5">
            {technique.mistakes.map((m, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/80 leading-normal font-semibold">{m}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Situations / Advantages / Weaknesses */}
      {(technique.bestFor || technique.advantages || technique.weaknesses) && (
        <div className="grid grid-cols-1 gap-4">
          {technique.bestFor && (
            <GlassCard className="p-5 border-white/5 bg-black/40">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-3">Best Situations To Use</span>
              <div className="flex flex-wrap gap-2">
                {technique.bestFor.map((b, i) => (
                  <span key={i} className="text-[10px] font-bold text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{b}</span>
                ))}
              </div>
            </GlassCard>
          )}
          <div className="grid grid-cols-2 gap-3">
            {technique.advantages && (
              <GlassCard className="p-4 border-primary/20 bg-primary/[0.03] flex flex-col gap-2">
                <div className="flex items-center gap-1.5"><ThumbsUp className="w-3.5 h-3.5 text-primary" /><span className="text-[9px] font-black text-primary uppercase">Advantages</span></div>
                <ul className="flex flex-col gap-1.5">
                  {technique.advantages.map((a, i) => <li key={i} className="text-[10px] text-white/70 font-semibold leading-snug">• {a}</li>)}
                </ul>
              </GlassCard>
            )}
            {technique.weaknesses && (
              <GlassCard className="p-4 border-red-500/15 bg-red-500/[0.02] flex flex-col gap-2">
                <div className="flex items-center gap-1.5"><ThumbsDown className="w-3.5 h-3.5 text-red-400" /><span className="text-[9px] font-black text-red-400 uppercase">Weaknesses</span></div>
                <ul className="flex flex-col gap-1.5">
                  {technique.weaknesses.map((w, i) => <li key={i} className="text-[10px] text-white/70 font-semibold leading-snug">• {w}</li>)}
                </ul>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {/* Advanced Variations */}
      {technique.variations && technique.variations.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="text-[9px] font-black text-white/40 tracking-[2px] uppercase">ADVANCED VARIATIONS</span>
          <div className="flex flex-col gap-2">
            {technique.variations.map((v, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold text-white/80">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Checklist */}
      {progress && (
        <GlassCard className="p-5 border-white/5 bg-black/40">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-3">Interactive Checklist</span>
          <div className="flex flex-col gap-2.5">
            {([
              ['understand', 'Understand Stance/Mechanics'],
              ['practice', 'Practice Movement'],
              ['drill', 'Complete Drill'],
              ['timing', 'Master Timing'],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => toggleChecklist(key)} className="flex items-center gap-3 text-left">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${progress.checklist[key] ? 'bg-primary border-primary' : 'border-white/20'}`}>
                  {progress.checklist[key] && <Check className="w-3 h-3 text-black" />}
                </div>
                <span className={`text-xs font-bold ${progress.checklist[key] ? 'text-white line-through decoration-primary/50' : 'text-white/60'}`}>{label}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Practice Tracker */}
      {progress && (
        <GlassCard className="p-5 border-white/5 bg-black/40">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-4">Practice Tracker</span>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><span className="text-lg font-black text-primary block">{totals.todayReps}</span><span className="text-[8px] text-white/40 font-bold uppercase">Today's Reps</span></div>
            <div><span className="text-lg font-black text-white block">{totals.weekReps}</span><span className="text-[8px] text-white/40 font-bold uppercase">Weekly Reps</span></div>
            <div><span className="text-lg font-black text-white block">{totals.totalReps}</span><span className="text-[8px] text-white/40 font-bold uppercase">Total Repetitions</span></div>
            <div><span className="text-lg font-black text-white block">{totals.totalMinutes}m</span><span className="text-[8px] text-white/40 font-bold uppercase">Time Practiced</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleLogPractice(10, 2)} className="flex-1 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase">+10 Reps</button>
            <button onClick={() => handleLogPractice(25, 5)} className="flex-1 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase">+25 Reps</button>
            <button onClick={() => handleLogPractice(50, 10)} className="flex-1 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase">+50 Reps</button>
          </div>
        </GlassCard>
      )}

      {/* Notes */}
      {progress && (
        <GlassCard className="p-5 border-white/5 bg-black/40">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-3">Your Training Notes</span>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Write cues, corrections, or reminders for next time..."
            rows={3}
            className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white font-semibold outline-none focus:border-primary placeholder:text-white/25 resize-none"
          />
        </GlassCard>
      )}

      {/* Recommended Drills */}
      {technique.drills && technique.drills.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-[9px] font-black text-white/40 tracking-[2px] uppercase">RECOMMENDED DRILLS</span>
          <div className="flex flex-col gap-2.5">
            {technique.drills.map((d, i) => (
              <GlassCard key={i} className="p-4 border-white/5 bg-black/40 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-white uppercase block">{d.name}</span>
                  <span className="text-[9px] text-white/40 font-semibold">{d.equipment} • {d.benefit}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] font-black text-primary block">{d.duration}</span>
                  <span className="text-[8px] text-white/30 font-bold uppercase">{d.difficulty}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Multimedia Placeholder */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { icon: PlayCircle, label: 'Technique Video' },
          { icon: Film, label: 'Slow-Motion Replay' },
          { icon: ImageIcon, label: 'Frame Sequence' },
        ].map((m) => (
          <div key={m.label} className="aspect-square rounded-2xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-1.5 text-white/20">
            <m.icon className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase tracking-wide text-center px-1">{m.label}</span>
            <span className="text-[6px] text-white/15 uppercase">Coming Soon</span>
          </div>
        ))}
      </div>

      {/* Quiz */}
      {technique.quiz && technique.quiz.length > 0 && (
        <GlassCard className="p-5 border-white/5 bg-black/40">
          <button onClick={() => setShowQuiz((v) => !v)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Knowledge Check</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showQuiz ? 'rotate-180' : ''}`} />
          </button>
          {showQuiz && (
            <div className="flex flex-col gap-5 mt-4">
              {technique.quiz.map((q, qi) => (
                <div key={qi} className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-white/80">{q.question}</span>
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, oi) => {
                      const selected = quizAnswers[qi] === oi;
                      const correct = quizSubmitted && oi === q.correctIndex;
                      const wrong = quizSubmitted && selected && oi !== q.correctIndex;
                      return (
                        <button
                          key={oi}
                          onClick={() => !quizSubmitted && setQuizAnswers((a) => ({ ...a, [qi]: oi }))}
                          className={`text-left px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                            correct ? 'bg-primary/10 border-primary text-primary' :
                            wrong ? 'bg-red-500/10 border-red-500/40 text-red-300' :
                            selected ? 'bg-white/10 border-white/30 text-white' : 'bg-black/30 border-white/10 text-white/60'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {!quizSubmitted ? (
                <button onClick={submitQuiz} className="btn-primary h-12 text-xs">SUBMIT ANSWERS</button>
              ) : (
                <p className={`text-xs font-black text-center uppercase ${progress?.quizPassed ? 'text-primary' : 'text-red-400'}`}>
                  {progress?.quizPassed ? '✓ Correct — Badge Progress Unlocked!' : 'Not quite — review the lesson and try again.'}
                </p>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Related Skills */}
      <div>
        <div className="flex items-center gap-3 mb-4 select-none">
          <span className="text-[9px] font-black tracking-[4px] text-white/30 uppercase">RELATED SKILLS</span>
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {relatedTechniques.length > 0 ? (
            relatedTechniques.map((rel) => (
              <div
                key={rel.id}
                onClick={() => router.push(`/guru/${rel.id}`)}
                className="bg-black/40 border border-white/5 hover:border-primary/20 rounded-3xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-[0_0_10px_rgba(226,255,59,0.1)]">
                    {categoryIcon(getCategoryOf(rel.id) || categoryKey)}
                  </div>
                  {rel.isAiPick && (
                    <span className="bg-primary text-black font-black text-[6px] tracking-wider px-2 py-0.5 rounded-full uppercase">FOUNDATION</span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white truncate mb-0.5">{rel.name}</h4>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{rel.subtitle}</span>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-3 mb-1">
                    <div className="h-full bg-primary" style={{ width: `${overallRating(rel.metrics)}%` }} />
                  </div>
                  <span className="text-[6px] font-black text-primary uppercase tracking-widest">{overallRating(rel.metrics)}% RATING</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-6 text-white/20 text-xs font-bold uppercase">No related techniques.</div>
          )}
        </div>
      </div>
    </div>
  );
}
