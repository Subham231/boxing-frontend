import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark text-white p-6">
      <div className="text-center">
        <h1 className="text-7xl font-black tracking-tighter mb-2">404</h1>
        <p className="text-text-muted text-sm mb-8">This page doesn&apos;t exist.</p>
        <Link
          href="/dashboard"
          className="btn-primary inline-block px-8 py-3 text-xs uppercase font-black tracking-wider"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
