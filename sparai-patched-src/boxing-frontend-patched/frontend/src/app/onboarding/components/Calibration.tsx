import React, { useEffect, useRef, useState } from 'react';
import { useOnboarding } from '@/context/OnboardingContext';

const Calibration: React.FC = () => {
    const { nextStep, prevStep } = useOnboarding();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    useEffect(() => {
        async function setupCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setHasPermission(true);
            } catch (err) {
                console.error('Camera access denied:', err);
                setHasPermission(false);
            }
        }
        setupCamera();

        return () => {
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-center text-center gap-8">
            <h2 className="text-3xl font-bold uppercase">Eye of the Storm</h2>

            <div className="w-full aspect-[3/4] glass-card overflow-hidden relative border-primary/20">
                {hasPermission === false ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-4">
                        <span className="text-4xl">????</span>
                        <p className="text-sm text-red-500 uppercase font-bold">Camera Access Required</p>
                        <p className="text-xs text-text-muted">
                            Please enable camera permissions in your browser settings to continue.
                        </p>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute inset-0 border-[20px] border-primary/5 pointer-events-none">
                            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary" />
                            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary" />
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary" />
                            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-48 h-48 rounded-full border border-primary/20 bg-primary/5 animate-pulse" />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col w-full gap-4 mt-8">
                <button type="button" onClick={nextStep} className="btn-primary w-full" disabled={!hasPermission}>
                    VERIFIED
                </button>
                <button type="button" onClick={prevStep} className="text-text-muted hover:text-white transition-colors">
                    BACK
                </button>
            </div>
        </div>
    );
};

export default Calibration;
