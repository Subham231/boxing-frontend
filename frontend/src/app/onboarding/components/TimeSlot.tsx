import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { ChevronRight, Zap, Trophy, Crown } from 'lucide-react';

const TimeSlot: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();

    const timeOptions = [
        { id: 20, label: '< 30 MINS', desc: 'Rapid Fire. 2 exercises daily.', icon: <Zap size={24} /> },
        { id: 45, label: '30-60 MINS', desc: 'Core block. 3-5 exercises.', icon: <Trophy size={24} /> },
        { id: 90, label: '60+ MINS', desc: 'Deep immersion. Full volume.', icon: <Crown size={24} /> }
    ];

    const selectedTime = (data as any).available_time;

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 05/10</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">Daily <br /> <span className="text-primary italic font-black">Time Slot</span></h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    This dictates the density and volume of your sessions.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-3 py-4">
                {timeOptions.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => updateData({ available_time: opt.id } as any)}
                        className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 glass-card ${selectedTime === opt.id
                                ? 'border-primary bg-primary/5 scale-[1.02] shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]'
                                : 'border-white/5 opacity-60'
                            }`}
                    >
                        <div className="text-left">
                            <h2 className={`text-2xl font-black italic ${selectedTime === opt.id ? 'text-primary' : 'text-white'}`}>
                                {opt.label}
                            </h2>
                            <p className="text-[10px] text-white/40 mt-1 uppercase font-bold tracking-widest">{opt.desc}</p>
                        </div>
                        <div className={`transition-colors ${selectedTime === opt.id ? 'text-primary' : 'text-white/20'}`}>
                            {opt.icon}
                        </div>
                    </button>
                ))}
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button onClick={nextStep} className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider">
                    LOCK IN TIME <ChevronRight size={24} className="ml-2 inline" />
                </button>
                <button onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default TimeSlot;
