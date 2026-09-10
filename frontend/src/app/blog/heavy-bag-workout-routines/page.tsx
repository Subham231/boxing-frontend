import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  Flame, 
  Clock, 
  Calendar, 
  UserCheck
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Heavy Bag Workout Routines: Complete 8-Round Punching Bag Guide | SparAI',
  description: 'Burn fat and build knockout punching power with structured heavy bag workout routines. Round-by-round combinations, interval conditioning, and wrist protection.',
  keywords: [
    'heavy bag workout routines',
    'punching bag workout for beginners',
    'heavy bag combinations',
    'boxing bag drills for power',
    'punching bag cardio',
    'heavy bag training plan'
  ],
  alternates: {
    canonical: 'https://sparai.in/blog/heavy-bag-workout-routines',
  },
  openGraph: {
    title: 'Heavy Bag Workout Routines: Complete 8-Round Punching Bag Guide',
    description: 'Transform your heavy bag training. 8 championship rounds for power, endurance, and punch combinations.',
    url: 'https://sparai.in/blog/heavy-bag-workout-routines',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Heavy Bag Workout' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Heavy Bag Workout Routines: Complete 8-Round Punching Bag Guide',
    description: 'Master power, speed, and endurance on the punching bag with 8 structured rounds.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HeavyBagWorkoutPage() {
  const jsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Heavy Bag Workout Routines: Complete 8-Round Punching Bag Guide',
    description: 'Structured 8-round heavy bag training protocol focusing on punch velocity, rotational power, and combat stamina.',
    image: 'https://sparai.in/logo.jpg',
    author: {
      '@type': 'Organization',
      name: 'SparAI Combat Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SparAI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sparai.in/logo.jpg',
      },
    },
    datePublished: '2025-02-24',
    dateModified: '2026-03-01',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://sparai.in/blog/heavy-bag-workout-routines',
    },
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="bag-article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />

      <SeoNav currentPageTitle="Heavy Bag Workout" />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-primary">Heavy Bag Workout Routines</span>
        </nav>

        {/* Header */}
        <header className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <Flame className="w-3.5 h-3.5" /> Power & Impact
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Heavy Bag Workout Routines: The 8-Round Fighter Protocol
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/60 pt-2 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> 7 min read</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> March 2026</span>
            <span className="flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-primary" /> By SparAI Performance Lab</span>
          </div>
        </header>

        {/* Content */}
        <article className="prose prose-invert max-w-none space-y-12 text-white/80 leading-relaxed">
          {/* Rules of Heavy Bag */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">01.</span>
              The Golden Rules of Heavy Bag Training
            </h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm">
                <strong className="text-primary">1. Never Push the Bag:</strong> A punch snaps like a whip. If the bag is swinging wild like a pendulum, you are pushing your punches rather than cracking them.
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm">
                <strong className="text-primary">2. Always Wrap Your Hands:</strong> Heavy bags absorb hundreds of foot-pounds of energy. Protect delicate carpal bones with 180-inch Mexican style hand wraps and 14oz or 16oz training gloves.
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm">
                <strong className="text-primary">3. Circle With the Bag:</strong> Don&apos;t stand flat-footed waiting for the bag to come to you. Use step-and-slide footwork to cut angles as the bag shifts.
              </div>
            </div>
          </section>

          {/* 8-Round Protocol */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">02.</span>
              The 8-Round Championship Circuit (3 Min Rounds / 1 Min Rest)
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-white font-mono">
                    <th className="py-3 px-3">Round</th>
                    <th className="py-3 px-3">Target Focus</th>
                    <th className="py-3 px-3">Round Objective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white/70">
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Round 1</td>
                    <td className="py-3 px-3 font-medium text-white">Jab Calibration</td>
                    <td className="py-3 px-3">Lead jab only. Single, double, body jab. Calibrate distance and wrist snap.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Round 2</td>
                    <td className="py-3 px-3 font-medium text-white">The Straight 1-2</td>
                    <td className="py-3 px-3">Jab-Cross down the pipe. Rotate rear hip 100% on the cross.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Round 3</td>
                    <td className="py-3 px-3 font-medium text-white">Hooks & Angles</td>
                    <td className="py-3 px-3">1-2-3 (Jab-Cross-Lead Hook). Step around the bag after every hook.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Round 4</td>
                    <td className="py-3 px-3 font-medium text-white">Body-Head Level Change</td>
                    <td className="py-3 px-3">1 to head, 2 to body, 3 to head. Bend knees to sink your weight.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Round 5</td>
                    <td className="py-3 px-3 font-medium text-white">Inside Infighting</td>
                    <td className="py-3 px-3">Press forehead lightly against bag. Throw short hooks and uppercuts.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Round 6</td>
                    <td className="py-3 px-3 font-medium text-white">Speed Shoe-Shines</td>
                    <td className="py-3 px-3">Continuous straight punches at 70% power for max cardiovascular burn.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Round 7</td>
                    <td className="py-3 px-3 font-medium text-white">Pure Knockout Power</td>
                    <td className="py-3 px-3">Low frequency, 100% maximum torque single strikes and 2-punch bursts.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Round 8</td>
                    <td className="py-3 px-3 font-medium text-white">Championship Final</td>
                    <td className="py-3 px-3">Everything you have left. Combination freestyle with active lateral footwork.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </article>

        {/* CTA */}
        <div className="mt-14 p-8 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Track Your Punch Velocity With SparAI</h3>
            <p className="text-sm text-white/60">Position your phone next to your bag and let our AI measure your strike velocity.</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 px-6 py-3.5 rounded-xl bg-primary text-black font-extrabold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(226,255,59,0.3)]"
          >
            Open SparAI Camera
          </Link>
        </div>
      </main>

      <SeoFooter />
    </div>
  );
}
