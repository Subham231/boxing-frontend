'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Sparkles, 
  Bell, 
  EyeOff, 
  ShieldCheck, 
  Trash2, 
  AlertTriangle, 
  Camera, 
  Edit2, 
  Check, 
  X,
  Brain,
  ChevronRight,
  LogOut,
  FileText,
  LockKeyhole,
  Mail
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useMyProfile } from '@/lib/profile-client';
import { signOutFirebase } from '@/lib/firebase-auth';
import { firebaseAuth } from '@/lib/firebase';
import { getVisionSessionHistory } from '@/lib/session-log';

interface OnboardingData {
  ringName?: string;
  ring_name?: string;
  lifestyle?: string;
  persona?: string;
  goals?: string[];
  primary_goal?: string;
  promise?: string;
  trigger?: string;
  promise_trigger?: string;
  avatar_url?: string;
  experience_level?: string;
  phone_number?: string;
  age?: number;
  profession?: string;
  height?: number;
  weight?: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profileData, setProfileData] = useState<OnboardingData>({});
  const { profile: liveProfile, updateProfile } = useMyProfile();
  const [subscription, setSubscription] = useState<{ active: boolean; planName: string; plan: string | null; expiresAt: string | null }>({ active: false, planName: 'No subscription', plan: null, expiresAt: null });

  // App Settings
  const [notifications, setNotifications] = useState(true);
  const [stealth, setStealth] = useState(false);

  // Edit fields modal
  const [editField, setEditField] = useState<'ringName' | 'promise' | 'avatar_url' | 'age' | 'profession' | null>(null);
  const [editValue, setEditValue] = useState('');

  // Debrief Overlay State
  const [showDebrief, setShowDebrief] = useState(false);
  const [debriefDays, setDebriefDays] = useState(0);
  const [debriefDrills, setDebriefDrills] = useState(0);
  const [debriefText, setDebriefText] = useState('SYNTHESIZING_WEEKLY_PROGRESS...');
  const [debriefGenerating, setDebriefGenerating] = useState(false);

  // Audio / Speech Synthesis Ref
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    // Load onboarding data
    try {
      const data = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
      setProfileData(data);
    } catch {}

    // Load app settings
    try {
      const settings = JSON.parse(localStorage.getItem('app_settings') || '{"notifications":true, "stealth":false}');
      setNotifications(settings.notifications);
      setStealth(settings.stealth);
      
      // Apply stealth class immediately
      if (settings.stealth) {
        document.body.classList.add('stealth-active');
      } else {
        document.body.classList.remove('stealth-active');
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSubscription = async () => {
      const user = firebaseAuth.currentUser;
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/subscription/status', { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setSubscription({ active: data.active === true, planName: data.planName || 'No subscription', plan: data.plan || null, expiresAt: data.expiresAt || null });
      } catch { }
    };
    loadSubscription();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (liveProfile) {
      setProfileData((prev) => ({
        ...prev,
        ringName: liveProfile.display_name || prev.ringName,
        ring_name: liveProfile.display_name || prev.ring_name,
        age: liveProfile.age ?? prev.age,
        profession: liveProfile.profession || prev.profession,
        avatar_url: liveProfile.avatar_url || prev.avatar_url,
        promise: liveProfile.promise_word || prev.promise,
        promise_trigger: liveProfile.promise_word || prev.promise_trigger,
        phone_number: liveProfile.phone || prev.phone_number,
        ...(liveProfile.onboarding_data && typeof liveProfile.onboarding_data === 'object'
          ? (liveProfile.onboarding_data as Record<string, unknown>)
          : {}),
      }));
    }
  }, [liveProfile]);

  const saveSettings = (updatedNotif: boolean, updatedStealth: boolean) => {
    localStorage.setItem('app_settings', JSON.stringify({ notifications: updatedNotif, stealth: updatedStealth }));
    setNotifications(updatedNotif);
    setStealth(updatedStealth);

    if (updatedStealth) {
      document.body.classList.add('stealth-active');
    } else {
      document.body.classList.remove('stealth-active');
    }
  };

  const handleEditSubmit = async () => {
    if (!editField) return;
    const updated = { ...profileData };
    if (editField === 'ringName') {
      updated.ringName = editValue;
      updated.ring_name = editValue;
      await updateProfile({ displayName: editValue });
    } else if (editField === 'promise') {
      updated.promise = editValue;
      updated.promise_trigger = editValue;
      await updateProfile({ promiseWord: editValue });
    } else if (editField === 'avatar_url') {
      updated.avatar_url = editValue;
      await updateProfile({ avatarUrl: editValue });
    } else if (editField === 'age') {
      const numAge = Number(editValue);
      updated.age = numAge;
      await updateProfile({ age: numAge });
    } else if (editField === 'profession') {
      updated.profession = editValue;
      await updateProfile({ profession: editValue });
    }

    localStorage.setItem('boxing_onboarding_data', JSON.stringify(updated));
    setProfileData(updated);
    setEditField(null);
  };

  const openEdit = (field: 'ringName' | 'promise' | 'avatar_url' | 'age' | 'profession', label: string) => {
    setEditField(field);
    const currVal = field === 'ringName' 
      ? (profileData.ringName || profileData.ring_name || '') 
      : field === 'promise' 
        ? (profileData.promise || profileData.promise_trigger || '') 
        : field === 'avatar_url'
          ? (profileData.avatar_url || '')
          : field === 'age'
            ? String(profileData.age ?? '')
            : (profileData.profession || '');
    setEditValue(currVal);
  };

  const triggerWeeklyDebrief = async () => {
    setShowDebrief(true);
    setDebriefGenerating(true);
    setDebriefText('SYNTHESIZING_WEEKLY_PROGRESS...');

    // Cancel any playing speech
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    // Collect stats from last 7 days
    let daysActive = 0;
    let totalDrills = 0;
    const weeklySummary: string[] = [];
    const visionSessions = getVisionSessionHistory().filter((session) => Date.now() - new Date(session.date).getTime() <= 7 * 24 * 60 * 60 * 1000);

    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toDateString();

      try {
        const completed = JSON.parse(localStorage.getItem('workout_progress_' + dateKey) || '[]');
        if (completed.length > 0) {
          daysActive++;
          totalDrills += completed.length;
          weeklySummary.push(`${d.toDateString()}: ${completed.length} drills`);
        }
      } catch {}
    }

    setDebriefDays(daysActive);
    setDebriefDrills(totalDrills);
    const name = profileData.ringName || profileData.ring_name || 'FIGHTER';
    const punches = visionSessions.reduce((sum, session) => sum + session.punches, 0);
    const scores = visionSessions.map((session) => session.score).filter((score) => Number.isFinite(score));
    const averageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    const recap = `${name}, you logged ${daysActive} active training day${daysActive === 1 ? '' : 's'} and ${totalDrills} completed drill${totalDrills === 1 ? '' : 's'} this week. ${visionSessions.length ? `Your ${visionSessions.length} vision session${visionSessions.length === 1 ? '' : 's'} tracked ${punches} punches with an average score of ${averageScore}/100.` : 'Complete an AI Vision session this week to establish a measurable punch baseline.'} Keep the chain alive and return sharper next session.`;
    setDebriefGenerating(false);
    typeText(recap);
    speakDebrief(recap);
  };

  const typeText = (text: string) => {
    setDebriefText('');
    let i = 0;
    const speed = 25;
    const interval = setInterval(() => {
      setDebriefText(prev => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speed);
  };

  const speakDebrief = (text: string) => {
    if (!synthRef.current) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synthRef.current.getVoices();
      const chosen = voices.find(v => v.name.includes('Google') || v.lang === 'en-GB' || v.name.includes('Aria'));
      if (chosen) utterance.voice = chosen;
      utterance.rate = 0.95;
      utterance.pitch = 0.85;
      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Debrief speech synthesis failed:', e);
    }
  };

  const closeDebrief = () => {
    setShowDebrief(false);
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const handleResetEngine = () => {
    const confirm1 = confirm("⚠️⚠️ DANGER: YOU ARE ABOUT TO WIPE ALL TRAINING DATA. This includes your logs, profile, and AI roadmaps. Proceed?");
    if (confirm1) {
      const confirm2 = confirm("ARE YOU ABSOLUTELY SURE? This action is permanent and cannot be undone.");
      if (confirm2) {
        localStorage.clear();
        alert("System purged. Redirecting to initialization...");
        router.push('/');
      }
    }
  };

  const handleLogout = async () => {
    if (confirm("Log out of your account and return to home page?")) {
      try {
        await signOutFirebase();
      } catch (e) {
        console.error('Logout error:', e);
      }
      localStorage.removeItem('boxing_onboarding_done');
      localStorage.removeItem('boxing_onboarding_data');
      localStorage.removeItem('boxing_user_avatar');
      localStorage.removeItem('spar_match');
      localStorage.removeItem('sparai_profile_cache');
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const avatarUrl = profileData.avatar_url || 'https://i.pravatar.cc/150?u=viktor';
  const name = profileData.ringName || profileData.ring_name || 'FIGHTER';
  const promise = profileData.promise || profileData.promise_trigger || 'TO BE UNSTOPPABLE';

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 anim-fade-in relative pb-16">
      {/* Telemetry Display */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-primary font-bold z-10 pointer-events-none select-none">
        <span className="opacity-80 uppercase">MODULE: IDENTITY & SECURITY</span>
        <span className="opacity-40 uppercase">VAULT_LOCKED</span>
      </div>

      {/* Page Header */}
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div 
            onClick={() => openEdit('avatar_url', 'Avatar Image URL')}
            className="w-14 h-14 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(226,255,59,0.3)] overflow-hidden bg-black/40 relative group cursor-pointer"
          >
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover group-hover:opacity-40 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black text-white/50 tracking-wider uppercase mb-0.5">
              ATHLETE PROFILE
            </div>
            <h1 className="text-xl font-black italic uppercase leading-none text-white tracking-wide">
              {name}&apos;s Vault
            </h1>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="px-4 h-10 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider"
        >
          LOGOUT
        </button>
      </header>

      {/* Profile Details Block */}
      <GlassCard className="p-6 border-white/5 bg-black/40 flex flex-col gap-4">
        {/* Ring Name Section */}
        <div className="flex justify-between items-end border-b border-white/5 pb-4">
          <div>
            <div className="text-[8px] font-black text-primary tracking-[2px] uppercase mb-1.5 flex items-center gap-1">
              IDENTITY 
              <Edit2 
                className="w-2.5 h-2.5 cursor-pointer text-white/40 hover:text-white" 
                onClick={() => openEdit('ringName', 'Fighter Name')}
              />
            </div>
            <h2 className="text-xl font-black italic text-white uppercase leading-none">
              &ldquo;{name}&rdquo;
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[7px] font-black text-white/30 tracking-wider uppercase block">
              PERSONA
            </span>
            <span className="text-xs font-black text-white uppercase">
              {profileData.persona || 'Unknown'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Fighter's Promise */}
          <div className="flex flex-col gap-1.5">
            <div className="text-[8px] font-black text-white/30 tracking-[1.5px] uppercase flex items-center gap-1">
              THE FIGHTER&apos;S PROMISE
              <Edit2 
                className="w-2.5 h-2.5 cursor-pointer text-white/40 hover:text-white" 
                onClick={() => openEdit('promise', 'Fighter Promise')}
              />
            </div>
            <p className="text-xs font-bold text-primary italic leading-relaxed uppercase">
              &ldquo;{promise}&rdquo;
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3.5 border-t border-white/5 pt-4">
            <div>
              <span className="text-[7px] font-black text-white/30 tracking-wider flex items-center gap-1 uppercase">
                AGE
                <Edit2 
                  className="w-2.5 h-2.5 cursor-pointer text-white/40 hover:text-white" 
                  onClick={() => openEdit('age', 'Fighter Age')}
                />
              </span>
              <span className="text-xs font-black text-white uppercase mt-0.5 block">
                {profileData.age ? `${profileData.age} YRS` : '25 YRS'}
              </span>
            </div>
            <div>
              <span className="text-[7px] font-black text-white/30 tracking-wider flex items-center gap-1 uppercase">
                PROFESSION
                <Edit2 
                  className="w-2.5 h-2.5 cursor-pointer text-white/40 hover:text-white" 
                  onClick={() => openEdit('profession', 'Fighter Profession')}
                />
              </span>
              <span className="text-xs font-black text-white uppercase mt-0.5 block truncate">
                {profileData.profession || 'FIGHTER'}
              </span>
            </div>
            <div>
              <span className="text-[7px] font-black text-white/30 tracking-wider block uppercase">
                PHONE
              </span>
              <span className="text-xs font-black text-white uppercase mt-0.5 block">
                {profileData.phone_number || 'Guest Mode'}
              </span>
            </div>
            <div>
              <span className="text-[7px] font-black text-white/30 tracking-wider block uppercase">
                BIOMETRICS
              </span>
              <span className="text-xs font-black text-white uppercase mt-0.5 block">
                {profileData.height ? `${profileData.height}cm / ${profileData.weight}kg` : '175cm / 75kg'}
              </span>
            </div>
          </div>

          {/* Active Goals badges */}
          {profileData.goals && profileData.goals.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
              <span className="text-[7px] font-black text-white/30 tracking-wider uppercase">
                ACTIVE GOALS
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profileData.goals.map((g, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1 bg-white/5 border border-white/10 text-white font-mono text-[8px] font-black uppercase rounded-full"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* PREMIUM FEATURES */}
      <div className="flex flex-col gap-3.5">
        <span className="text-[9px] font-black tracking-[3px] text-white/30 uppercase pl-2.5">
          PREMIUM FEATURES
        </span>

        <GlassCard
          className={`p-4 border-white/5 bg-black/40 flex items-center justify-between ${!subscription.active ? 'cursor-pointer hover:border-primary/30' : ''}`}
          onClick={!subscription.active ? () => router.push('/subscription') : undefined}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white leading-none">
                {subscription.active ? subscription.planName : 'NO ACTIVE PLAN'}
              </h4>
              <span className="text-[8px] font-black text-primary uppercase block mt-1">
                {subscription.active && subscription.expiresAt
                  ? `EXPIRES ${new Date(subscription.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : 'BUY A PLAN TO UNLOCK PREMIUM FEATURES'}
              </span>
            </div>
          </div>
          {!subscription.active && <ChevronRight className="w-4 h-4 text-primary" />}
        </GlassCard>

        {/* Weekly AI Recap Button */}
        <div 
          onClick={triggerWeeklyDebrief}
          className="p-4 rounded-3xl border border-primary/30 bg-primary/5 hover:border-primary/50 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white leading-none">
                WEEKLY AI RECAP
              </h4>
              <span className="text-[8px] font-black text-primary uppercase block mt-1">
                GENERATE PROGRESS BRIEFING
              </span>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        </div>
      </div>

      {/* APP SETTINGS */}
      <div className="flex flex-col gap-3.5">
        <span className="text-[9px] font-black tracking-[3px] text-white/30 uppercase pl-2.5">
          APP SETTINGS
        </span>

        {/* Notifications Toggle */}
        <div className="glass-card p-4 rounded-3xl border border-white/5 bg-black/40 flex justify-between items-center select-none">
          <div className="flex items-center gap-4">
            <Bell className="w-4 h-4 text-white/40" />
            <span className="text-xs font-black uppercase text-white">
              NOTIFICATIONS
            </span>
          </div>
          <button 
            onClick={() => saveSettings(!notifications, stealth)}
            className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 ${
              notifications ? 'bg-primary' : 'bg-white/10'
            }`}
          >
            <div 
              className={`w-5 h-5 rounded-full bg-black transition-transform duration-300 ${
                notifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Stealth Mode Toggle */}
        <div className="glass-card p-4 rounded-3xl border border-white/5 bg-black/40 flex justify-between items-center select-none">
          <div className="flex items-center gap-4">
            <EyeOff className="w-4 h-4 text-white/40" />
            <span className="text-xs font-black uppercase text-white">
              STEALTH MODE
            </span>
          </div>
          <button 
            onClick={() => saveSettings(notifications, !stealth)}
            className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 ${
              stealth ? 'bg-primary' : 'bg-white/10'
            }`}
          >
            <div 
              className={`w-5 h-5 rounded-full bg-black transition-transform duration-300 ${
                stealth ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {!liveProfile?.email && (
            <a href="/account/link-email" className="glass-card p-4 rounded-3xl border border-primary/20 bg-black/40 flex justify-between items-center hover:border-primary/40">
              <div className="flex items-center gap-4">
                <Mail className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase text-white">ADD & VERIFY EMAIL</span>
                  <span className="text-[10px] font-semibold text-white/40">Recommended — secures your account with a password too</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </a>
          )}
          <a href="/legal/terms" className="glass-card p-4 rounded-3xl border border-white/5 bg-black/40 flex justify-between items-center hover:border-white/10">
            <div className="flex items-center gap-4">
              <FileText className="w-4 h-4 text-white/40" />
              <span className="text-xs font-black uppercase text-white">TERMS OF SERVICE</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </a>
          <a href="/legal/privacy" className="glass-card p-4 rounded-3xl border border-white/5 bg-black/40 flex justify-between items-center hover:border-white/10">
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-4 h-4 text-white/40" />
              <span className="text-xs font-black uppercase text-white">PRIVACY POLICY</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </a>
          <a href="/legal/security" className="glass-card p-4 rounded-3xl border border-white/5 bg-black/40 flex justify-between items-center hover:border-white/10">
            <div className="flex items-center gap-4">
              <LockKeyhole className="w-4 h-4 text-white/40" />
              <span className="text-xs font-black uppercase text-white">SECURITY</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </a>
          <a href="/legal/refund" className="glass-card p-4 rounded-3xl border border-white/5 bg-black/40 flex justify-between items-center hover:border-white/10">
            <div className="flex items-center gap-4">
              <FileText className="w-4 h-4 text-white/40" />
              <span className="text-xs font-black uppercase text-white">REFUND POLICY</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </a>
          <a href="/legal/contact" className="glass-card p-4 rounded-3xl border border-white/5 bg-black/40 flex justify-between items-center hover:border-white/10">
            <div className="flex items-center gap-4">
              <FileText className="w-4 h-4 text-white/40" />
              <span className="text-xs font-black uppercase text-white">CONTACT</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </a>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="flex flex-col gap-3.5">
        <span className="text-[9px] font-black tracking-[3px] text-red-500/70 uppercase pl-2.5">
          ACCOUNT ACTIONS
        </span>

        {/* LOGOUT BUTTON */}
        <div 
          onClick={handleLogout}
          className="p-4 sm:p-5 rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white leading-none">
                LOG OUT OF ACCOUNT
              </h4>
              <span className="text-[8px] font-black text-white/40 uppercase block mt-1">
                SIGN OUT & RETURN TO HOME PAGE
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40" />
        </div>

        {/* RESET ENGINE */}
        <div 
          onClick={handleResetEngine}
          className="p-4 sm:p-5 rounded-3xl border border-red-500/20 bg-red-500/[0.03] hover:bg-red-500/[0.06] cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-red-500 leading-none">
                RESET ENGINE
              </h4>
              <span className="text-[8px] font-black text-white/40 uppercase block mt-1">
                WIPE ALL NEURAL & LOG DATA
              </span>
            </div>
          </div>
          <AlertTriangle className="w-4 h-4 text-red-500/50 animate-pulse" />
        </div>
      </div>

      {/* EDIT MODAL OVERLAY */}
      <AnimatePresence>
        {editField !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-center"
          >
            <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 text-left shadow-2xl">
              <h3 className="text-sm font-black uppercase text-white tracking-widest leading-none mb-1">
                EDIT {editField === 'ringName' ? 'RING NAME' : editField === 'promise' ? 'COMBAT PROMISE' : editField === 'age' ? 'AGE' : editField === 'profession' ? 'PROFESSION' : 'AVATAR IMAGE URL'}
              </h3>
              
              {editField === 'promise' ? (
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-primary outline-none focus:border-primary/50 italic uppercase leading-relaxed resize-none"
                  rows={3}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-xs font-bold text-white outline-none focus:border-primary/50"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
              )}

              <div className="flex gap-3.5 mt-2">
                <button
                  onClick={handleEditSubmit}
                  className="flex-1 h-12 bg-primary text-black font-black uppercase tracking-wider text-[10px] rounded-2xl flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(226,255,59,0.25)]"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> SAVE
                </button>
                <button
                  onClick={() => setEditField(null)}
                  className="px-4 h-12 border border-white/10 text-white/60 hover:text-white font-black uppercase tracking-wider text-[10px] rounded-2xl flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WEEKLY DEBRIEF OVERLAY */}
      <AnimatePresence>
        {showDebrief && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="scanning-line absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-45 pointer-events-none z-30 animate-pulse" />
            
            <div className="w-full max-w-sm flex flex-col gap-6">
              <div className="text-left mb-2">
                <span className="text-[10px] font-black text-primary tracking-[3px] uppercase block mb-1">
                  STRATEGIC ANALYSIS
                </span>
                <h2 className="text-3xl font-black italic uppercase text-white leading-none">
                  {name}
                </h2>
              </div>

              {/* Metrics cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl py-4 text-center">
                  <div className="text-xl font-black text-white italic">
                    {debriefDays}
                  </div>
                  <span className="text-[7px] font-black text-white/40 uppercase tracking-widest block mt-0.5">
                    Days Active
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl py-4 text-center">
                  <div className="text-xl font-black text-white italic">
                    {debriefDrills}
                  </div>
                  <span className="text-[7px] font-black text-white/40 uppercase tracking-widest block mt-0.5">
                    Drills Extracted
                  </span>
                </div>
              </div>

              {/* Debrief text box */}
              <GlassCard className="p-6 border-white/10 bg-black/60 min-h-[140px] text-left relative overflow-hidden flex flex-col justify-center">
                <p className="text-xs font-semibold text-white/80 leading-relaxed uppercase font-mono tracking-wide italic whitespace-pre-wrap">
                  {debriefText}
                </p>
                {debriefGenerating && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </GlassCard>

              {/* Actions */}
              <NeonButton onClick={closeDebrief} className="w-full h-14 mt-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
                ACKNOWLEDGE <ChevronRight className="w-4 h-4 stroke-[3]" />
              </NeonButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
