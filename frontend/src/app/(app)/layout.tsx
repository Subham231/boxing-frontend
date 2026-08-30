'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { isExemptFromSubscriptionGate } from '@/lib/subscription';
import { ensureUserProfile, saveProfileDetails } from '@/lib/firebase-auth';
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
      let isOnboardingComplete = false;
      try {
        const { profile } = await ensureUserProfile(user);
        if (cancelled) return;
        const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>;
        isOnboardingComplete =
          !!onboardingData.onboarding_completed ||
          !!profile.uid ||
          !!profile.phone ||
          localStorage.getItem('boxing_onboarding_done') === 'true';

        cacheProfileLocally(profile);
        if (isOnboardingComplete) {
          localStorage.setItem('boxing_onboarding_done', 'true');
          if (!onboardingData.onboarding_completed) {
            saveProfileDetails(user, {
              onboardingData: { ...onboardingData, onboarding_completed: true },
            }).catch(() => {});
          }
        }
      } catch {
        // Any existing user with phone/uid is considered onboarded if network fails
        if (user.uid || user.phoneNumber || localStorage.getItem('boxing_onboarding_done') === 'true') {
          isOnboardingComplete = true;
          localStorage.setItem('boxing_onboarding_done', 'true');
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

      if (!isOnboardingComplete && !isExempt) {
        window.location.replace('/onboarding');
        return;
      }

      setOnboardingChecked(true);
    };

    checkOnboarding();
    return () => { cancelled = true; };
  }, [user, authLoading, isExempt]);

  useEffect(() => {
    if (authLoading || !user || !onboardingChecked) return;

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
          if (retry.ok) {
            Object.assign(data, retryData);
          }
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
        // Retain access if network hiccup occurs while authenticated
        if (!cancelled) {
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

