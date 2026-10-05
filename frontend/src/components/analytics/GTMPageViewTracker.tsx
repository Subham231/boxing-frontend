'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/gtm';

/**
 * Automatically captures client-side route transitions and sends
 * page_view events to Google Tag Manager dataLayer.
 * Since Next.js is a Single Page Application (SPA), this ensures
 * every page visit (e.g. /, /onboarding, /dashboard, etc.) is tracked.
 */
export function GTMPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    const queryString = searchParams?.toString();
    const fullUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Avoid duplicate pushes on identical route
    if (lastTrackedPath.current === fullUrl) return;
    lastTrackedPath.current = fullUrl;

    // Allow document.title to update
    const timer = setTimeout(() => {
      trackPageView(fullUrl, typeof document !== 'undefined' ? document.title : '');
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}

export default GTMPageViewTracker;
