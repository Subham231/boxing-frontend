import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight, Heart, Bolt, Dumbbell, ShieldHalf } from 'lucide-react';

const Dominance: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();

    const goals = [
        { id: 'Stamina', label: 'STAMINA', icon: <Heart size={24} /> },
        { id: 'Aerial', label: 'AERIAL', icon: <Bolt size={24} />, recommended: true },
        { id: 'Strength', label: 'STRENGTH', icon: <Dumbbell size={24} /> },
        { id: 'Endurance', label: 'ENDURANCE', icon: <ShieldHalf size={24} /> },
    ];

    const selectedGoal = data.primary_goal || 'Aerial';

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <div>
                <header className="flex justify-between items-center mb-6">
                    <div className="text-[10px] font-black tracking-[3px] text-primary uppercase">Strategy Deployed</div>
                    <div className="text-[10px] font-bold tracking-[2px] text-white/40 uppercase">Step 03 / 10</div>
                </header>

                <section className="text-left mb-8">
                    <h1 className="text-4xl font-black italic uppercase leading-[0.9] tracking-tighter">
                        Select Your <br /> <span className="text-primary">Dominance</span>
                    </h1>
                    <p className="text-[10px] font-bold text-white/40 tracking-[1.5px] mt-4 leading-relaxed uppercase">
                        Align your training strategy with your primary athletic objective.
                    </p>
                </section>
            </div>

            <main className="grid grid-cols-2 gap-4 py-4">
                {goals.map((goal) => (
                    <button
                        key={goal.id}
                        type="button"
                        onClick={() => updateData({ primary_goal: goal.id, goals: [goal.id] })}
                        className={`relative flex flex-col items-center justify-center h-44 rounded-[30px] border transition-all duration-300 ${
                            selectedGoal === goal.id
                                ? 'border-primary bg-white/5 opacity-100 scale-100 shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)]'
                                : 'border-white/5 bg-white/[0.02] opacity-60 scale-95'
                        }`}
                    >
                        {goal.recommended && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-[8px] font-black px-3 py-1 rounded-full text-black uppercase tracking-wider">
                                Recommended
                            </div>
                        )}
                        <div
                            className={`w-12 h-12 rounded-full border flex items-center justify-center mb-4 transition-all ${
                                selectedGoal === goal.id
                                    ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] w-14 h-14'
                                    : 'border-white/5 bg-white/5'
                            }`}
                        >
                            {goal.icon}
                        </div>
                        <span
                            className={`text-[10px] font-black italic tracking-widest uppercase ${
                                selectedGoal === goal.id ? 'text-primary' : 'text-white'
                            }`}
                        >
                            {goal.label}
                        </span>
                    </button>
                ))}
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button
                    onClick={nextStep}
                    className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider shadow-[0_10px_40px_rgba(var(--primary-rgb),0.3)]"
                >
                    DEPLOY STRATEGY <ChevronRight size={24} className="ml-2 inline" />
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default Dominance;
