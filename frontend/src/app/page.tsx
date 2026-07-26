'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';

export default function HomeGate() {
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseUser();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Onboarding (ending in phone verification) is now the sole entry
    // gate — there's no separate /login page anymore.
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

    // The onboarding-complete flag alone isn't proof of an active session
    // — it intentionally survives logout. Only send someone straight to
    // the dashboard if they're both onboarded AND actually signed in.
    if (isOnboardingComplete() && user) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
    setReady(true);
  }, [router, user, authLoading]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Initialising...</p>
    </div>
  );
}
