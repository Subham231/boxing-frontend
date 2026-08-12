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

      // Subscription & Single-Device Session gate — checked on every protected page load.
      if (supabase) {
        const { data: profile } = await supabase
          .from('reflex_profiles')
          .select('subscription_until, plan_expires_at, current_period_end, subscription_status, plan, current_session_token')
          .eq('uid', user.uid)
          .maybeSingle();

        if (cancelled) return;

        // 1. Single-Device Session Check: If another device logged in with this phone/account,
        // profile.current_session_token will have been updated to a new token value.
        const localSessionToken = localStorage.getItem('sparai_session_token');
        if (profile?.current_session_token && localSessionToken && profile.current_session_token !== localSessionToken) {
          // Logged in on another device! Clear session and force signout
          localStorage.removeItem('sparai_session_token');
          window.location.replace('/onboarding');
          return;
        }

        // 2. Subscription Check
        if (!isExemptFromSubscriptionGate(pathname)) {
          if (!isSubscriptionActive(profile)) {
            window.location.replace('/subscription');
            return;
          }
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
