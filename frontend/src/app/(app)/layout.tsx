'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
  const { user, loading: authLoading } = useFirebaseUser();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

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

    let cancelled = false;

    const run = async () => {
      if (!isOnboardingComplete() || !user) {
        window.location.replace('/onboarding');
        return;
      }

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

      if (!isExemptFromSubscriptionGate(pathname) && data.active !== true) {
        window.location.replace('/subscription');
        return;
      }

      if (!cancelled) {
        setAllowed(true);
        setChecked(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, pathname]);

  if (!checked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading System...</p>
      </div>
    );
  }

  if (!allowed) return null;

  return <AppShell>{children}</AppShell>;
}
