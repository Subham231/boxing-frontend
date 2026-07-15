'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sun, CloudSun, Moon, Ghost } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { loadPlannerProfile, savePlannerProfile } from '@/lib/planner-profile';
import type { PlannerProfile } from '@/types';

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
const PEAK_CHOICES = [
    { key: 'MORNING', icon: Sun, label: 'MORNING', time: '05:00 - 11:00' },
    { key: 'AFTERNOON', icon: CloudSun, label: 'AFTERNOON', time: '12:00 - 16:00' },
    { key: 'EVENING', icon: Moon, label: 'EVENING', time: '17:00 - 21:00' },
    { key: 'NIGHT', icon: Ghost, label: 'NIGHT', time: '22:00 - 02:00' },
];

interface PlannerOnboardingWizardProps {
    mode: 'create' | 'regenerate';
    onComplete: (profile: PlannerProfile) => void;
    onCancel?: () => void;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-4 py-2.5 rounded-full border text-[11px] font-black uppercase tracking-wide transition-all ${active
                    ? 'bg-primary/10 border-primary text-primary shadow-[0_0_12px_rgba(226,255,59,0.15)]'
                    : 'bg-black/30 border-white/10 text-white/50 hover:border-white/20'
                }`}
        >
            {children}
        </button>
    );
}

export default function PlannerOnboardingWizard({ mode, onComplete, onCancel }: PlannerOnboardingWizardProps) {
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
            minutesPerSession: 30,
            restDays: 2,
            equipment: [],
            injuries: [],
            preferredStyle: 'Hybrid',
            intensityPreference: 'Moderate',
            peakWindow: 'MORNING',
            preferredTime: '07:30',
            ...saved,
        };
    }, []);

    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState<PlannerProfile>(initial);

    const totalSteps = 7;

    const update = (patch: Partial<PlannerProfile>) => setProfile((p) => ({ ...p, ...patch }));

    const toggleInList = (key: 'goals' | 'equipment' | 'injuries', value: string) => {
        setProfile((p) => {
            const list = p[key] || [];
            // "None" for injuries is exclusive of everything else.
            if (key === 'injuries' && value === 'None') {
                return { ...p, injuries: list.includes('None') ? [] : ['None'] };
            }
            let next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
            if (key === 'injuries') next = next.filter((v) => v !== 'None');
            return { ...p, [key]: next };
        });
    };

    const next = () => setStep((s) => Math.min(totalSteps, s + 1));
    const back = () => setStep((s) => Math.max(1, s - 1));

    const handleFinish = () => {
        const saved = savePlannerProfile(profile);
        onComplete(saved);
    };

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
                                        onChange={(e) => update({ [key]: Number(e.target.value) } as Partial<PlannerProfile>)}
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
                    <>
                        <label className="text-[9px] font-black text-primary tracking-widest uppercase">TRAINING AVAILABILITY</label>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <span className="text-[9px] font-bold text-white/40 uppercase">Days Per Week</span>
                                <div className="flex gap-2 flex-wrap">
                                    {[2, 3, 4, 5, 6, 7].map((d) => (
                                        <Pill key={d} active={profile.daysPerWeek === d} onClick={() => update({ daysPerWeek: d })}>{d}</Pill>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-[9px] font-bold text-white/40 uppercase">Minutes Per Session</span>
                                <div className="flex gap-2 flex-wrap">
                                    {[15, 30, 45, 60, 90].map((m) => (
                                        <Pill key={m} active={profile.minutesPerSession === m} onClick={() => update({ minutesPerSession: m })}>{m}m</Pill>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-[9px] font-bold text-white/40 uppercase">Rest Days</span>
                                <div className="flex gap-2 flex-wrap">
                                    {[0, 1, 2, 3].map((r) => (
                                        <Pill key={r} active={profile.restDays === r} onClick={() => update({ restDays: r })}>{r}</Pill>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
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

                {step === 7 && (
                    <>
                        <label className="text-[9px] font-black text-primary tracking-widest uppercase">SESSION TIMING</label>
                        <div className="grid grid-cols-2 gap-3.5">
                            {PEAK_CHOICES.map((choice) => {
                                const Icon = choice.icon;
                                const active = profile.peakWindow === choice.key;
                                return (
                                    <div
                                        key={choice.key}
                                        onClick={() => update({ peakWindow: choice.key })}
                                        className={`flex flex-col items-center gap-1.5 p-4 rounded-3xl border cursor-pointer transition-all duration-300 ${active ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(226,255,59,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-white/40'}`} />
                                        <span className={`text-[10px] font-black uppercase ${active ? 'text-primary' : 'text-white/60'}`}>{choice.label}</span>
                                        <span className="text-[8px] text-white/30 font-semibold">{choice.time}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex flex-col gap-2 mt-2">
                            <span className="text-[9px] font-bold text-white/40 uppercase">Preferred Session Start</span>
                            <input
                                type="time"
                                value={profile.preferredTime}
                                onChange={(e) => update({ preferredTime: e.target.value })}
                                className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-lg font-black text-white outline-none focus:border-primary w-full"
                            />
                        </div>
                    </>
                )}
            </GlassCard>

            <footer className="flex flex-col gap-3">
                {step < totalSteps ? (
                    <NeonButton onClick={next} className="w-full h-14">
                        CONTINUE <ArrowRight className="w-4 h-4 ml-1 inline" />
                    </NeonButton>
                ) : (
                    <NeonButton onClick={handleFinish} className="w-full h-14">
                        <Check className="w-4 h-4 mr-1 inline" /> GENERATE TACTICAL PROTOCOL
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