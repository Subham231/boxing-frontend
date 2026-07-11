import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight } from 'lucide-react';

const FightingStance: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const selectedStance = (data as any).stance || 'Orthodox';

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 07/10</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">Select Your <br /> <span className="text-primary italic font-black">Fighting Stance</span></h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    This calibrates your drills and movement patterns.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-6 py-4">
                {[
                    { id: 'Orthodox', label: 'ORTHODOX', desc: 'LEFT LEAD ??? RIGHT HANDED' },
                    { id: 'Southpaw', label: 'SOUTHPAW', desc: 'RIGHT LEAD ??? LEFT HANDED' }
                ].map((stance) => (
                    <button
                        key={stance.id}
                        onClick={() => updateData({ stance: stance.id } as any)}
                        className={`p-10 rounded-[30px] border transition-all duration-300 flex flex-col items-center justify-center ${selectedStance === stance.id
                                ? 'border-primary bg-primary/5 scale-[1.02] shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]'
                                : 'border-white/5 opacity-60'
                            }`}
                    >
                        <h2 className={`text-4xl font-black italic tracking-tighter ${selectedStance === stance.id ? 'text-white opacity-100' : 'text-white opacity-30'}`}>
                            {stance.label}
                        </h2>
                        <p className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${selectedStance === stance.id ? 'text-primary' : 'text-white/20'}`}>
                            {stance.desc}
                        </p>
                    </button>
                ))}
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button onClick={nextStep} className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider">
                    CONFIRM STANCE <ChevronRight size={24} className="ml-2 inline" />
                </button>
                <button onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default FightingStance;
