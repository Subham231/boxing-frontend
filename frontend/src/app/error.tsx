'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08080A] text-white p-6">
      <div className="text-center max-w-md flex flex-col items-center">
        <div className="text-5xl mb-3 text-primary">⚠</div>
        <h2 className="text-xl font-black uppercase tracking-wider mb-2 text-white">Something went wrong</h2>
        <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-6">
          An unexpected error occurred. Let&apos;s get you back on track to the training protocol.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            onClick={reset}
            className="btn-primary px-6 py-3 text-xs uppercase font-black tracking-wider rounded-xl"
          >
            Try Again
          </button>
          <Link
            href="/onboarding"
            className="px-6 py-3 text-xs uppercase font-black tracking-wider rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-center flex items-center justify-center"
          >
            Go to Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
