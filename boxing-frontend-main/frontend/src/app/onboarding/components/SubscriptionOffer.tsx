'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Ticket, Copy, Check } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { firebaseAuth } from '@/lib/firebase';
import { applyReferralCode } from '@/lib/firebase-auth';
import type { UserProfile } from '@/lib/firebase-auth';
import { getUserProfile } from '@/lib/firebase-reflex';
import { PENDING_REFERRAL_KEY } from '@/components/ReferralCapture';

const SubscriptionOffer: React.FC = () => {
  const router = useRouter();
  const { prevStep } = useOnboarding();
  const [referralInput, setReferralInput] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged((user) => {
      setUid(user?.uid ?? null);
      if (!user) setProfileLoading(false);
    });
    return () => unsub();
  }, []);

  // Pre-fill referral code if saved from collaborator link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const pending = localStorage.getItem(PENDING_REFERRAL_KEY);
      if (pending && typeof pending === 'string') {
        setReferralInput(pending.trim().toUpperCase());
      }
    } catch (err) {
      console.warn('[SubscriptionOffer] Error reading pending referral:', err);
    }
  }, []);

  // Pulls the profile (referral_code, referral_count, referral_bonus_5_claimed,
  // plan/plan_expires_at) straight from Supabase via /api/reflex/me.
  useEffect(() => {
    if (!uid) return;
    let mounted = true;
    setProfileLoading(true);
    getUserProfile(uid).then((data) => {
      if (mounted) {
        setProfile(data);
        setProfileLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [uid]);

  const handleContinue = () => {
    router.push('/subscription');
  };

  const handleApplyReferral = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      setReferralError('Sign in first to apply a referral code.');
      return;
    }
    const code = referralInput.trim().toUpperCase();
    if (!code) {
      setReferralError('Enter a referral code.');
      return;
    }
    setReferralError(null);
    setReferralLoading(true);
    try {
      // Writes through /api/reflex/apply-referral, which validates the code
      // against Supabase server-side.
      await applyReferralCode(user, code);
      setReferralSuccess(true);

      // Clean up saved referral from localStorage
      try {
        localStorage.removeItem(PENDING_REFERRAL_KEY);
      } catch {}

      // Refresh so the progress bar / claimed state reflect the new referral.
      const fresh = await getUserProfile(user.uid);
      if (fresh) setProfile(fresh);
    } catch (e) {
      setReferralError(e instanceof Error ? e.message : 'Could not apply referral code.');
    } finally {
      setReferralLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // One-time reward: exactly 5 referrals, granted once ever.
  const progress = Math.min(profile?.referral_count ?? 0, 5);
  const rewardClaimed = !!profile?.referral_bonus_5_claimed;

  return (
    <div className="flex h-full min-h-0 flex-col justify-between gap-3 py-2 pb-4">
      <header className="text-left mb-1">
        <StepBadge />
        <h1 className="mt-2 text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Choose your <span className="text-primary">edge</span>
        </h1>
        <p className="mt-2 text-white/50 text-sm leading-relaxed font-semibold">
          Use your referral code to unlock the first 30 days, or pick a plan and set up your training stack.
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {/* Benefit + referral progress, all in one card */}
        <div className="relative overflow-hidden rounded-[22px] border border-primary/40 bg-gradient-to-br from-primary/20 via-black/80 to-black/95 p-3 shadow-[0_0_25px_rgba(226,255,59,0.14)] shrink-0">
          <div className="absolute inset-x-8 top-0 h-16 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-primary">Benefit</span>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-black text-white leading-none">30</span>
                <span className="pb-1 text-sm font-black uppercase text-white/70">Days</span>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-center shrink-0">
              <Gift className="w-6 h-6 text-primary mx-auto" />
              <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.18em] text-primary">Free</span>
            </div>
          </div>

          <p className="relative mt-2 text-[11px] font-semibold text-white/75 leading-relaxed">
            Your referral code unlocks the first 30 days of full access. After the trial, your plan continues at the standard rate unless you change it.
          </p>

          {uid && (
            <div className="relative mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase text-white/50">
                <span className="flex items-center gap-1 truncate">
                  <Gift className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">
                    {rewardClaimed ? 'Reward claimed' : 'Refer 5 friends, get 30 days free'}
                  </span>
                </span>
                <span className="shrink-0 text-primary">{profileLoading ? '...' : `${progress} / 5`}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: profileLoading ? '0%' : `${(progress / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Enter code + your code, side by side */}
        {uid ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-3 flex flex-col">
              <div className="mb-2 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-primary truncate">
                  Enter code
                </span>
              </div>

              {referralSuccess ? (
                <div className="flex-1 flex items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-2 py-3 text-center text-[9px] font-black uppercase tracking-[0.06em] text-primary leading-snug">
                  Applied ✓ trial active
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(e) => {
                      setReferralInput(e.target.value.toUpperCase());
                      setReferralError(null);
                    }}
                    placeholder="Friend's code"
                    maxLength={8}
                    className="w-full min-w-0 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-primary placeholder:text-white/25 tracking-[0.12em] uppercase"
                  />
                  {referralError && (
                    <p className="mt-1.5 text-[9px] font-bold text-red-400 leading-snug">{referralError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleApplyReferral}
                    disabled={referralLoading || !referralInput.trim()}
                    className="mt-2 w-full h-10 rounded-xl bg-primary text-black text-[9px] font-black uppercase tracking-[0.12em] disabled:opacity-50"
                  >
                    {referralLoading ? 'Applying...' : 'Apply'}
                  </button>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-3 flex flex-col">
              <div className="mb-2 flex items-center justify-between gap-1">
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45 truncate">
                  Your code
                </span>
                <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.1em] text-primary shrink-0">
                  Active
                </span>
              </div>
              <div className="flex-1 flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 min-h-[42px]">
                {profileLoading ? (
                  <span className="text-sm font-black text-white/30 tracking-[3px]">•••••••</span>
                ) : (
                  <span className="text-sm font-black text-white tracking-[2px] truncate">
                    {profile?.referral_code ?? '—'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  disabled={!profile?.referral_code}
                  className="text-primary shrink-0 disabled:opacity-30"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4 text-[11px] font-semibold text-white/50 text-center">
            Verify your phone first to unlock your referral code.
          </div>
        )}
      </main>

      <footer className="mt-1 flex flex-col gap-2">
        <button onClick={handleContinue} className="btn-primary w-full h-14 flex items-center justify-center gap-2">
          Get my plan
        </button>

        <div className="bg-black/80 border border-white/10 rounded-2xl py-2 px-4 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-white/50 text-[9px] font-bold uppercase tracking-widest text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <a href="/legal/terms" target="_blank" className="hover:text-primary transition-colors">Terms</a>
          <span className="text-white/20">•</span>
          <a href="/legal/privacy" target="_blank" className="hover:text-primary transition-colors">Privacy Policy</a>
          <span className="text-white/20">•</span>
          <a href="/legal/refund" target="_blank" className="hover:text-primary transition-colors">Refund Policy</a>
          <span className="text-white/20">•</span>
          <a href="/legal/contact" target="_blank" className="hover:text-primary transition-colors">Contact Us</a>
        </div>

        <button onClick={prevStep} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest py-1 mx-auto">
          Back
        </button>
      </footer>
    </div>
  );
};

export default SubscriptionOffer;
