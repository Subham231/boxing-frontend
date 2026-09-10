import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  Flame, 
  Clock, 
  Calendar, 
  Sparkles,
  Award,
  Timer
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Shadow Boxing Workout: 15, 30 & 45-Min Routines | SparAI',
  description: 'Burn up to 500 calories with shadow boxing. Step-by-step 15, 30, and 45-minute shadow boxing routines, punch combinations chart, and AI vision drills.',
  keywords: [
    'shadow boxing workout',
    'shadow boxing routine',
    'shadow boxing combinations',
    'shadow boxing for fat loss',
    'shadow boxing for beginners',
    'boxing cardio workout at home',
    'sparai shadow boxing'
  ],
  alternates: {
    canonical: 'https://sparai.in/blog/shadow-boxing-workout',
  },
  openGraph: {
    title: 'Shadow Boxing Workout: 15, 30 & 45-Min Routines for Speed & Fat Loss',
    description: 'High-intensity shadow boxing protocols designed by AI combat coaches. Master combos and torch calories.',
    url: 'https://sparai.in/blog/shadow-boxing-workout',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Shadow Boxing' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shadow Boxing Workout: 15, 30 & 45-Min Routines for Speed & Fat Loss',
    description: 'Burn fat, build speed, and drill the 1-6 punch combination system with AI tracking.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ShadowBoxingWorkoutPage() {
  const jsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Shadow Boxing Workout: 15, 30 & 45-Min Routines for Speed & Fat Loss',
    description: 'Master shadow boxing for cardio, punch mechanics, and fight conditioning with step-by-step round workouts.',
    image: 'https://sparai.in/logo.jpg',
    author: {
      '@type': 'Organization',
      name: 'SparAI Combat Lab',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SparAI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sparai.in/logo.jpg',
      },
    },
    datePublished: '2025-02-10',
    dateModified: '2026-03-01',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://sparai.in/blog/shadow-boxing-workout',
    },
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />

      <SeoNav currentPageTitle="Shadow Boxing Workout" />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-primary">Shadow Boxing Workout</span>
        </nav>

        {/* Article Header */}
        <header className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <Flame className="w-3.5 h-3.5" /> High-Intensity Cardio
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            The Ultimate Shadow Boxing Workout: 15, 30 & 45-Minute Routines
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/60 pt-2 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> 6 min read</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> March 2026</span>
            <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-primary" /> Pro Boxing Protocols</span>
          </div>
        </header>

        {/* Highlight Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="glass-card rounded-2xl p-5 border border-white/10 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-primary font-mono mb-1">450 - 600</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Calories Burned / Hr</div>
          </div>
          <div className="glass-card rounded-2xl p-5 border border-white/10 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mb-1">0 lbs</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Equipment Required</div>
          </div>
          <div className="glass-card rounded-2xl p-5 border border-white/10 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-primary font-mono mb-1">+40%</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Punch Snap Velocity</div>
          </div>
        </div>

        {/* Content */}
        <article className="prose prose-invert max-w-none space-y-12 text-white/80 leading-relaxed">
          {/* Combinations Cheat Sheet */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">01.</span>
              The Boxing Number System Cheat Sheet
            </h2>
            <p>
              Use these numerical triggers when going through the shadow boxing rounds below:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 font-mono text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-primary font-bold text-base block mb-0.5">1</span>
                Lead Jab
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-primary font-bold text-base block mb-0.5">2</span>
                Rear Cross
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-primary font-bold text-base block mb-0.5">3</span>
                Lead Hook
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-primary font-bold text-base block mb-0.5">4</span>
                Rear Hook
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-primary font-bold text-base block mb-0.5">5</span>
                Lead Uppercut
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-primary font-bold text-base block mb-0.5">6</span>
                Rear Uppercut
              </div>
            </div>
          </section>

          {/* Routine 1: 15-Min Express */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Timer className="w-5 h-5 text-primary" /> Routine A: 15-Minute Express Fat Burner
              </h2>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-primary/20 text-primary">Tabata Style</span>
            </div>
            <p className="text-sm">
              Designed for busy mornings or post-weight training cardio. 5 rounds of 2 minutes on, 45 seconds rest.
            </p>

            <div className="space-y-3 text-sm">
              <div className="glass-card rounded-xl p-4 border border-white/10">
                <strong className="text-white">Round 1:</strong> Continuous 1-2 straight punches with forward and backward foot glide. Keep breathing rhythm constant.
              </div>
              <div className="glass-card rounded-xl p-4 border border-white/10">
                <strong className="text-white">Round 2:</strong> 1-2-3 combo (Jab - Cross - Hook), followed by ducking under an imaginary counter hook.
              </div>
              <div className="glass-card rounded-xl p-4 border border-white/10">
                <strong className="text-white">Round 3:</strong> Body-Head transitions: 1 to the head, 2 to the body, 3 to the head.
              </div>
              <div className="glass-card rounded-xl p-4 border border-white/10">
                <strong className="text-white">Round 4:</strong> Speed shoe-shine punches (fast hand flurry for 15 seconds) alternating with slow tactical pivots.
              </div>
              <div className="glass-card rounded-xl p-4 border border-white/10">
                <strong className="text-white">Round 5:</strong> All-out non-stop combination freestyle with high volume output.
              </div>
            </div>
          </section>

          {/* Routine 2: 30-Min */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Timer className="w-5 h-5 text-primary" /> Routine B: 30-Minute Technical Fighter
              </h2>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/10 text-white">Full Camp</span>
            </div>
            <p className="text-sm">
              A complete 8-round workout mimicking a professional match warm-up with active defensive rolls.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-white font-mono">
                    <th className="py-2.5 px-3">Round</th>
                    <th className="py-2.5 px-3">Objective</th>
                    <th className="py-2.5 px-3">Combination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white/70">
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-primary">R1 - R2</td>
                    <td className="py-2.5 px-3">Pacing & Distance</td>
                    <td className="py-2.5 px-3">Double Jab (1-1), Cross (2), Step back</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-primary">R3 - R4</td>
                    <td className="py-2.5 px-3">Slip Counters</td>
                    <td className="py-2.5 px-3">Slip right, 2-3-2, Pivot left 90°</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-primary">R5 - R6</td>
                    <td className="py-2.5 px-3">Inside Fighting</td>
                    <td className="py-2.5 px-3">Lead Uppercut (5), Cross (2), Lead Hook (3)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono text-primary">R7 - R8</td>
                    <td className="py-2.5 px-3">Championship Finish</td>
                    <td className="py-2.5 px-3">Maximum punch output, head movement on every 3rd punch</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Biomechanical Tips */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              The 3 Rules of Effective Shadow Boxing
            </h2>

            <div className="space-y-3">
              <div className="glass-card rounded-xl p-4 border border-white/10">
                <h3 className="font-bold text-white mb-1">1. Snap Don&apos;t Push</h3>
                <p className="text-xs text-white/70">
                  Because you aren&apos;t hitting a bag, avoid hyper-extending your elbows. Keep a micro-bend at peak extension and snap the fist back to your cheek twice as fast as you threw it.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4 border border-white/10">
                <h3 className="font-bold text-white mb-1">2. Exhale on Strike (&ldquo;Tsss&rdquo;)</h3>
                <p className="text-xs text-white/70">
                  A sharp breath through your teeth tightens your abdominal wall, guarding you from liver counter-punches and stabilizing your core.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4 border border-white/10">
                <h3 className="font-bold text-white mb-1">3. Move Your Head After Every Combo</h3>
                <p className="text-xs text-white/70">
                  Never finish a punch combination standing still on the centerline. Always add a slip, roll, or angle step immediately following your final strike.
                </p>
              </div>
            </div>
          </section>
        </article>

        {/* CTA Card */}
        <div className="mt-14 p-8 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Track Your Shadow Boxing With SparAI</h3>
            <p className="text-sm text-white/60">Get strike velocity readouts, combo accuracy scoring, and automated round timing.</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 px-6 py-3.5 rounded-xl bg-primary text-black font-extrabold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(226,255,59,0.3)]"
          >
            Start Shadow Boxing Now
          </Link>
        </div>
      </main>

      <SeoFooter />
    </div>
  );
}
