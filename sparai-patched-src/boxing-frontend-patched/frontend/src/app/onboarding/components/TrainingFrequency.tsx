import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight } from 'lucide-react';

const TrainingFrequency: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const selectedDays = data.daysPerWeek || 3;

    const dayLabels: Record<number, string> = {
        1: 'RECOVERY PACE',
        2: 'MAINTENANCE',
        3: 'ACTIVE',
        4: 'BUILDING',
        5: 'CONTENDER',
        6: 'HIGH VOLUME',
        7: 'PRO LEVEL',
    };

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 11/14</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">Weekly <br /> <span className="text-primary italic font-black">Commitment</span></h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    Select your operational frequency.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-6 py-4">
                <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <button
                            key={day}
                            type="button"
                            onClick={() => updateData({ daysPerWeek: day })}
                            className={`aspect-square flex items-center justify-center rounded-2xl border transition-all duration-300 ${selectedDays === day
                                    ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] scale-105'
                                    : 'border-white/5 bg-white/[0.02] opacity-60'
                                }`}
                        >
                            <span className={`text-2xl font-black italic ${selectedDays === day ? 'text-primary' : 'text-white/30'}`}>
                                {day}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
                    <span className="text-4xl font-black italic text-primary leading-none">{selectedDays}</span>
                    <span className="text-sm font-bold text-white/50 uppercase tracking-wide"> {selectedDays === 1 ? 'day' : 'days'} / week</span>
                    <p className="text-[10px] font-black text-white/40 tracking-widest uppercase mt-2">
                        {dayLabels[selectedDays]}
                    </p>
                </div>
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button onClick={nextStep} className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider">
                    LOCK IN FREQUENCY <ChevronRight size={24} className="ml-2 inline" />
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default TrainingFrequency;