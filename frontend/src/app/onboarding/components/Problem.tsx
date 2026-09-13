'use client';

import React, { useState, useRef } from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { Camera, Upload, ChevronRight, UserCircle2, Sparkles, Flame, Check } from 'lucide-react';

const RING_NAME_SUGGESTIONS = ['TITAN', 'SHADOW', 'VIPER', 'THUNDER', 'IRONCLAD', 'STRIKER'];
const PROFESSION_SUGGESTIONS = ['Student', 'Engineer', 'Athlete', 'Entrepreneur', 'Doctor', 'Coach', 'Artist', 'Other'];
const PROMISE_SUGGESTIONS = ['DISCIPLINE', 'RELENTLESS', 'CHAMPION', 'UNSTOPPABLE', 'WARRIOR', 'FOCUS'];

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
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });
            let videoEl: HTMLVideoElement | null = null;
            const deadline = Date.now() + 1500;
            while (Date.now() < deadline) {
                if (videoRef.current) { videoEl = videoRef.current; break; }
                await new Promise(r => setTimeout(r, 30));
            }
            if (!videoEl) { stream.getTracks().forEach(t => t.stop()); alert('Camera preview could not start. Try again.'); return; }
            videoEl.srcObject = stream;
            setCameraActive(true);
            await new Promise<void>(resolve => {
                videoEl!.onloadedmetadata = () => resolve();
                setTimeout(resolve, 1000);
            });
            try { await videoEl.play(); } catch {}
        } catch (err: any) {
            const n = err?.name || '';
            if (n === 'NotAllowedError' || n === 'PermissionDeniedError') {
                alert('Camera permission denied. Please allow camera access in your browser settings.');
            } else if (n === 'NotFoundError') {
                alert('No camera found on this device.');
            } else {
                alert('Could not start camera. Please try the gallery upload instead.');
            }
        }
    };

    const capturePhoto = () => {
        const videoEl = videoRef.current;
        if (!videoEl) return;
        const canvas = document.createElement('canvas');
        canvas.width  = videoEl.videoWidth  || 320;
        canvas.height = videoEl.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoEl, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewUrl(dataUrl);
        localStorage.setItem('boxing_user_avatar', dataUrl);
        stopCamera();
    };

    const stopCamera = () => {
        const videoEl = videoRef.current;
        if (videoEl?.srcObject) {
            (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            videoEl.srcObject = null;
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
        const name = (data.ringName || '').trim();
        const age = Number(data.age) || 0;
        const profession = (data.profession || '').trim();
        const promiseWord = (data.promiseWord || '').trim();
        const email = (data.email || '').trim();

        // 1. Name Validation: Mandatory, > 3 and < 20 limit
        if (!name) {
            setSignupError('Ring Name is mandatory. Please enter your name.');
            return;
        }
        if (name.length < 3 || name.length > 20) {
            setSignupError('Ring Name must be between 3 and 20 characters long.');
            return;
        }

        // 2. Age Validation: Mandatory
        if (!age || age < 10 || age > 100) {
            setSignupError('Age is mandatory. Please select a valid age.');
            return;
        }

        // 3. Promise Word Validation: Mandatory
        if (!promiseWord || promiseWord.length < 2) {
            setSignupError('Promise Word is mandatory. Choose or enter your commitment word.');
            return;
        }

        // 4. Email Validation: Mandatory first signup identity
        if (!email) {
            setSignupError('Email address is mandatory.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setSignupError('Enter a valid email address.');
            return;
        }

        updateData({
            ringName: name,
            age: age,
            profession: profession || 'Fighter',
            promiseWord: promiseWord.toUpperCase(),
            email,
        });
        nextStep();
    };

    return (
        <div className="flex flex-col min-h-full justify-between py-2 pb-6 max-w-md mx-auto w-full">
            <header className="text-left mb-2">
                <div className="flex items-center gap-1.5 mb-1 text-[9px] font-black text-primary uppercase tracking-widest">
                    <Sparkles size={12} />
                    <span>STEP 01 — FIGHTER PROFILE</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
                    Setup your <span className="text-primary">Identity</span>
                </h1>
                <p className="text-white/60 text-xs mt-1 font-semibold leading-relaxed">
                    Start with your email, then set up your athlete credentials for a personalized AI training protocol.
                </p>
            </header>

            <main className="flex-1 flex flex-col gap-3.5 my-auto overflow-y-auto pr-0.5">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black tracking-widest text-primary uppercase">Email Address</label>
                    <input
                        type="email"
                        autoComplete="email"
                        value={data.email || ''}
                        onChange={(e) => updateData({ email: e.target.value })}
                        placeholder="you@email.com"
                        className="w-full bg-transparent border-b border-white/20 py-2 text-xl font-bold outline-none focus:border-primary transition-all tracking-tight"
                    />
                </div>
                {/* Photo / Avatar Capture */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black tracking-widest text-primary uppercase flex items-center justify-between">
                        <span>Profile Picture (Optional)</span>
                    </label>

                    {cameraActive ? (
                        <div className="relative rounded-2xl overflow-hidden border border-primary/50 bg-black aspect-video flex flex-col items-center justify-center">
                            <video ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" />
                            <div className="absolute bottom-2 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="w-14 h-14 rounded-full bg-primary border-4 border-white shadow-[0_0_20px_rgba(226,255,59,0.5)] flex items-center justify-center active:scale-95 transition-transform"
                                >
                                    <Camera size={20} className="text-black" />
                                </button>
                                <button type="button" onClick={stopCamera} className="text-[9px] font-black text-white/80 bg-black/60 px-2 py-1 rounded uppercase tracking-wider">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="relative w-14 h-14 rounded-full border-2 border-primary overflow-hidden shadow-[0_0_15px_rgba(226,255,59,0.25)] bg-white/5 flex items-center justify-center shrink-0">
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <UserCircle2 size={32} className="text-white/20" />
                                )}
                            </div>
                            <div className="flex-1 flex gap-2">
                                <button
                                    type="button"
                                    onClick={startCamera}
                                    className="flex-1 py-2 px-2.5 rounded-xl border border-primary/50 bg-primary/10 text-primary font-bold text-[9px] tracking-wider flex items-center justify-center gap-1 hover:bg-primary/20 transition-all active:scale-95"
                                >
                                    <Camera size={12} /> {previewUrl ? 'RETAKE' : 'CAMERA'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 py-2 px-2.5 rounded-xl border border-white/10 text-white/80 font-bold text-[9px] tracking-wider flex items-center justify-center gap-1 hover:bg-white/5 transition-all active:scale-95"
                                >
                                    <Upload size={12} /> GALLERY
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Form Fields Container */}
                <div className="flex flex-col gap-3">
                    {/* 1. Ring Name (MANDATORY: > 3 and < 20 limit) */}
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black tracking-widest text-primary uppercase flex items-center gap-1">
                                Ring Name <span className="text-[#E2FF3B]">*</span>
                                <span className="text-[8px] text-white/40 font-bold">(3-20 CHARS MANDATORY)</span>
                            </label>
                            <span className="text-[8px] text-white/40 font-mono">
                                {(data.ringName || '').length}/20
                            </span>
                        </div>
                        <input
                            type="text"
                            placeholder="ENTER YOUR RING NAME"
                            maxLength={20}
                            value={data.ringName || ''}
                            onChange={(e) => {
                                setSignupError(null);
                                updateData({ ringName: e.target.value });
                            }}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-sm font-black text-white outline-none focus:border-primary transition-all tracking-wider uppercase placeholder:text-white/20"
                        />
                        {/* Quick Name Presets */}
                        <div className="flex flex-wrap gap-1 mt-0.5">
                            {RING_NAME_SUGGESTIONS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => updateData({ ringName: preset })}
                                    className={`text-[8px] font-black px-2 py-0.5 rounded-md border uppercase transition-all ${
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

                    {/* 2. Age & Profession Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                        {/* Age (MANDATORY) */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black tracking-widest text-primary uppercase">
                                Age <span className="text-[#E2FF3B]">*</span>
                            </label>
                            <select
                                value={data.age || 25}
                                onChange={(e) => {
                                    setSignupError(null);
                                    updateData({ age: Number(e.target.value) });
                                }}
                                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                            >
                                {Array.from({ length: 65 }, (_, i) => i + 15).map((a) => (
                                    <option key={a} value={a} className="bg-zinc-900 text-white">
                                        {a} Years Old
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Profession (OPTIONAL) */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black tracking-widest text-white/60 uppercase">
                                Profession <span className="text-[8px] text-white/30">(Optional)</span>
                            </label>
                            <select
                                value={data.profession || ''}
                                onChange={(e) => updateData({ profession: e.target.value })}
                                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                            >
                                <option value="" className="bg-zinc-900 text-white/50">Select (Optional)</option>
                                {PROFESSION_SUGGESTIONS.map((prof) => (
                                    <option key={prof} value={prof} className="bg-zinc-900 text-white">
                                        {prof}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 3. Promise Word (MANDATORY) */}
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black tracking-widest text-primary uppercase flex items-center gap-1">
                                <Flame size={11} className="text-primary" />
                                <span>Sacred Promise Word <span className="text-[#E2FF3B]">*</span></span>
                            </label>
                            <span className="text-[8px] bg-primary/10 text-primary font-black px-1.5 py-0.5 rounded uppercase">Mandatory</span>
                        </div>
                        <input
                            type="text"
                            placeholder="e.g. RELENTLESS, DISCIPLINE"
                            maxLength={20}
                            value={data.promiseWord || ''}
                            onChange={(e) => {
                                setSignupError(null);
                                updateData({ promiseWord: e.target.value.toUpperCase() });
                            }}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-sm font-black text-[#E2FF3B] outline-none focus:border-primary transition-all tracking-wider uppercase placeholder:text-white/20"
                        />
                        {/* Quick Promise Word Presets */}
                        <div className="flex flex-wrap gap-1 mt-0.5">
                            {PROMISE_SUGGESTIONS.map((word) => (
                                <button
                                    key={word}
                                    type="button"
                                    onClick={() => updateData({ promiseWord: word })}
                                    className={`text-[8px] font-black px-2 py-0.5 rounded-md border uppercase transition-all ${
                                        data.promiseWord === word
                                            ? 'bg-primary text-black border-primary'
                                            : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'
                                    }`}
                                >
                                    {word}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {signupError && (
                    <div className="p-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-xs font-bold text-center leading-relaxed text-red-400">
                        {signupError}
                    </div>
                )}
            </main>

            <footer className="mt-3 flex flex-col gap-2">
                <button
                    onClick={handleSignUp}
                    className="btn-primary w-full h-12 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider disabled:opacity-50 shadow-[0_0_20px_rgba(226,255,59,0.3)]"
                >
                    CONFIRM & CONTINUE <ChevronRight size={16} />
                </button>
                <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-0.5 mx-auto">
                    Back
                </button>
            </footer>
        </div>
    );
};

export default Identity;