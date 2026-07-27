'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { supabase } from '@/lib/supabase';
import { isSubscriptionActive, isExemptFromSubscriptionGate } from '@/lib/subscription';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
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

    let cancelled = false;

    const run = async () => {
      // Onboarding-complete alone isn't enough — that flag intentionally
      // survives logout (so a later login can restore local data instantly).
      // The actual gate is: is there a real, active Firebase session?
      if (!isOnboardingComplete() || !user) {
        window.location.replace('/onboarding');
        return;
      }

      // Subscription gate — checked on every protected page load, not just
      // once after signup, so an expiry that happens mid-session (or on a
      // totally different day) is caught the next time the app is opened.
      if (!isExemptFromSubscriptionGate(pathname) && supabase) {
        const { data: profile } = await supabase
          .from('reflex_profiles')
          .select('subscription_until, plan_expires_at')
          .eq('uid', user.uid)
          .maybeSingle();

        if (cancelled) return;

        if (!isSubscriptionActive(profile)) {
          window.location.replace('/subscription');
          return;
        }
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
  }, [router, user, authLoading, pathname]);

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
