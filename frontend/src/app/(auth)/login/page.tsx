'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronRight, ArrowLeft, Loader2, CheckCircle2, ChevronDown, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const GUEST_KEY = 'boxing_guest_mode';

interface Country {
    name: string;
    flag: string;
    code: string;
    dial: string;
}

const COUNTRIES: Country[] = [
    { name: 'India', flag: '🇮🇳', code: 'IN', dial: '+91' },
    { name: 'United States', flag: '🇺🇸', code: 'US', dial: '+1' },
    { name: 'United Kingdom', flag: '🇬🇧', code: 'GB', dial: '+44' },
    { name: 'Australia', flag: '🇦🇺', code: 'AU', dial: '+61' },
    { name: 'Canada', flag: '🇨🇦', code: 'CA', dial: '+1' },
    { name: 'UAE', flag: '🇦🇪', code: 'AE', dial: '+971' },
    { name: 'Saudi Arabia', flag: '🇸🇦', code: 'SA', dial: '+966' },
];

function detectCountry(): Country {
    if (typeof window === 'undefined') return COUNTRIES[0];
    try {
        const lang = navigator.language || 'en-IN';
        const region = lang.split('-')[1]?.toUpperCase();
        const match = COUNTRIES.find(c => c.code === region);
        return match ?? COUNTRIES[0];
    } catch {
        return COUNTRIES[0];
    }
}

interface CountryDropdownProps {
    selected: Country;
    onSelect: (c: Country) => void;
}

