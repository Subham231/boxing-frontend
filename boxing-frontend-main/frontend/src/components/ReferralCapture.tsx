'use client';

import { useEffect } from 'react';

export const PENDING_REFERRAL_KEY = 'sparai_pending_referral';

export function ReferralCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref') || urlParams.get('referral');

      if (ref && typeof ref === 'string') {
        const cleanRef = ref.trim().toUpperCase();
        if (cleanRef.length >= 4 && cleanRef.length <= 16) {
          localStorage.setItem(PENDING_REFERRAL_KEY, cleanRef);
          console.log('[SparAI Referral] Captured pending referral code:', cleanRef);
        }
      }
    } catch (err) {
      console.warn('[SparAI Referral] Error capturing referral param:', err);
    }
  }, []);

  return null;
}
