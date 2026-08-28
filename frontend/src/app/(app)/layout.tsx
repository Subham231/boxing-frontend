'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { isExemptFromSubscriptionGate } from '@/lib/subscription';
import { ensureUserProfile } from '@/lib/firebase-auth';
import { cacheProfileLocally } from '@/lib/profile-client';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseUser();

  const isExempt = isExemptFromSubscriptionGate(pathname);

  // If on an exempt route (/settings, /spar, /subscription, /checkout), never block or show loader
  const [mounted, setMounted] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.replace('/login');
      return;
    }

    let cancelled = false;

    const checkOnboarding = async () => {
      // Server truth, not localStorage: a fresh login (new device/browser,
      // or after clearing storage) previously had no local onboarding flag
      // and got bounced into /onboarding even for a fully set-up account.
      // ensureUserProfile is a no-op for an existing account — it just
      // fetches the real Supabase profile.
      let isOnboardingComplete = false;
      try {
        const { profile } = await ensureUserProfile(user);
        if (cancelled) return;
        const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>;
        isOnboardingComplete = !!onboardingData.onboarding_completed;
        cacheProfileLocally(profile);
        if (isOnboardingComplete) {
          localStorage.setItem('boxing_onboarding_done', 'true');
        }
      } catch {
        // Fall back to a local flag only if we truly couldn't reach the
        // server (offline, etc.) — never treat a fetch failure as "must
        // redo onboarding".
        if (localStorage.getItem('boxing_onboarding_done') === 'true') {
          isOnboardingComplete = true;
        } else {
          try {
            const data = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
            isOnboardingComplete = !!data.onboarding_completed;
          } catch {
            isOnboardingComplete = false;
          }
        }
      }

      if (cancelled) return;

      if (!isOnboardingComplete) {
        if (!isExempt) {
          window.location.replace('/onboarding');
        }
        return;
      }

      setOnboardingChecked(true);
    };

    checkOnboarding();
    return () => { cancelled = true; };
  }, [user, authLoading, isExempt]);

  useEffect(() => {
    if (authLoading || !user || !onboardingChecked) return;

    // Exempt routes don't require active plan check
    if (isExempt) {
      setAllowed(true);
      return;
    }

    let cancelled = false;

    const verifySubscription = async () => {
      try {
        const token = await user.getIdToken();
        const localSessionToken = localStorage.getItem('sparai_session_token') || '';
        const res = await fetch('/api/subscription/status', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-session-token': localSessionToken,
          },
        });
        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (data.sessionValid === false) {
          localStorage.removeItem('sparai_session_token');
          const retry = await fetch('/api/subscription/status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const retryData = await retry.json().catch(() => ({}));
          if (cancelled) return;
          if (!retry.ok) {
            setAllowed(false);
            return;
          }
          Object.assign(data, retryData);
        }

        const isActive = data.active === true;
        localStorage.setItem('sparai_sub_active', isActive ? 'true' : 'false');
        if (data.expiresAt) {
          localStorage.setItem('sparai_sub_expires', String(data.expiresAt));
        }

        if (!isExempt && !isActive) {
          setAllowed(false);
          window.location.replace('/subscription');
          return;
        }

        setAllowed(true);
      } catch {
        if (!cancelled && isExempt) {
          setAllowed(true);
        }
      }
    };

    verifySubscription();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, pathname, isExempt, onboardingChecked, router]);

  if (authLoading || !user || !onboardingChecked || (!isExempt && !allowed)) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

