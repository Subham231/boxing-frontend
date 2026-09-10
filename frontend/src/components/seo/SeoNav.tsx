import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Sparkles, ChevronRight } from 'lucide-react';

interface SeoNavProps {
  currentPageTitle?: string;
}

export function SeoNav({ currentPageTitle }: SeoNavProps) {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-bg-dark/85 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-90"
            title="SparAI - Return to Homepage"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-primary/30 shadow-[0_0_15px_rgba(226,255,59,0.2)] group-hover:border-primary/60 transition-colors">
              <Image
                src="/logo.jpg"
                alt="SparAI Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-wider text-white font-mono flex items-center gap-1.5">
                SPAR<span className="text-primary">AI</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase text-white/50 hidden sm:inline-block">
                AI Combat Intelligence
              </span>
            </div>
          </Link>

          {currentPageTitle && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-white/40 pl-4 border-l border-white/10">
              <ChevronRight className="w-3.5 h-3.5 text-white/30" />
              <span className="text-white/70 max-w-[200px] truncate">{currentPageTitle}</span>
            </div>
          )}
        </div>

        {/* Center: SEO Quick Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
          <Link
            href="/features"
            className="hover:text-primary transition-colors py-1"
          >
            Features
          </Link>
          <Link
            href="/features/ai-video-analysis"
            className="hover:text-primary transition-colors py-1 flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            AI Video Vision
          </Link>
          <Link
            href="/blog"
            className="hover:text-primary transition-colors py-1"
          >
            Guides & Workouts
          </Link>
        </nav>

        {/* Right: Actions (Back to Home + Explore SparAI CTA) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:border-white/20 active:scale-95"
            title="Back to Homepage"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Home</span>
          </Link>

          <Link
            href="/login"
            className="group relative inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl bg-primary text-black hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(226,255,59,0.35)] hover:shadow-[0_0_30px_rgba(226,255,59,0.6)] active:scale-95 whitespace-nowrap"
          >
            <span>Explore More</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
