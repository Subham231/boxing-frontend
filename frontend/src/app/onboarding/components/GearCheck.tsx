import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { Check } from 'lucide-react';

const GearCheck: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();

    const equipmentOptions = ['Heavy Bag', 'Jump Rope', 'Dumbbells', 'Speed Bag', 'Hand Wraps'];
    const selectedEquipment = data.constraints?.equipment || [];
    const injuries = data.constraints?.injuries || '';

    const toggleEquipment = (item: string) => {
        const newItems = selectedEquipment.includes(item)
            ? selectedEquipment.filter((i) => i !== item)
            : [...selectedEquipment, item];
        updateData({
            constraints: { ...data.constraints, equipment: newItems },
        });
    };

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 06/10</div>
                <h1 className="text-4xl font-bold leading-tight uppercase">
                    Battle <br /> <span className="text-primary italic font-black">Gear Check</span>
                </h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    Identify your available equipment to customize drills.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-8 py-4">
                <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-black tracking-widest text-primary uppercase">Equipment Status</label>
                    <div className="flex flex-wrap gap-2">
                        {equipmentOptions.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => toggleEquipment(item)}
                                className={`px-6 py-3 rounded-full text-[10px] font-black uppercase border transition-all ${
                                    selectedEquipment.includes(item)
                                        ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]'
                                        : 'bg-white/5 text-white/40 border-white/10'
                                }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-black tracking-widest text-primary uppercase">Any Injuries?</label>
                    <input
                        type="text"
                        placeholder="E.G., WRIST PAIN..."
                        value={injuries}
                        onChange={(e) =>
                            updateData({
                                constraints: { ...data.constraints, injuries: e.target.value },
                            })
                        }
                        className="w-full bg-transparent border-b border-white/20 py-2 text-xl font-bold outline-none focus:border-primary transition-all uppercase tracking-tight"
                    />
                </div>
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button
                    onClick={nextStep}
                    className="btn-primary w-full h-[75px] text-xl font-black italic uppercase tracking-wider"
                >
                    GEAR VERIFIED <Check size={24} className="ml-2 inline" />
                </button>
                <button type="button" onClick={prevStep} className="text-[10px] font-black text-white/40 tracking-[2px] uppercase">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default GearCheck;
