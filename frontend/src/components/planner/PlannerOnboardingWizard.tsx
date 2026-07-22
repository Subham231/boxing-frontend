'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { loadPlannerProfile, savePlannerProfile } from '@/lib/planner-profile';
import type { PlannerProfile, WeeklyPlan } from '@/types';
import ScheduleStep from './onboarding/ScheduleStep';
import FingerprintCeremony from './onboarding/FingerprintCeremony';
import GenerationProgress from './onboarding/GenerationProgress';
import ProtocolSummary from './onboarding/ProtocolSummary';

const GOALS = [
  'Weight Loss', 'Conditioning', 'Speed', 'Power', 'Technique',
  'Fight Preparation', 'Endurance', 'Defense', 'Footwork',
];

const EQUIPMENT = [
  'Heavy Bag', 'Double End Bag', 'Speed Bag', 'Jump Rope',
  'Resistance Bands', 'Dumbbells', 'Pull-up Bar', 'Medicine Ball',
];

const INJURIES = ['Shoulder', 'Knee', 'Back', 'Wrist', 'None'];
const BOXING_PROFILES = ['Amateur', 'Intermediate', 'Advanced', 'Professional'];
const STYLES = ['Tactical', 'Technical', 'Conditioning', 'Hybrid'];
const INTENSITIES = ['Light', 'Moderate', 'High', 'Elite'];

interface PlannerOnboardingWizardProps {
  mode: 'create' | 'regenerate';
  onGenerate: (profile: PlannerProfile) => Promise<WeeklyPlan>;
  onLaunch: () => void;
  onCancel?: () => void;
}

