import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight, Brain, Trophy, ShieldHalf, Dumbbell } from 'lucide-react';

const CoreDriver: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const selectedTrigger = data.trigger || 'Pro Ambitions';

    const drivers = [
        { id: 'Stress Relief', label: 'STRESS RELIEF', icon: <Brain size={24} /> },
        { id: 'Pro Ambitions', label: 'PRO AMBITIONS', icon: <Trophy size={24} /> },
        { id: 'Self Defense', label: 'SELF DEFENSE', icon: <ShieldHalf size={24} /> },
        { id: 'Pure Aesthetics', label: 'AESTHETICS', icon: <Dumbbell size={24} /> },
    ];

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 08/10</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">
                    What is your <br /> <span className="text-primary italic font-black">Core Driver?</span>
                </h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    Identify what keeps you moving during deep fatigue.
                </p>
            </header>

            <main className="flex-1 grid grid-cols-2 gap-4 items-center">
                {drivers.map((driver) => (
                    <button
                        key={driver.id}
                        type="button"
                        onClick={() => updateData({ trigger: driver.id })}
                        className={`flex flex-col items-center gap-3 p-8 rounded-2xl border transition-all duration-300 ${
                            selectedTrigger === driver.id
                                ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]'
                                : 'border-white/5 bg-white/[0.02]'
                        }`}
                    >
                        <div
                            className={`transition-all ${
                                selectedTrigger === driver.id ? 'text-primary scale-125' : 'text-primary/50'
                            }`}
                        >
                            {driver.icon}
                        </div>
                        <span
                            className={`text-[10px] font-black tracking-widest ${
                                selectedTrigger === driver.id ? 'text-primary' : 'text-white/40'
                            }`}
                        >
                            {driver.label}
                        </span>
                    </button>
                ))}
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button onClick={nextStep} className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider">
                    CHOOSE PURPOSE <ChevronRight size={24} className="ml-2 inline" />
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default CoreDriver;