const CountryDropdown: React.FC<CountryDropdownProps> = ({ selected, onSelect }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 60);
        else setQuery('');
    }, [open]);

    const filtered = useMemo(() =>
        query.trim()
            ? COUNTRIES.filter(c =>
                c.name.toLowerCase().includes(query.toLowerCase()) ||
                c.dial.includes(query)
            )
            : COUNTRIES,
        [query]
    );

    return (
        <div className="cc-wrap relative" ref={ref}>
            <button
                type="button"
                className="cc-trigger"
                onClick={() => setOpen(o => !o)}
            >
                <span className="cc-flag mr-1">{selected.flag}</span>
                <span className="cc-dial mr-1">{selected.dial}</span>
                <ChevronDown size={13} className={`cc-chevron ${open ? 'open' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="cc-dropdown absolute left-0 mt-2 w-[250px] bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                    >
                        <div className="cc-search-row flex items-center gap-2 p-3 border-b border-white/5 bg-white/[0.02]">
                            <Search size={13} className="text-text-muted" />
                            <input
                                ref={searchRef}
                                className="cc-search bg-transparent outline-none text-xs text-white placeholder-white/20 w-full"
                                placeholder="Search country..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                        </div>
                        <div className="cc-list max-h-[220px] overflow-y-auto">
                            {filtered.map(c => (
                                <button
                                    key={c.code + c.dial}
                                    type="button"
                                    className={`cc-item flex items-center justify-between w-full px-4 py-2 text-xs text-left hover:bg-white/5 ${c.code === selected.code ? 'bg-primary/5 text-primary' : 'text-white'}`}
                                    onClick={() => { onSelect(c); setOpen(false); }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{c.flag}</span>
                                        <span>{c.name}</span>
                                    </div>
                                    <span className="text-primary font-bold">{c.dial}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const OtpInput: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
        if (e.key === 'Backspace') {
            const digits = value.padEnd(6, '').split('').slice(0, 6);
            if (digits[idx]) {
                digits[idx] = '';
                onChange(digits.join(''));
            } else if (idx > 0) {
                refs.current[idx - 1]?.focus();
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
        const char = e.target.value.replace(/\D/g, '').slice(-1);
        const digits = value.padEnd(6, '').split('').slice(0, 6);
        digits[idx] = char;
        onChange(digits.join(''));
        if (char && idx < 5) refs.current[idx + 1]?.focus();
    };

    return (
        <div className="otp-grid" id="otp-input-group">
            {Array.from({ length: 6 }).map((_, i) => (
                <input
                    key={i}
                    id={`otp-digit-${i}`}
                    ref={el => { refs.current[i] = el; }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ''}
                    onChange={e => handleChange(e, i)}
                    onKeyDown={e => handleKey(e, i)}
                    onFocus={e => e.target.select()}
                    className="otp-box"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                />
            ))}
        </div>
    );
};

function mapError(raw: string): string {
    const msg = raw.toLowerCase();
    if (msg.includes('unsupported phone provider') || msg.includes('phone provider')) {
        return 'SMS provider not configured in Supabase yet. Please enableTwilio/MessageBird in Supabase Authentication Providers.';
    }
    if (msg.includes('invalid') && msg.includes('otp')) return 'That code is wrong or expired. Check the SMS and try again.';
    if (msg.includes('expired')) return 'The code expired. Tap "Resend Code" to get a fresh one.';
    return raw;
}

const ZephyrLogo: React.FC = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-label="Zephyr logo">
        <polygon points="20,2 38,34 2,34" fill="none" stroke="#E2FF3B" strokeWidth="2.5" />
        <path d="M13 24 L27 16 L20 28" stroke="#E2FF3B" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
);

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [country, setCountry] = useState<Country>(COUNTRIES[0]);
    const [number, setNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const numberRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCountry(detectCountry());
    }, []);

    const fullPhone = useMemo(() => {
        const stripped = number.replace(/[\s\-().]/g, '');
        return `${country.dial}${stripped}`;
    }, [country, number]);

    useEffect(() => {
        if (otp.replace(/\s/g, '').length === 6 && step === 'otp' && !loading) {
            handleVerifyOtp();
        }
    }, [otp]);

    const handleSendOtp = async () => {
        setError('');
        const stripped = number.replace(/[\s\-().]/g, '');
        if (stripped.length < 6) {
            setError('Please enter your phone number.');
            return;
        }
        if (!supabase) {
            setError('Authentication service offline. Please try again later.');
            return;
        }
        setLoading(true);
        try {
            const { error: supaErr } = await supabase.auth.signInWithOtp({ phone: fullPhone });
            if (supaErr) throw supaErr;
            setStep('otp');
        } catch (err: any) {
            setError(mapError(err?.message || String(err)));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setError('');
        if (!supabase) {
            setError('Authentication service offline.');
            return;
        }
        setLoading(true);
        try {
            const { error: supaErr } = await supabase.auth.verifyOtp({
                phone: fullPhone,
                token: otp,
                type: 'sms',
            });
            if (supaErr) throw supaErr;
            setSuccess(true);
            setTimeout(() => {
                router.replace('/');
            }, 1500);
        } catch (err: any) {
            setError(mapError(err?.message || String(err)));
            setOtp('');
            setLoading(false);
        }
    };

    const handleGuestContinue = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(GUEST_KEY, 'true');
            router.replace('/');
        }
    };

    if (success) {
        return (
            <div className="login-success">
                <CheckCircle2 size={72} className="text-primary animate-bounce" />
                <h2 className="login-success-title">Identity Confirmed</h2>
                <p className="login-success-sub text-glow">Entering the ring...</p>
                <div className="login-spinner-row mt-2">
                    <Loader2 size={20} className="spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="login-root" id="login-page">
            <div className="login-bg-glow" aria-hidden="true" />

            <div className="login-card">
                <header className="login-header">
                    <ZephyrLogo />
                    <div>
                        <div className="login-brand-tag">SPARAI</div>
                        <div className="login-brand-sub">BOXING INTELLIGENCE</div>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {step === 'phone' && (
                        <motion.div
                            key="phone-step"
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.35 }}
                        >
                            <div className="login-step-label">STEP 01 / 02</div>
                            <h1 className="login-title">
                                Enter Your<br />
                                <span className="login-title-accent">Fight Number</span>
                            </h1>
                            <p className="login-desc">
                                We'll SMS a one-time code to verify your identity. No passwords ever.
                            </p>

                            <div className="phone-row">
                                <CountryDropdown selected={country} onSelect={c => { setCountry(c); numberRef.current?.focus(); }} />
                                <input
                                    id="phone-number-input"
                                    ref={numberRef}
                                    type="tel"
                                    inputMode="numeric"
                                    className="phone-number-input"
                                    placeholder="98765 43210"
                                    value={number}
                                    onChange={e => setNumber(e.target.value.replace(/[^0-9\s\-().]/g, ''))}
                                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                                    autoComplete="tel-national"
                                    autoFocus
                                />
                            </div>

                            <div className="login-hint">
                                Full number: <strong className="login-phone-display">{fullPhone || `${country.dial} ??????`}</strong>
                            </div>

                            {error && (
                                <div className="login-error text-center" role="alert">
                                    {error}
                                </div>
                            )}

                            <button
                                id="send-otp-btn"
                                className="login-btn-primary"
                                onClick={handleSendOtp}
                                disabled={loading || number.replace(/[\s\-().]/g, '').length < 6}
                            >
                                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : <>Send OTP Code <ChevronRight size={20} /></>}
                            </button>

                            <div className="login-divider">
                                <span>or</span>
                            </div>
                            <button
                                id="guest-continue-btn"
                                className="login-guest-btn"
                                onClick={handleGuestContinue}
                                disabled={loading}
                            >
                                Continue as Guest
                            </button>
                            <p className="login-guest-note">
                                You can link your phone number later in Settings.
                            </p>
                        </motion.div>
                    )}

                    {step === 'otp' && (
                        <motion.div
                            key="otp-step"
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.35 }}
                        >
                            <button
                                className="login-back-btn"
                                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                            >
                                <ArrowLeft size={16} /> <span>Change Number</span>
                            </button>

                            <div className="login-step-label">STEP 02 / 02</div>
                            <h1 className="login-title">
                                Verify Your<br />
                                <span className="login-title-accent">Combat Code</span>
                            </h1>
                            <p className="login-desc">
                                6-digit code sent to&nbsp;
                                <strong className="login-phone-display">{fullPhone}</strong>
                            </p>

                            <div className="login-otp-wrapper">
                                <Shield size={18} className="login-otp-icon" />
                                <OtpInput value={otp} onChange={setOtp} />
                            </div>

                            {error && (
                                <div className="login-error text-center" role="alert">
                                    {error}
                                </div>
                            )}

                            <button
                                id="verify-otp-btn"
                                className="login-btn-primary"
                                onClick={handleVerifyOtp}
                                disabled={loading || otp.replace(/\s/g, '').length < 6}
                            >
                                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : <>Verify &amp; Launch Training <ChevronRight size={20} /></>}
                            </button>

                            <button
                                id="resend-otp-btn"
                                className="login-resend-btn"
                                onClick={() => { setOtp(''); setError(''); handleSendOtp(); }}
                                disabled={loading}
                            >
                                Resend Code
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="login-dots" role="progressbar">
                <div className={`login-dot ${step === 'phone' ? 'active' : 'done'}`} />
                <div className={`login-dot ${step === 'otp' ? 'active' : ''}`} />
            </div>
        </div>
    );
}