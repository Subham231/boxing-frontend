'use client';

import React, { useState, useRef } from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { Camera, Upload, ChevronRight, UserCircle2, Sparkles, Check } from 'lucide-react';

const RING_NAME_SUGGESTIONS = ['TITAN', 'SHADOW', 'VIPER', 'THUNDER', 'IRONCLAD', 'STRIKER'];
const PROFESSION_SUGGESTIONS = ['Engineer', 'Student', 'Athlete', 'Entrepreneur', 'Doctor', 'Coach'];
const AGE_PRESETS = [18, 21, 24, 27, 30, 35, 40];

const Identity: React.FC = () => {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const [cameraActive, setCameraActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        typeof window !== 'undefined' ? localStorage.getItem('boxing_user_avatar') : null
    );
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [signupError, setSignupError] = useState<string | null>(null);

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

    const handleSignUp = async () => {
        setSignupError(null);
        const name = (data.ringName || 'TITAN').trim();
        const phone = data.phone.trim();
        if (!name || !phone) {
            setSignupError('Please enter your ring name and phone number to continue.');
            return;
        }
        if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
            setSignupError('Enter your phone number in international format, e.g. +919876543210.');
            return;
        }

        updateData({ ringName: name, phone });
        nextStep();
    };

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-4">
                <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-2">FIGHTER PROFILE</div>
                <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
                    Set up your <span className="text-primary">identity</span>.
                </h1>
                <p className="text-white/50 mt-2 text-xs sm:text-sm leading-relaxed font-semibold">
                    Customize your fighter handle, age and profession or tap a recommended tag.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-4 py-1">
                {/* Avatar Row */}
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="relative w-16 h-16 rounded-full border-2 border-primary overflow-hidden shadow-[0_0_20px_rgba(var(--primary-rgb),0.25)] bg-white/5 flex items-center justify-center shrink-0">
                        {previewUrl ? (
                            <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        ) : cameraActive ? (
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                        ) : (
                            <UserCircle2 size={36} className="text-white/20" />
                        )}
                    </div>

                    <div className="flex-1 flex gap-2">
                        <button
                            type="button"
                            onClick={cameraActive ? capturePhoto : startCamera}
                            className="flex-1 py-2.5 px-3 rounded-xl border border-primary/50 bg-primary/10 text-primary font-bold text-[9px] tracking-wider flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-all active:scale-95"
                        >
                            <Camera size={12} /> {cameraActive ? 'CAPTURE' : 'PHOTO'}
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-2.5 px-3 rounded-xl border border-white/10 text-white/80 font-bold text-[9px] tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/5 transition-all active:scale-95"
                        >
                            <Upload size={12} /> GALLERY
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    </div>
                </div>

                {/* Form Fields & Interactive Menus */}
                <div className="flex flex-col gap-3.5">
                    {/* Ring Name */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black tracking-widest text-primary uppercase flex items-center gap-1">
                                Ring Name <span className="text-[8px] text-white/40 font-bold">(RECOMMENDED: TITAN)</span>
                            </label>
                            <span className="text-[8px] bg-primary/20 text-primary font-black px-2 py-0.5 rounded-full uppercase">Most Picked</span>
                        </div>
                        <input
                            type="text"
                            placeholder="e.g. TITAN"
                            value={data.ringName || ''}
                            onChange={(e) => {
                                setSignupError(null);
                                updateData({ ringName: e.target.value });
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-base font-black text-white outline-none focus:border-primary transition-all tracking-wider"
                        />
                        {/* Quick Presets */}
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {RING_NAME_SUGGESTIONS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => updateData({ ringName: preset })}
                                    className={`text-[8px] font-black px-2.5 py-1 rounded-lg border uppercase transition-all ${
                                        data.ringName === preset
                                            ? 'bg-primary text-black border-primary'
                                            : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Age & Profession Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Age */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-black tracking-widest text-primary uppercase">Age</label>
                            <select
                                value={data.age || 25}
                                onChange={(e) => updateData({ age: Number(e.target.value) })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-primary transition-all"
                            >
                                {Array.from({ length: 65 }, (_, i) => i + 15).map((a) => (
                                    <option key={a} value={a} className="bg-zinc-900 text-white">
                                        {a} Years
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Profession */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-black tracking-widest text-primary uppercase">Profession</label>
                            <select
                                value={data.profession || 'Engineer'}
                                onChange={(e) => updateData({ profession: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-primary transition-all"
                            >
                                {PROFESSION_SUGGESTIONS.map((prof) => (
                                    <option key={prof} value={prof} className="bg-zinc-900 text-white">
                                        {prof}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black tracking-widest text-primary uppercase">Phone Number</label>
                        <input
                            type="tel"
                            placeholder="+91..."
                            value={data.phone ?? '+91'}
                            onChange={(e) => {
                                setSignupError(null);
                                updateData({ phone: e.target.value });
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-base font-bold text-white outline-none focus:border-primary transition-all tracking-tight"
                        />
                    </div>
                </div>

                {signupError && (
                    <p className="text-[11px] font-bold text-red-400 text-center leading-relaxed">{signupError}</p>
                )}
            </main>

            <footer className="mt-4 flex flex-col gap-2.5">
                <button
                    onClick={handleSignUp}
                    className="btn-primary w-full h-14 flex items-center justify-center gap-2 text-sm"
                >
                    CONTINUE <ChevronRight size={18} />
                </button>
                <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default Identity;
