import React, { useState, useRef } from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import { Camera, Upload, ChevronRight, UserCircle2 } from 'lucide-react';

const Welcome: React.FC = () => {
    const { nextStep } = useOnboarding();
    const [cameraActive, setCameraActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
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

    return (
        <div className="flex flex-col min-h-[80vh] justify-between py-4">
            <header className="text-left mb-8">
                <div className="text-[10px] font-black tracking-[4px] text-primary mb-3 uppercase">ONBOARDING 01/10</div>
                <h1 className="text-5xl font-bold leading-tight">
                    Fighter <br /> <span className="text-primary italic font-black">Identity</span>
                </h1>
                <p className="text-text-muted mt-4 text-sm leading-relaxed pr-10">
                    Establish your visual presence in the global rankings. Take a combat-ready photo or upload your avatar.
                </p>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center gap-10">
                <div className="relative w-48 h-48 rounded-full border-2 border-primary overflow-hidden shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] bg-white/5 flex items-center justify-center">
                    {previewUrl ? (
                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : cameraActive ? (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    ) : (
                        <UserCircle2 size={80} className="text-white/10" />
                    )}
                </div>

                <div className="w-full flex flex-col gap-4">
                    <button
                        onClick={cameraActive ? capturePhoto : startCamera}
                        className="w-full py-4 rounded-full border border-primary text-primary font-bold text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-primary/5 transition-all"
                    >
                        <Camera size={18} /> {cameraActive ? 'CAPTURE PHOTO' : 'TAKE A PHOTO'}
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 rounded-full border border-white/10 text-white font-bold text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-white/5 transition-all"
                    >
                        <Upload size={18} /> FROM GALLERY
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                </div>
            </main>

            <footer className="mt-10">
                <button onClick={nextStep} className="btn-primary w-full h-16 flex items-center justify-center gap-2">
                    CONTINUE <ChevronRight size={20} />
                </button>
                <p className="text-[10px] text-center mt-4 text-white/20 tracking-widest uppercase">Update later in profile</p>
            </footer>
        </div>
    );
};

export default Welcome;
