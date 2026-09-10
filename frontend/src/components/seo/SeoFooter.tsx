import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowLeft, Shield, Zap, Flame, Camera } from 'lucide-react';

export function SeoFooter() {
  return (
    <footer className="w-full bg-black/90 border-t border-white/10 text-white/70">
      {/* Pre-footer Call To Action Banner */}
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-primary/10 via-transparent to-transparent py-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 opacity-30 pointer-events-none bg-[radial-gradient(#e2ff3b_1px,transparent_1px)] [background-size:24px_24px]" />
        
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest mb-4">
            <Zap className="w-3.5 h-3.5" /> Next-Gen AI Combat Coaching
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            Elevate Your Boxing Technique With <span className="text-primary">SparAI</span>
          </h2>
          
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto mb-8">
            Experience real-time computer vision punch velocity tracking, guard analysis, reflex drills, and tailored roadmaps right from your camera.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-black font-extrabold uppercase tracking-wider text-sm hover:bg-primary/90 transition-all shadow-[0_0_35px_rgba(226,255,59,0.4)] hover:shadow-[0_0_50px_rgba(226,255,59,0.7)] active:scale-95"
            >
              <span>Launch SparAI Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/15 text-sm font-semibold transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-primary" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-primary/40 shadow-[0_0_15px_rgba(226,255,59,0.25)]">
                <Image
                  src="/logo.jpg"
                  alt="SparAI"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-xl font-extrabold tracking-wider text-white font-mono">
                SPAR<span className="text-primary">AI</span>
              </span>
            </Link>
            
            <p className="text-sm text-white/50 max-w-sm leading-relaxed">
              The intelligent boxing & combat AI platform. Precision vision analytics, punch velocity meters, custom shadow boxing routines, and interactive AI corner coaching.
            </p>

            <div className="flex items-center gap-3 pt-2 text-xs font-mono text-primary/80">
              <Shield className="w-4 h-4 text-primary" /> No sensors required. Just your device camera.
            </div>
          </div>

          {/* Features Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 font-mono">
              AI Features
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/features/ai-video-analysis" className="hover:text-primary transition-colors flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary" /> AI Video Analysis
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-primary transition-colors">
                  All Platform Features
                </Link>
              </li>
              <li>
                <Link href="/reflex" className="hover:text-primary transition-colors">
                  Interactive Reflex Drill
                </Link>
              </li>
              <li>
                <Link href="/planner" className="hover:text-primary transition-colors">
                  Smart Workout Planner
                </Link>
              </li>
              <li>
                <Link href="/guru" className="hover:text-primary transition-colors">
                  Spar Guru AI Coach
                </Link>
              </li>
            </ul>
          </div>

          {/* Training Guides */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 font-mono">
              Guides & Workouts
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/blog/boxing-for-beginners" className="hover:text-primary transition-colors">
                  Boxing For Beginners
                </Link>
              </li>
              <li>
                <Link href="/blog/boxing-training-at-home" className="hover:text-primary transition-colors">
                  Boxing Training at Home
                </Link>
              </li>
              <li>
                <Link href="/blog/shadow-boxing-workout" className="hover:text-primary transition-colors">
                  Shadow Boxing Workout
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-primary transition-colors flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-primary" /> All Guides & Articles
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 font-mono">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  SparAI Homepage
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  App Sign In / Register
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="hover:text-primary transition-colors">
                  Fighter Setup & Assessment
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="hover:text-primary transition-colors">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} SparAI. All rights reserved. Built for champions.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>•</span>
            <Link href="/features" className="hover:text-primary transition-colors">Features</Link>
            <span>•</span>
            <Link href="/blog" className="hover:text-primary transition-colors">Guides</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-primary transition-colors">Sign In</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
