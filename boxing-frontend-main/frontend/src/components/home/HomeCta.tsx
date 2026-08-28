'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';

// This never redirects the browser on its own — it only decides which
// link the button points to, so the home page content is always visible.
export default function HomeCta() {
  const { user, loading } = useFirebaseUser();
  const [destination, setDestination] = useState<'/onboarding' | '/dashboard'>('/onboarding');
  const [label, setLabel] = useState('Get Into My App');

  useEffect(() => {
    if (loading) return;

    const isOnboardingComplete = () => {
      try {
        if (localStorage.getItem('boxing_onboarding_done') === 'true') return true;
        const data = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
        return !!data.onboarding_completed;
      } catch {
        return false;
      }
    };

    if (user && isOnboardingComplete()) {
      setDestination('/dashboard');
      setLabel('Get Into My App');
    } else {
      setDestination('/onboarding');
      setLabel('Get Into My App');
    }
  }, [user, loading]);

  return (
    <Link
      href={destination}
      className="btn-primary w-full sm:w-auto h-14 px-8 flex items-center justify-center gap-2 text-sm shadow-[0_0_28px_rgba(226,255,59,0.55)]"
    >
      {label} <ChevronRight size={18} />
    </Link>
  );
}