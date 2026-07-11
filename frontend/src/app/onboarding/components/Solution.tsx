import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight } from 'lucide-react';

const Experience: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();

    const ranks = [
        { id: 'Novice', label: 'NOVICE', desc: 'Starting from zero. Basic mechanics.', num: '01' },
        { id: 'Amateur', label: 'AMATEUR', desc: 'I know the fundamentals. Active fighter.', num: '02' },
        { id: 'Pro', label: 'PRO', desc: 'High technical ability. Competition level.', num: '03' },
    ];

    const selectedRank = data.experience_level;

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 04/10</div>
                <h1 className="text-4xl font-bold leading-tight">
                    What is your <br /> <span className="text-primary italic font-black">Training Level?</span>
                </h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    This determines the complexity of the combinations.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-3 py-4">
                {ranks.map((rank) => (
                    <button
                        key={rank.id}
                        type="button"
                        onClick={() => updateData({ experience_level: rank.id })}
                        className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 glass-card ${
                            selectedRank === rank.id
                                ? 'border-primary bg-primary/5 scale-[1.02] shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]'
                                : 'border-white/5 opacity-60'
                        }`}
                    >
                        <div className="text-left">
                            <h2 className={`text-2xl font-black italic ${selectedRank === rank.id ? 'text-primary' : 'text-white'}`}>
                                {rank.label}
                            </h2>
                            <p className="text-[10px] text-white/40 mt-1 uppercase font-bold tracking-widest">{rank.desc}</p>
                        </div>
                        <div
                            className={`w-10 h-10 rounded-full border flex items-center justify-center font-black text-sm ${
                                selectedRank === rank.id ? 'border-primary bg-primary text-black' : 'border-white/10 text-white/20'
                            }`}
                        >
                            {rank.num}
                        </div>
                    </button>
                ))}
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button
                    onClick={() => {
                        if (!data.experience_level) {
                            alert('Select your training level to continue.');
                            return;
                        }
                        nextStep();
                    }}
                    className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider"
                >
                    LOCK IN RANK <ChevronRight size={24} className="ml-2 inline" />
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default Experience;
