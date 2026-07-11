import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight } from 'lucide-react';

const PUSHUP_OPTIONS = ['<15', '15-30', '30-50', '50+'];
const EXPERIENCE_OPTIONS = ['Novice', 'Intermediate', 'Contender'];

const FatigueThreshold: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const baseline = data.fitnessBaseline || { pushupMax: '', boxingExperience: '' };

    const setPushupMax = (val: string) => {
        updateData({ fitnessBaseline: { ...baseline, pushupMax: val } });
    };

    const setExperience = (val: string) => {
        updateData({ fitnessBaseline: { ...baseline, boxingExperience: val } });
    };

    const canContinue = !!baseline.pushupMax && !!baseline.boxingExperience;

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 13/14</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">Capacity <br /> <span className="text-primary italic font-black">Threshold Tuning</span></h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    Calibrate system to your current structural limits.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-8 py-4">
                <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black tracking-widest text-primary uppercase">Pushup Max (One Set)</label>
                    <div className="grid grid-cols-4 gap-2">
                        {PUSHUP_OPTIONS.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setPushupMax(opt)}
                                className={`py-4 rounded-2xl border text-[11px] font-black uppercase transition-all ${baseline.pushupMax === opt
                                        ? 'bg-primary/15 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]'
                                        : 'bg-white/[0.02] border-white/5 text-white/40'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black tracking-widest text-primary uppercase">Boxing Experience</label>
                    <div className="flex flex-col gap-2.5">
                        {EXPERIENCE_OPTIONS.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setExperience(opt)}
                                className={`py-4 px-5 rounded-2xl border text-left text-sm font-black uppercase tracking-wide transition-all ${baseline.boxingExperience === opt
                                        ? 'bg-primary/15 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]'
                                        : 'bg-white/[0.02] border-white/5 text-white/40'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button
                    onClick={nextStep}
                    disabled={!canContinue}
                    className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider disabled:opacity-40"
                >
                    CALIBRATE LIMITS <ChevronRight size={24} className="ml-2 inline" />
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default FatigueThreshold;