'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Ticket, Copy, Check, Share2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import StepBadge from './StepBadge';
import { firebaseAuth } from '@/lib/firebase';
import { applyReferralCode } from '@/lib/firebase-auth';
import type { UserProfile } from '@/lib/firebase-auth';
import { getUserProfile } from '@/lib/firebase-reflex';

const REFERRAL_GOAL = 5;
const MAX_CODE_LENGTH = 12;

/** Upper-case and strip anything that can't be in a referral code. */
const cleanCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, MAX_CODE_LENGTH);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Copy text with a fallback for browsers/webviews where the async Clipboard
 * API is missing or blocked (plain-HTTP pages, some in-app browsers).
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function friendlyError(e: unknown): string {
  if (e instanceof TypeError) return 'Network problem — check your connection and try again.';
  if (e instanceof Error && e.message && e.message !== 'Request failed') return e.message;
  return 'Could not apply that code. Please try again.';
}

const SubscriptionOffer: React.FC = () => {
  const router = useRouter();
  const { prevStep } = useOnboarding();

  const [referralInput, setReferralInput] = useState('');
  const [prefilledFromLink, setPrefilledFromLink] = useState(false);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileFailed, setProfileFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged((user) => {
      setUid(user?.uid ?? null);
      setAuthReady(true);
      if (!user) setProfileLoading(false);
    });
    return () => unsub();
  }, []);

  // Pre-fill from a shared invite link (?ref=CODE, saved by ReferralCapture) so
  // the user doesn't have to type it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const pending = localStorage.getItem('sparai_pending_referral');
      const fromUrl = new URLSearchParams(window.location.search);
      const raw = pending?.trim() || fromUrl.get('ref') || fromUrl.get('referral') || '';
      const code = cleanCode(raw);
      if (code) {
        setReferralInput(code);
        setPrefilledFromLink(true);
      }
    } catch (err) {
      console.warn('Could not read pending referral code:', err);
    }
  }, []);

  // Load the profile. A brand-new account's row can lag a moment behind
  // sign-in, so one automatic retry before showing the retry button.
  useEffect(() => {
    if (!uid) return;
    let mounted = true;
    setProfileLoading(true);
    setProfileFailed(false);
    (async () => {
      let data = await getUserProfile(uid);
      if (!data && mounted) {
        await sleep(1500);
        data = await getUserProfile(uid);
      }
      if (!mounted) return;
      setProfile(data);
      setProfileFailed(!data);
      setProfileLoading(false);
      if (data?.referred_by) {
        setReferralSuccess(true);
        setReferralInput(data.referred_by);
        setPrefilledFromLink(false);
        try {
          localStorage.removeItem('sparai_pending_referral');
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [uid, reloadKey]);

  const myCode = profile?.referral_code ?? '';
  const progress = Math.min(profile?.referral_count ?? 0, REFERRAL_GOAL);
  const rewardClaimed = !!profile?.referral_bonus_5_claimed;

  const trialEndsAt = useMemo(() => {
    if (profile?.plan !== 'referral_reward' || !profile.plan_expires_at) return null;
    const end = new Date(profile.plan_expires_at);
    return end.getTime() > Date.now() ? end : null;
  }, [profile]);
  const trialLabel = trialEndsAt
    ? trialEndsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : null;

  const flashCopied = (what: 'code' | 'link') => {
    setCopied(what);
    setTimeout(() => setCopied(null), 1600);
  };

  const handleApplyReferral = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (referralLoading) return;
      const user = firebaseAuth.currentUser;
      if (!user) {
        setReferralError('Sign in first to apply a referral code.');
        return;
      }
      const code = cleanCode(referralInput);
      if (code.length < 3) {
        setReferralError('Enter your friend’s referral code (at least 3 characters).');
        return;
      }
      if (myCode && code === myCode) {
        setReferralError('That’s your own code — enter a friend’s instead.');
        return;
      }
      setReferralError(null);
      setReferralLoading(true);
      try {
        // Server validates against reflex_profiles and sparai_collaborators.
        await applyReferralCode(user, code);
        setReferralSuccess(true);
        setPrefilledFromLink(false);
        try {
          localStorage.removeItem('sparai_pending_referral');
        } catch {
          /* ignore */
        }
        const fresh = await getUserProfile(user.uid);
        if (fresh) setProfile(fresh);
      } catch (err) {
        setReferralError(friendlyError(err));
      } finally {
        setReferralLoading(false);
      }
    },
    [referralInput, referralLoading, myCode]
  );

  const handleCopyCode = async () => {
    if (!myCode) return;
    if (await copyText(myCode)) flashCopied('code');
  };

  const handleShare = async () => {
    if (!myCode) return;
    const url = `${window.location.origin}/?ref=${myCode}`;
    const text = `Train with me on Sparai — use my code ${myCode} for 30 days free.`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Sparai', text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return; // user closed the sheet
      }
    }
    if (await copyText(`${text} ${url}`)) flashCopied('link');
  };

  const handleContinue = () => {
    router.push('/subscription');
  };

  return (
    <div className="flex min-h-full flex-col justify-between gap-4 py-2 pb-20 sm:pb-24">
      <header className="text-left">
        <StepBadge />
        <h1 className="mt-2 text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-white">
          Choose your <span className="text-primary">edge</span>
        </h1>
        <p className="mt-2 text-[13px] font-semibold leading-relaxed text-white/55">
          Have a friend’s code? It unlocks your first 30 days free. No code? Pick a plan and start training.
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {/* Benefit + referral progress */}
        <section className="relative shrink-0 overflow-hidden rounded-[22px] border border-primary/40 bg-gradient-to-br from-primary/20 via-black/80 to-black/95 p-4 shadow-[0_0_25px_rgba(226,255,59,0.14)]">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-16 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Free trial</span>
              <div className="mt-1.5 flex items-end gap-2">
                <span className="text-5xl font-black leading-none text-white">30</span>
                <span className="pb-1 text-base font-black uppercase text-white/70">Days</span>
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-center">
              <Gift className="mx-auto h-7 w-7 text-primary" aria-hidden />
              <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.18em] text-primary">Free</span>
            </div>
          </div>

          <p className="relative mt-3 text-xs font-semibold leading-relaxed text-white/75">
            A referral code unlocks 30 days of full access. After the trial your plan continues at the standard rate unless you change it.
          </p>

          {uid && (
            <div className="relative mt-4 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase text-white/55">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">
                    {rewardClaimed ? 'Reward claimed' : `Refer ${REFERRAL_GOAL} friends, get 30 days free`}
                  </span>
                </span>
                <span className="shrink-0 text-primary" aria-live="polite">
                  {profileLoading ? '…' : `${progress} / ${REFERRAL_GOAL}`}
                </span>
              </div>
              <div
                className="mt-2 flex gap-1.5"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={REFERRAL_GOAL}
                aria-valuenow={profileLoading ? 0 : progress}
                aria-label="Friends referred"
              >
                {Array.from({ length: REFERRAL_GOAL }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
                      !profileLoading && i < progress ? 'bg-primary' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {!authReady ? (
          <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" aria-hidden />
        ) : uid ? (
          <>
            {/* Enter a friend's code */}
            <section className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <Ticket className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-primary">Got a friend’s code?</h2>
              </div>

              {referralSuccess ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.06em] text-primary">Code applied</p>
                    <p className="mt-0.5 text-[11px] font-semibold leading-snug text-white/70">
                      {trialLabel
                        ? `Your 30-day free trial is active until ${trialLabel}.`
                        : 'Your 30-day free trial is on its way — it can take a few seconds to show.'}
                      {referralInput ? <span className="text-white/40"> · {referralInput}</span> : null}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApplyReferral} noValidate>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referralInput}
                      onChange={(e) => {
                        setReferralInput(cleanCode(e.target.value));
                        setReferralError(null);
                        setPrefilledFromLink(false);
                      }}
                      placeholder="FRIEND’S CODE"
                      maxLength={MAX_CODE_LENGTH}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      aria-label="Friend’s referral code"
                      aria-invalid={!!referralError}
                      aria-describedby={referralError ? 'referral-error' : undefined}
                      className={`h-12 min-w-0 flex-1 rounded-xl border bg-black/40 px-3.5 text-sm font-black uppercase tracking-[0.16em] text-white outline-none placeholder:text-white/25 focus:border-primary ${
                        referralError ? 'border-red-400/60' : 'border-white/10'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={referralLoading || cleanCode(referralInput).length < 3}
                      className="h-12 shrink-0 rounded-xl bg-primary px-5 text-[11px] font-black uppercase tracking-[0.12em] text-black transition-transform active:scale-95 disabled:opacity-40"
                    >
                      {referralLoading ? 'Applying…' : 'Apply'}
                    </button>
                  </div>
                  {prefilledFromLink && !referralError && (
                    <p className="mt-2 text-[11px] font-semibold text-primary/80">
                      Filled in from your invite link — tap Apply to claim your 30 days.
                    </p>
                  )}
                  {referralError && (
                    <p id="referral-error" role="alert" className="mt-2 text-[11px] font-bold leading-snug text-red-400">
                      {referralError}
                    </p>
                  )}
                </form>
              )}
            </section>

            {/* Your own code */}
            <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-white/55">Your code</h2>
                {myCode && (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-primary">
                    Active
                  </span>
                )}
              </div>

              {profileFailed ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-3.5 py-3">
                  <span className="text-[11px] font-semibold text-white/60">Couldn’t load your code.</span>
                  <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="flex shrink-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-primary"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3.5 py-3">
                    {profileLoading ? (
                      <span className="h-5 w-28 animate-pulse rounded bg-white/10" aria-hidden />
                    ) : (
                      <span className="truncate text-lg font-black tracking-[0.2em] text-white">{myCode || '—'}</span>
                    )}
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      disabled={!myCode}
                      aria-label="Copy your referral code"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:opacity-30"
                    >
                      {copied === 'code' ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!myCode}
                    className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 text-[11px] font-black uppercase tracking-[0.12em] text-primary transition-transform active:scale-[0.98] disabled:opacity-40"
                  >
                    <Share2 className="h-4 w-4" aria-hidden />
                    {copied === 'link' ? 'Invite link copied' : 'Invite a friend'}
                  </button>
                </>
              )}
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center text-xs font-semibold leading-relaxed text-white/55">
            Sign in and verify your account to unlock your referral code. You can still continue and pick a plan.
          </div>
        )}
      </main>

      <footer className="flex flex-col gap-2.5">
        <button onClick={handleContinue} className="btn-primary flex h-14 w-full items-center justify-center gap-2">
          {referralSuccess || trialEndsAt ? 'Start my free 30 days' : 'Get my plan'}
        </button>

        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-white/10 bg-black/80 px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-white/55 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >
          <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">Terms</a>
          <span className="text-white/20" aria-hidden>•</span>
          <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">Privacy Policy</a>
          <span className="text-white/20" aria-hidden>•</span>
          <a href="/legal/refund" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">Refund Policy</a>
          <span className="text-white/20" aria-hidden>•</span>
          <a href="/legal/contact" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">Contact Us</a>
        </nav>

        <button
          onClick={prevStep}
          className="mx-auto py-1.5 text-[11px] font-black uppercase tracking-widest text-white/45 transition-colors hover:text-white"
        >
          Back
        </button>
      </footer>
    </div>
  );
};

export default SubscriptionOffer;
