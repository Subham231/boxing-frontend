'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseUser();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Wait for Firebase to actually resolve the session before deciding —
    // on a fresh page load `user` starts null for a moment even for a
    // logged-in person, and bouncing on that would kick everyone out.
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

    // Onboarding-complete alone isn't enough — that flag intentionally
    // survives logout (so a later login can restore local data instantly).
    // The actual gate is: is there a real, active Firebase session?
    if (!isOnboardingComplete() || !user) {
      if (typeof window !== 'undefined') {
        window.location.replace('/onboarding');
      } else {
        router.replace('/onboarding');
      }
      setAllowed(false);
    } else {
      setAllowed(true);
    }
    setChecked(true);
  }, [router, user, authLoading]);

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
