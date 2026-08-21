'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { isExemptFromSubscriptionGate } from '@/lib/subscription';

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const isOnboardingComplete = () => {
      if (localStorage.getItem('boxing_onboarding_done') === 'true') return true;
      try {
        const data = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
        return !!data.onboarding_completed;
      } catch {
        return false;
      }
    };

    if (!isOnboardingComplete() || !user) {
      if (!isExempt) {
        window.location.replace('/onboarding');
      }
      return;
    }

    // Exempt routes don't require active plan check
    if (isExempt) {
      setAllowed(true);
      return;
    }

    // Fast local cache check for instant navigation
    const cached = localStorage.getItem('sparai_sub_active');
    if (cached === 'false') {
      setAllowed(false);
      router.replace('/subscription');
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
          window.location.replace('/onboarding');
          return;
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
  }, [user, authLoading, pathname, isExempt, router]);

  // If on non-exempt route and not allowed, don't show content
  if (!isExempt && !allowed) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}

