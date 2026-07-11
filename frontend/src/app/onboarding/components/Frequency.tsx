import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight } from 'lucide-react';

const Frequency: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const selectedFreq = (data as any).frequency || 3;

    const options = [
        { id: 2, label: 'MAINTENANCE' },
        { id: 3, label: 'ACTIVE' },
        { id: 5, label: 'CONTENDER' },
        { id: 7, label: 'PRO LEVEL' }
    ];

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 10/10</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">Weekly <br /> <span className="text-primary italic font-black">Commitment</span></h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    How many days a week do you plan to hit the floor?
                </p>
            </header>

            <main className="flex-1 grid grid-cols-2 gap-4 items-center">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => updateData({ frequency: opt.id } as any)}
                        className={`flex flex-col items-center gap-3 p-10 rounded-2xl border transition-all duration-300 ${selectedFreq === opt.id
                                ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] scale-105'
                                : 'border-white/5 bg-white/[0.02]'
                            }`}
                    >
                        <span className={`text-4xl font-black italic tracking-tighter ${selectedFreq === opt.id ? 'text-primary' : 'text-white/20'}`}>
                            0{opt.id}
                        </span>
                        <span className={`text-[10px] font-black tracking-widest ${selectedFreq === opt.id ? 'text-primary' : 'text-white/40'}`}>
                            {opt.label}
                        </span>
                    </button>
                ))}
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button onClick={nextStep} className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider">
                    CONFIRM FREQUENCY <ChevronRight size={24} className="ml-2 inline" />
                </button>
                <button onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default Frequency;
