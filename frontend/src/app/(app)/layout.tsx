'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

    // If not authenticated and not in guest mode, force login
    if (!session && !isGuest) {
      router.replace('/login');
      return;
    }

    // If onboarding is not completed, force onboarding
    if (!isOnboardingComplete()) {
      router.replace('/onboarding');
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-[10px] text-text-muted uppercase tracking-[3px]">Loading System...</p>
      </div>
    );
  }

  // Fallback check while redirecting
  const isGuest = typeof window !== 'undefined' && localStorage.getItem('boxing_guest_mode') === 'true';
  if (!session && !isGuest) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
