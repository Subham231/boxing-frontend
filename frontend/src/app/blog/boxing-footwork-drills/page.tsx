import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  Footprints, 
  Clock, 
  Calendar, 
  UserCheck
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Boxing Footwork Drills: Step-and-Slide, Pivots & Ring Generalship | SparAI',
  description: 'Master boxing footwork from home. Step-by-step drills for step-and-slide mobility, 90-degree pivots, cutting off the ring, and never crossing your feet.',
  keywords: [
    'boxing footwork drills',
    'how to move like a boxer',
    'step and slide boxing',
    'boxing pivot tutorial',
    'ring generalship boxing',
    'boxing footwork at home',
    'agility ladder drills boxing'
  ],
  alternates: {
    canonical: 'https://sparai.in/blog/boxing-footwork-drills',
  },
  openGraph: {
    title: 'Boxing Footwork Drills: Step-and-Slide, Pivots & Ring Generalship',
    description: 'The foundation of power and evasion. Learn pro footwork drills, pivots, and ring generalship.',
    url: 'https://sparai.in/blog/boxing-footwork-drills',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Boxing Footwork' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boxing Footwork Drills: Step-and-Slide, Pivots & Ring Generalship',
    description: 'Master boxing footwork: step-and-slide, lateral shifts, and pivot counters.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BoxingFootworkDrillsPage() {
  const jsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Boxing Footwork Drills: Step-and-Slide, Pivots & Ring Generalship',
    description: 'Learn pro boxing footwork mechanics, step-and-slide movement, pivots, and ring cutting drills.',
    image: 'https://sparai.in/logo.jpg',
    author: {
      '@type': 'Organization',
      name: 'SparAI Footwork Lab',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SparAI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sparai.in/logo.jpg',
      },
    },
    datePublished: '2025-02-28',
    dateModified: '2026-03-01',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://sparai.in/blog/boxing-footwork-drills',
    },
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="footwork-article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />

      <SeoNav currentPageTitle="Footwork Drills" />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-primary">Boxing Footwork Drills</span>
        </nav>

        {/* Header */}
        <header className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <Footprints className="w-3.5 h-3.5" /> Ring Movement
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Boxing Footwork Drills: Master Balance, Pivots & Ring Generalship
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/60 pt-2 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> 6 min read</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> March 2026</span>
            <span className="flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-primary" /> SparAI Footwork Lab</span>
          </div>
        </header>

        {/* Content */}
        <article className="prose prose-invert max-w-none space-y-12 text-white/80 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">01.</span>
              The Golden Rule of Boxing Mobility
            </h2>
            <p>
              Legendary coach Cus D&apos;Amato said: <em>&ldquo;Boxing is 75% legs. You can have the power of a cannon, but if you don&apos;t have wheels, you can&apos;t get the cannon into firing position.&rdquo;</em>
            </p>
            <div className="p-4 rounded-xl bg-primary/[0.05] border border-primary/30 text-sm">
              <strong className="text-primary">The Universal Law:</strong> The foot closest to the direction of travel moves FIRST. Moving forward? Front foot steps first. Moving backward? Back foot steps first. Moving left? Left foot steps first. Moving right? Right foot steps first. Never cross your feet.
            </div>
          </section>

          {/* Section 2: 4 Drills */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">02.</span>
              4 Essential Footwork Drills You Can Do at Home
            </h2>

            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 text-primary">
                  1. The Line Step-and-Slide Drill
                </h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  Find a straight line on your floor (e.g. tile line or tape). Straddle the line at a 45-degree orthodox angle. Step forward 6 inches with your lead foot, then slide your back foot 6 inches. Reverse backward. Maintain exact shoulder-width stance throughout.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 text-primary">
                  2. The 90-Degree Front Foot Pivot
                </h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  Plant your weight on the ball of your lead foot. Swing your rear leg 90 degrees behind you, pivoting on the lead ball like a compass. Throw a 2 (cross) immediately upon landing to punish opponents who charge in straight lines.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 text-primary">
                  3. The Box Drill (4-Corner Square)
                </h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  Visualize a 4x4 foot square. Step forward along the top line, step right along the side, step back along the bottom line, and step left to return. Fire a double jab (1-1) at every corner of the box.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 text-primary">
                  4. Ring Cutoff Side-Steps
                </h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  Rather than chasing a moving fighter in circles, take diagonal 45-degree forward-lateral steps to trap them along the perimeter. Stay composed and balanced on the balls of both feet.
                </p>
              </div>
            </div>
          </section>
        </article>

        {/* CTA */}
        <div className="mt-14 p-8 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Check Your Stance Balance with AI</h3>
            <p className="text-sm text-white/60">SparAI computer vision analyzes your foot width and hip alignment in real time.</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 px-6 py-3.5 rounded-xl bg-primary text-black font-extrabold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(226,255,59,0.3)]"
          >
            Start Free Form Check
          </Link>
        </div>
      </main>

      <SeoFooter />
    </div>
  );
}
