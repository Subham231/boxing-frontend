'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { isExemptFromSubscriptionGate } from '@/lib/subscription';
import { ComingSoonGate } from '@/components/ComingSoonGate';

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
  const [launchLoading, setLaunchLoading] = useState(true);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    fetch('/api/launch-status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setLaunched(data.launched === true);
      })
      .catch(() => {
        if (!cancelled) setLaunched(false);
      })
      .finally(() => {
        if (!cancelled) setLaunchLoading(false);
      });
    return () => { cancelled = true; };
  }, [authLoading]);

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

    if (!user) {
      window.location.replace('/login');
      return;
    }

    if (!isOnboardingComplete()) {
      if (!isExempt) {
        window.location.replace('/onboarding');
      }
      return;
    }

    if (!launched) return;

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
  }, [user, authLoading, pathname, isExempt, launched, router]);

  if (authLoading || !user || launchLoading || (!isExempt && !allowed)) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!launched) return <ComingSoonGate />;

  return <AppShell>{children}</AppShell>;
}

