'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function HomeGate() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const isGuest = localStorage.getItem('boxing_guest_mode') === 'true';
    const isOnboardingComplete = () => {
      if (localStorage.getItem('boxing_onboarding_done') === 'true') return true;
      try {
        const data = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
        return !!data.onboarding_completed;
      } catch (e) {
        return false;
      }
    };

    if (session || isGuest) {
      if (isOnboardingComplete()) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    } else {
      router.replace('/login');
    }
  }, [session, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Initialising...</p>
    </div>
  );
}