type Phase = 'form' | 'ceremony' | 'generating' | 'complete' | 'error';

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full border text-[11px] font-black uppercase tracking-wide transition-all ${
        active
          ? 'bg-primary/10 border-primary text-primary shadow-[0_0_12px_rgba(226,255,59,0.15)]'
          : 'bg-black/30 border-white/10 text-white/50 hover:border-white/20'
      }`}
    >
      {children}
    </button>
  );
}

export default function PlannerOnboardingWizard({ mode, onGenerate, onLaunch, onCancel }: PlannerOnboardingWizardProps) {
  const initial = useMemo<PlannerProfile>(() => {
    const saved = loadPlannerProfile();
    return {
      age: 25,
      height: 175,
      weight: 75,
      gender: 'Male',
      boxingProfile: 'Intermediate',
      goals: [],
      daysPerWeek: 3,
      trainingDays: ['MON', 'WED', 'FRI'],
      minutesPerSession: 30,
      equipment: [],
      injuries: [],
      preferredStyle: 'Hybrid',
      intensityPreference: 'Moderate',
      peakWindow: 'MORNING',
      preferredTime: '07:30',
      ...saved,
    };
  }, []);

  const [phase, setPhase] = useState<Phase>('form');
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<PlannerProfile>(initial);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [genReady, setGenReady] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const totalSteps = 6;

  const update = (patch: Partial<PlannerProfile>) => setProfile((p) => ({ ...p, ...patch }));

  const toggleInList = (key: 'goals' | 'equipment' | 'injuries', value: string) => {
    setProfile((p) => {
      const list = p[key] || [];
      if (key === 'injuries' && value === 'None') {
        return { ...p, injuries: list.includes('None') ? [] : ['None'] };
      }
      let next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      if (key === 'injuries') next = next.filter((v) => v !== 'None');
      return { ...p, [key]: next };
    });
  };

  const toggleWeekday = (day: string) => {
    setProfile((p) => {
      const list = p.trainingDays || [];
      const next = list.includes(day) ? list.filter((d) => d !== day) : [...list, day];
      return { ...p, trainingDays: next, daysPerWeek: next.length || p.daysPerWeek };
    });
  };

  const next = () => setStep((s) => Math.min(totalSteps, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const canContinue = step !== 4 || (profile.trainingDays || []).length > 0;

  const runGeneration = useCallback(
    async (p: PlannerProfile) => {
      setGenError(null);
      setGenReady(false);
      try {
        const result = await onGenerate(p);
        setPlan(result);
        setGenReady(true);
      } catch (e) {
        setGenError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
        setGenReady(true); // let the progress screen finish its visual run, then show the error
      }
    },
    [onGenerate]
  );

  const handleConfirmed = () => {
    const saved = savePlannerProfile(profile);
    setPhase('generating');
    runGeneration(saved);
  };

  const handleGenerationFinished = () => {
    setPhase(genError ? 'error' : 'complete');
  };

  const handleRetry = () => {
    setPhase('ceremony');
  };

  if (phase === 'ceremony') {
    return <FingerprintCeremony onConfirmed={handleConfirmed} />;
  }

  if (phase === 'generating') {
    return <GenerationProgress ready={genReady} onFinished={handleGenerationFinished} />;
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col min-h-[85vh] items-center justify-center gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-black italic uppercase text-white">Generation Failed</h1>
          <p className="text-white/40 text-xs font-semibold mt-2 max-w-xs">{genError}</p>
        </div>
        <NeonButton onClick={handleRetry} className="w-full h-14">TRY AGAIN</NeonButton>
        {onCancel && (
          <button onClick={onCancel} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-2">
            Cancel
          </button>
        )}
      </div>
    );
  }

  if (phase === 'complete' && plan) {
    return <ProtocolSummary profile={profile} plan={plan} onLaunch={onLaunch} />;
  }

  return (
    <div className="flex flex-col gap-6 anim-fade-in select-none pb-12">
      <header className="text-left">
        <span className="text-[10px] font-black text-primary tracking-[3px] uppercase block mb-1">
          {mode === 'regenerate' ? 'REGENERATE PROTOCOL' : 'PLANNER SETUP'}
        </span>
        <h1 className="text-2xl font-black italic uppercase text-white leading-none mb-1">
          FIGHTER CALIBRATION
        </h1>
        <p className="text-xs text-white/50 font-semibold leading-relaxed">
          Step {step} of {totalSteps} — this data drives every exercise the planner generates.
        </p>
      </header>

      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-[3px] flex-1 rounded-full transition-all ${i + 1 <= step ? 'bg-primary' : 'bg-white/10'}`} />
        ))}
      </div>

      <GlassCard className="p-5 border-white/5 bg-black/40 flex flex-col gap-6">
        {step === 1 && (
          <>
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">FIGHTER INFORMATION</label>
            <div className="grid grid-cols-2 gap-4">
              {([
                ['age', 'Age'],
                ['height', 'Height (cm)'],
                ['weight', 'Weight (kg)'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-white/40 uppercase">{label}</span>
                  <input
                    type="number"
                    value={profile[key] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      update({ [key]: val === '' ? '' : Number(val) } as any);
                    }}
                    className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-lg font-black text-white outline-none focus:border-primary"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold text-white/40 uppercase">Gender</span>
                <div className="flex gap-2 flex-wrap">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <Pill key={g} active={profile.gender === g} onClick={() => update({ gender: g })}>{g}</Pill>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">BOXING PROFILE</label>
            <div className="grid grid-cols-2 gap-3">
              {BOXING_PROFILES.map((p) => (
                <Pill key={p} active={profile.boxingProfile === p} onClick={() => update({ boxingProfile: p })}>{p}</Pill>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">GOALS (SELECT ALL THAT APPLY)</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Pill key={g} active={!!profile.goals?.includes(g)} onClick={() => toggleInList('goals', g)}>{g}</Pill>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <ScheduleStep profile={profile} update={update} toggleWeekday={toggleWeekday} />
        )}

        {step === 5 && (
          <>
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">EQUIPMENT AVAILABLE</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {EQUIPMENT.map((e) => (
                <Pill key={e} active={!!profile.equipment?.includes(e)} onClick={() => toggleInList('equipment', e)}>{e}</Pill>
              ))}
            </div>
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">INJURY LIMITATIONS</label>
            <div className="flex flex-wrap gap-2">
              {INJURIES.map((i) => (
                <Pill key={i} active={!!profile.injuries?.includes(i)} onClick={() => toggleInList('injuries', i)}>{i}</Pill>
              ))}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">PREFERRED TRAINING STYLE</label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {STYLES.map((s) => (
                <Pill key={s} active={profile.preferredStyle === s} onClick={() => update({ preferredStyle: s })}>{s}</Pill>
              ))}
            </div>
            <label className="text-[9px] font-black text-primary tracking-widest uppercase">INTENSITY PREFERENCE</label>
            <div className="grid grid-cols-2 gap-3">
              {INTENSITIES.map((i) => (
                <Pill key={i} active={profile.intensityPreference === i} onClick={() => update({ intensityPreference: i })}>{i}</Pill>
              ))}
            </div>
          </>
        )}
      </GlassCard>

      <footer className="flex flex-col gap-3">
        {step < totalSteps ? (
          <NeonButton onClick={next} disabled={!canContinue} className="w-full h-14 disabled:opacity-50">
            CONTINUE <ArrowRight className="w-4 h-4 ml-1 inline" />
          </NeonButton>
        ) : (
          <NeonButton onClick={() => setPhase('ceremony')} className="w-full h-14">
            GENERATE TACTICAL PROTOCOL
          </NeonButton>
        )}

        <div className="flex justify-between items-center px-1">
          {step > 1 ? (
            <button onClick={back} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-2 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          ) : <span />}

          {onCancel && (
            <button onClick={onCancel} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-2">
              Cancel
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
