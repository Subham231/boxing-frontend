import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight, Bolt } from 'lucide-react';

const Intensity: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const selectedLvl = (data as any).intensity || 3;

    const options = [
        { id: 1, label: 'LIGHT TECH', desc: 'FORM & PRECISION FOCUS' },
        { id: 2, label: 'HIGH VOLUME', desc: 'ENDURANCE & METABOLIC BURN' },
        { id: 3, label: 'ABSOLUTE WAR', desc: 'MAXIMUM SYSTEM OUTPUT', accent: true }
    ];

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 09/10</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">How deep are <br /> <span className="text-primary italic font-black">We going today?</span></h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    Configure engine output level for your initial sessions.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-3 py-4">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => updateData({ intensity: opt.id } as any)}
                        className={`p-6 rounded-3xl border transition-all duration-300 text-center flex flex-col items-center justify-center ${selectedLvl === opt.id
                                ? 'border-primary bg-primary/5 scale-[1.02] shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]'
                                : 'border-white/5 opacity-60'
                            }`}
                    >
                        <span className={`text-[10px] font-black tracking-widest mb-1 ${selectedLvl === opt.id ? 'text-primary' : 'text-white/40'}`}>
                            LEVEL 0{opt.id}
                        </span>
                        <h2 className={`text-2xl font-black italic tracking-tighter ${selectedLvl === opt.id && opt.accent ? 'text-primary' : 'text-white'}`}>
                            {opt.label}
                        </h2>
                        <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${selectedLvl === opt.id ? 'text-primary opacity-80' : 'text-white/20'}`}>
                            {opt.desc}
                        </p>
                    </button>
                ))}
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button onClick={nextStep} className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider">
                    LOCK IN SETTINGS <Bolt size={24} className="ml-2 inline" />
                </button>
                <button onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default Intensity;
