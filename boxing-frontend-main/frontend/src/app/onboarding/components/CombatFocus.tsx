import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight, Wind, Battery, Zap, Flame } from 'lucide-react';

const CombatFocus: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const selected = data.combatFocus || '';

    const options = [
        {
            id: 'endurance',
            icon: Wind,
            label: 'ENDURANCE PROTOCOL',
            desc: 'Maximizing high-volume movement and lactic acid buffering.',
        },
        {
            id: 'stamina',
            icon: Battery,
            label: 'STAMINA ENGINE',
            desc: 'Extending baseline cardiovascular output and oxygen utilization.',
        },
        {
            id: 'explosive',
            icon: Zap,
            label: 'EXPLOSIVE STRENGTH',
            desc: 'Maximizing punch torque, velocity, and muscle extension snap.',
        },
        {
            id: 'conditioning',
            icon: Flame,
            label: 'CONDITIONING BLITZ',
            desc: 'Fat-burning, high-intensity anaerobic recovery focus.',
        },
    ];

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 12/14</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">Tactical <br /> <span className="text-primary italic font-black">Attribute Selection</span></h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    Isolate your primary combat performance vector.
                </p>
            </header>

            <main className="flex-1 grid grid-cols-2 gap-3 py-4">
                {options.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selected === opt.id;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateData({ combatFocus: opt.id })}
                            className={`flex flex-col items-start p-5 rounded-3xl border text-left transition-all duration-300 ${isSelected
                                    ? 'border-primary bg-primary/5 shadow-[0_0_25px_rgba(var(--primary-rgb),0.2)] scale-[1.02]'
                                    : 'border-white/5 bg-white/[0.02] opacity-60'
                                }`}
                        >
                            <Icon className={`w-5 h-5 mb-3 ${isSelected ? 'text-primary' : 'text-white/40'}`} />
                            <h2 className={`text-sm font-black italic uppercase leading-tight ${isSelected ? 'text-primary' : 'text-white'}`}>
                                {opt.label}
                            </h2>
                            <p className={`text-[9px] font-bold mt-2 uppercase tracking-wide leading-relaxed ${isSelected ? 'text-white/60' : 'text-white/25'}`}>
                                {opt.desc}
                            </p>
                        </button>
                    );
                })}
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button
                    onClick={nextStep}
                    disabled={!selected}
                    className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider disabled:opacity-40"
                >
                    ISOLATE VECTOR <ChevronRight size={24} className="ml-2 inline" />
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default CombatFocus;