'use client';

import { useEffect } from 'react';

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
    <div className="min-h-screen flex items-center justify-center bg-bg-dark text-white p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠</div>
        <h2 className="text-xl font-black uppercase tracking-wider mb-2">Something went wrong</h2>
        <p className="text-text-muted text-sm leading-relaxed">
          An unexpected error occurred. This has been logged — please try again.
        </p>
        <button
          onClick={reset}
          className="btn-primary mt-6 px-8 py-3 text-xs uppercase font-black tracking-wider"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
