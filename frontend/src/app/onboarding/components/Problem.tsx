'use client';

import React, { useState, useRef } from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { Camera, Upload, ChevronRight, UserCircle2 } from 'lucide-react';

// Renders as the 11th onboarding screen ("Identity Setup") — the first and
// only place in the main onboarding that actually saves anything, since
// account identity (name/phone/avatar) is not planner data and still needs
// to exist somewhere before the user reaches the dashboard.
const Identity: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const [cameraActive, setCameraActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        typeof window !== 'undefined' ? localStorage.getItem('boxing_user_avatar') : null
    );
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (err) {
            alert('Camera access denied.');
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setPreviewUrl(dataUrl);
            localStorage.setItem('boxing_user_avatar', dataUrl);
            stopCamera();
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;
                setPreviewUrl(dataUrl);
                localStorage.setItem('boxing_user_avatar', dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleContinue = () => {
        const name = data.ringName.trim();
        const phone = data.phone.trim();
        if (!name || !phone) {
            alert('Complete your profile, fighter.');
            return;
        }
        updateData({ ringName: name, phone });
        nextStep();
    };

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">19 / 20</div>
                <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
                    Set up your <span className="text-primary">identity</span>.
                </h1>
                <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
                    Your ring name and contact set up your account. We'll collect your training details
                    later, inside the Planner.
                </p>
            </header>

            <main className="flex-1 flex flex-col items-center gap-8 py-2">
                <div className="relative w-32 h-32 rounded-full border-2 border-primary overflow-hidden shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] bg-white/5 flex items-center justify-center shrink-0">
                    {previewUrl ? (
                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : cameraActive ? (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    ) : (
                        <UserCircle2 size={56} className="text-white/10" />
                    )}
                </div>

                <div className="w-full flex gap-3">
                    <button
                        onClick={cameraActive ? capturePhoto : startCamera}
                        className="flex-1 py-3 rounded-full border border-primary text-primary font-bold text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-primary/5 transition-all"
                    >
                        <Camera size={14} /> {cameraActive ? 'CAPTURE' : 'PHOTO'}
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-3 rounded-full border border-white/10 text-white font-bold text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
                    >
                        <Upload size={14} /> GALLERY
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                </div>

                <div className="w-full flex flex-col gap-5 mt-2">
                    {[
                        { label: 'Ring Name', key: 'ringName' as const, placeholder: 'e.g. TITAN', type: 'text' },
                        { label: 'Age', key: 'age' as const, placeholder: '25', type: 'number' },
                        { label: 'Profession', key: 'profession' as const, placeholder: 'e.g. Student, Engineer, Coach', type: 'text' },
                        { label: 'Phone Number', key: 'phone' as const, placeholder: '+1...', type: 'tel' },
                    ].map((field) => (
                        <div key={field.key} className="flex flex-col gap-2">
                            <label className="text-[10px] font-black tracking-widest text-primary uppercase">{field.label}</label>
                            <input
                                type={field.type}
                                placeholder={field.placeholder}
                                value={data[field.key] ?? ''}
                                onChange={(e) =>
                                    updateData({
                                        [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                                    })
                                }
                                className="w-full bg-transparent border-b border-white/20 py-2 text-2xl font-bold outline-none focus:border-primary transition-all pb-1 tracking-tight"
                            />
                        </div>
                    ))}
                </div>
            </main>

            <footer className="mt-8 flex flex-col gap-4">
                <button onClick={handleContinue} className="btn-primary w-full h-16 flex items-center justify-center gap-2">
                    CONTINUE <ChevronRight size={20} />
                </button>
                <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
                    Back
                </button>
                <p className="text-[10px] text-center text-primary/40 tracking-[0.2em] font-black uppercase">
                    Secure Enclave Active
                </p>
            </footer>
        </div>
    );
};

export default Identity;
