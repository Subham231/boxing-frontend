import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';

const PhysicalStats: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();

    return (
        <div className="flex flex-col items-center text-center gap-8">
            <div className="text-[10px] font-black tracking-[4px] text-primary uppercase">ONBOARDING 05/10</div>
            <h2 className="text-3xl font-bold uppercase">Biometric Specs</h2>

            <div className="w-full flex flex-col gap-6">
                <div className="glass-card flex flex-col gap-4">
                    <div className="flex justify-between items-center text-sm font-mono uppercase text-primary">
                        <span>Height</span>
                        <span>{data.height} cm</span>
                    </div>
                    <input
                        type="range"
                        min="100"
                        max="250"
                        value={data.height}
                        onChange={(e) => updateData({ height: parseInt(e.target.value, 10) })}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                <div className="glass-card flex flex-col gap-4">
                    <div className="flex justify-between items-center text-sm font-mono uppercase text-primary">
                        <span>Weight</span>
                        <span>{data.weight} kg</span>
                    </div>
                    <input
                        type="range"
                        min="30"
                        max="200"
                        value={data.weight}
                        onChange={(e) => updateData({ weight: parseInt(e.target.value, 10) })}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>
            </div>

            <div className="flex flex-col w-full gap-4 mt-8">
                <button type="button" onClick={nextStep} className="btn-primary w-full">
                    NEXT
                </button>
                <button type="button" onClick={prevStep} className="text-text-muted hover:text-white transition-colors">
                    BACK
                </button>
            </div>
        </div>
    );
};

export default PhysicalStats;
