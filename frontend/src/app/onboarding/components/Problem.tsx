'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/context/OnboardingContext';
import { Camera, Upload, ChevronRight, UserCircle2, LogIn, ArrowLeft } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { sendOtp, confirmOtp, checkOtpRateLimit, checkPhoneExists } from '@/lib/firebase-auth';

const LOGIN_RECAPTCHA_CONTAINER_ID = 'identity-login-recaptcha';

// Renders as the 19th onboarding screen ("Identity Setup") — the first and
// only place in the main onboarding that actually saves anything, since
// account identity (name/phone/avatar) is not planner data and still needs
// to exist somewhere before the user reaches the dashboard.
//
// Also doubles as the entry point for RETURNING users: the "Login" button
// runs a self-contained phone+OTP flow and, on success, skips the rest of
// onboarding entirely and drops them straight on the dashboard, since a
// returning user has already been through all of this before.
const Identity: React.FC = () => {
    const router = useRouter();
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const [cameraActive, setCameraActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        typeof window !== 'undefined' ? localStorage.getItem('boxing_user_avatar') : null
    );
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Sign-up path state ---
    const [signupError, setSignupError] = useState<string | null>(null);
    const [checkingPhone, setCheckingPhone] = useState(false);

    // --- Returning-user login path state ---
    const [showLogin, setShowLogin] = useState(false);
    const [loginStep, setLoginStep] = useState<'phone' | 'otp'>('phone');
    const [loginPhone, setLoginPhone] = useState('');
    const [loginCode, setLoginCode] = useState('');
    const [loginConfirmation, setLoginConfirmation] = useState<ConfirmationResult | null>(null);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

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
        const name = data.ringName.trim();
        const phone = data.phone.trim();
        if (!name || !phone) {
            alert('Complete your profile, fighter.');
            return;
        }
        if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
            setSignupError('Enter your phone number in international format, e.g. +14155551234.');
            return;
        }

        setCheckingPhone(true);
        try {
            const exists = await checkPhoneExists(phone);
            if (exists) {
                setSignupError('This phone number already has an account. Please use Login instead.');
                return;
            }
            updateData({ ringName: name, phone });
            nextStep();
        } finally {
            setCheckingPhone(false);
        }
    };

    // --- Returning-user login handlers ---
    const handleLoginSendOtp = async () => {
        setLoginError(null);
        const trimmed = loginPhone.trim();
        if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
            setLoginError('Enter your number in international format, e.g. +14155551234');
            return;
        }
        setLoginLoading(true);
        try {
            const limitCheck = await checkOtpRateLimit(trimmed);
            if (!limitCheck.allowed) {
                setLoginError(limitCheck.reason || 'Too many attempts for this number today.');
                return;
            }
            const result = await sendOtp(trimmed, LOGIN_RECAPTCHA_CONTAINER_ID);
            setLoginConfirmation(result);
            setLoginStep('otp');
        } catch (e) {
            setLoginError(e instanceof Error ? e.message : 'Could not send verification code.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLoginVerify = async () => {
        if (!loginConfirmation) return;
        setLoginError(null);
        setLoginLoading(true);
        try {
            await confirmOtp(loginConfirmation, loginCode.trim());
            // Returning user — they've already been through onboarding
            // before, so skip straight to the dashboard instead of
            // re-running all 23 steps.
            localStorage.setItem('boxing_onboarding_done', 'true');
            router.replace('/dashboard');
        } catch (e) {
            setLoginError(e instanceof Error ? e.message : 'Invalid code. Try again.');
        } finally {
            setLoginLoading(false);
        }
    };

    if (showLogin) {
        return (
            <div className="flex flex-col min-h-[85vh] justify-between py-2">
                <div id={LOGIN_RECAPTCHA_CONTAINER_ID} />

                <header className="text-left mb-6">
                    <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">LOGIN</div>
                    <h1 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
                        Welcome <span className="text-primary">back</span>.
                    </h1>
                    <p className="text-white/50 mt-4 text-sm leading-relaxed font-semibold">
                        {loginStep === 'phone'
                            ? "Enter your phone number and we'll send you a one-time code."
                            : `Enter the 6-digit code sent to ${loginPhone}`}
                    </p>
                </header>

                <main className="flex-1 flex flex-col gap-5">
                    {loginStep === 'phone' ? (
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black tracking-widest text-primary uppercase">Phone Number</label>
                            <input
                                type="tel"
                                value={loginPhone}
                                onChange={(e) => setLoginPhone(e.target.value)}
                                placeholder="+14155551234"
                                className="w-full bg-transparent border-b border-white/20 py-2 text-2xl font-bold outline-none focus:border-primary transition-all pb-1 tracking-tight"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black tracking-widest text-primary uppercase">6-Digit Code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={loginCode}
                                onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="123456"
                                className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-2xl font-black text-white text-center tracking-[6px] outline-none focus:border-primary placeholder:text-white/20"
                                autoFocus
                            />
                            <button
                                onClick={() => { setLoginStep('phone'); setLoginCode(''); setLoginError(null); }}
                                className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 flex items-center gap-1 self-start mt-1"
                            >
                                <ArrowLeft className="w-3 h-3" /> Change Number
                            </button>
                        </div>
                    )}

                    {loginError && <p className="text-[10px] font-bold text-red-400">{loginError}</p>}
                </main>

                <footer className="mt-8 flex flex-col gap-4">
                    {loginStep === 'phone' ? (
                        <button onClick={handleLoginSendOtp} disabled={loginLoading} className="btn-primary w-full h-16 flex items-center justify-center gap-2 disabled:opacity-50">
                            {loginLoading ? 'SENDING...' : 'SEND CODE'} <ChevronRight size={20} />
                        </button>
                    ) : (
                        <button onClick={handleLoginVerify} disabled={loginLoading || loginCode.length < 6} className="btn-primary w-full h-16 flex items-center justify-center gap-2 disabled:opacity-50">
                            {loginLoading ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
                        </button>
                    )}
                    <button
                        onClick={() => { setShowLogin(false); setLoginStep('phone'); setLoginError(null); }}
                        className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto"
                    >
                        Back to Sign Up
                    </button>
                </footer>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-[85vh] justify-between py-2">
            <header className="text-left mb-6">
                <div className="text-[10px] font-black tracking-[3px] text-primary uppercase mb-3">19 / 23</div>
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
                                onChange={(e) => {
                                    setSignupError(null);
                                    updateData({
                                        [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                                    });
                                }}
                                className="w-full bg-transparent border-b border-white/20 py-2 text-2xl font-bold outline-none focus:border-primary transition-all pb-1 tracking-tight"
                            />
                        </div>
                    ))}
                </div>

                {signupError && (
                    <p className="text-[11px] font-bold text-red-400 text-center leading-relaxed">{signupError}</p>
                )}
            </main>

            <footer className="mt-8 flex flex-col gap-3">
                <button
                    onClick={() => setShowLogin(true)}
                    className="w-full h-14 rounded-full border border-white/15 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
                >
                    <LogIn size={16} /> LOGIN
                </button>
                <button
                    onClick={handleSignUp}
                    disabled={checkingPhone}
                    className="btn-primary w-full h-16 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {checkingPhone ? 'CHECKING...' : 'SIGN UP'} <ChevronRight size={20} />
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
