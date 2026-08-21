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

  // Synchronously check local cache for immediate zero-lag decision
  const [allowed, setAllowed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (isExempt) return true;
    const cached = localStorage.getItem('sparai_sub_active');
    return cached === 'true';
  });

  const [checked, setChecked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (isExempt) return true;
    const cached = localStorage.getItem('sparai_sub_active');
    return cached !== null;
  });

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
      window.location.replace('/onboarding');
      return;
    }

    // If exempt and already checked, allow immediate navigation
    if (isExempt) {
      setAllowed(true);
      setChecked(true);
    } else {
      // Check cached active state immediately before async network roundtrip
      const cached = localStorage.getItem('sparai_sub_active');
      if (cached === 'false') {
        setAllowed(false);
        setChecked(true);
        router.replace('/subscription');
        return;
      }
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
          setChecked(true);
          window.location.replace('/subscription');
          return;
        }

        setAllowed(true);
        setChecked(true);
      } catch {
        if (!cancelled && isExempt) {
          setAllowed(true);
          setChecked(true);
        }
      }
    };

    verifySubscription();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, pathname, isExempt, router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Authenticating Protocol...</p>
      </div>
    );
  }

  if (!allowed && !isExempt) return null;

  return <AppShell>{children}</AppShell>;
}

