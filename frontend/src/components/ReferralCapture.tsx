'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check query params: ?ref=CODE or ?referral=CODE
    const refCode = searchParams?.get('ref') || searchParams?.get('referral');

    if (refCode && typeof refCode === 'string' && refCode.trim().length >= 3) {
      const cleanCode = refCode.trim().toUpperCase();
      try {
        localStorage.setItem('sparai_pending_referral', cleanCode);
        // Also set a backup cookie if needed
        document.cookie = `sparai_pending_referral=${cleanCode}; path=/; max-age=2592000; SameSite=Lax`;
      } catch (err) {
        console.warn('Could not save pending referral code to localStorage:', err);
      }
    }
  }, [searchParams]);

  return null;
}

export default ReferralCapture;