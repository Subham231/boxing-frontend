import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  ShieldCheck, 
  Clock, 
  Calendar, 
  UserCheck, 
  HelpCircle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Boxing Defense Techniques: Slips, Rolls, Pulls & Guard Styles | SparAI',
  description: 'Master boxing defense. Step-by-step tutorial on slipping jabs, rolling under hooks, pull counters, and choosing between High Guard, Philly Shell, and Peek-a-boo.',
  keywords: [
    'boxing defense techniques',
    'how to slip punches boxing',
    'boxing rolls and slips',
    'philly shell vs high guard',
    'peekaboo boxing style',
    'boxing head movement drills',
    'pull counter boxing'
  ],
  alternates: {
    canonical: 'https://sparai.in/blog/boxing-defense-techniques',
  },
  openGraph: {
    title: 'Boxing Defense Techniques: Slips, Rolls, Pulls & Guard Styles',
    description: 'The science of hit and not get hit. Master slips, rolls, high guard, and defensive counters.',
    url: 'https://sparai.in/blog/boxing-defense-techniques',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Boxing Defense' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boxing Defense Techniques: Slips, Rolls, Pulls & Guard Styles',
    description: 'Learn how to slip, roll, and counter punches with computer vision form checks.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BoxingDefenseTechniquesPage() {
  const jsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Boxing Defense Techniques: Slips, Rolls, Pulls & Guard Styles',
    description: 'Comprehensive guide to head movement, slips, rolls, guard styles, and counter-punch setups in boxing.',
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
    datePublished: '2025-02-18',
    dateModified: '2026-03-01',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://sparai.in/blog/boxing-defense-techniques',
    },
  };

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Should a beginner use the Philly Shell defense?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. The Philly Shell (shoulder roll) requires years of elite distance management, exceptional shoulder flexibility, and high-level reflex anticipation. Beginners should always start with the traditional High Guard to ensure both temples and chin are guarded.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do you slip a punch without losing balance?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Do not bend at your waist. Instead, bend your knees and rotate your shoulders roughly 45 degrees, shifting your weight slightly onto the corresponding foot. Keep your eyes on the opponent at all times.'
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="defense-article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <Script
        id="defense-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <SeoNav currentPageTitle="Boxing Defense" />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-primary">Boxing Defense Techniques</span>
        </nav>

        {/* Header */}
        <header className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" /> Defensive Mastery
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            The Complete Boxing Defense Guide: Slips, Rolls, Pulls & Guard Styles
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/60 pt-2 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> 8 min read</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> March 2026</span>
            <span className="flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-primary" /> SparAI Tactical Analysts</span>
          </div>
        </header>

        {/* Content */}
        <article className="prose prose-invert max-w-none space-y-12 text-white/80 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">01.</span>
              The Golden Rule: Hit and Don&apos;t Get Hit
            </h2>
            <p>
              Boxing is termed the &ldquo;Sweet Science&rdquo; because victory belongs to the athlete who delivers maximum damage while absorbing the minimum. True defensive mastery turns an opponent&apos;s aggression into your greatest counter-punching opportunity.
            </p>
          </section>

          {/* Section 2: Guard Types */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">02.</span>
              The 3 Dominant Guard Styles
            </h2>

            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> 1. The Classic High Guard
                </h3>
                <p className="text-sm text-white/70 mb-2">
                  Both gloves touch your cheekbones, elbows tucked tight to protect ribs. Ideal for beginners and mid-range exchanges.
                </p>
                <div className="text-xs text-white/50">
                  <strong className="text-white">Pros:</strong> Maximum protection. <strong className="text-white">Cons:</strong> Obscures vision against uppercuts if gloves are too close.
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> 2. The Philly Shell (Shoulder Roll)
                </h3>
                <p className="text-sm text-white/70 mb-2">
                  Lead arm drapes across the stomach; lead shoulder rolls up to deflect straight right hands; rear hand guards the chin. Mastered by Floyd Mayweather.
                </p>
                <div className="text-xs text-white/50">
                  <strong className="text-white">Pros:</strong> Effortless counter right hand. <strong className="text-white">Cons:</strong> Vulnerable to lead hooks if timing is off.
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> 3. The Peek-A-Boo Style
                </h3>
                <p className="text-sm text-white/70 mb-2">
                  Developed by Cus D&apos;Amato for Mike Tyson. Hands held directly in front of the face, continuous lateral bobbing and weaving, driving explosive leaping hooks.
                </p>
                <div className="text-xs text-white/50">
                  <strong className="text-white">Pros:</strong> Devastating against taller opponents. <strong className="text-white">Cons:</strong> Extremely stamina-demanding.
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Head Movement */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">03.</span>
              The 4 Core Head Movements
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-4 border border-white/10">
                <h4 className="font-bold text-white text-sm mb-1 text-primary">The Slip</h4>
                <p className="text-xs text-white/60">
                  Moving your head 2 inches off the centerline to let straight punches whistle past your ear. Keep weight centered.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4 border border-white/10">
                <h4 className="font-bold text-white text-sm mb-1 text-primary">The Roll (Bob & Weave)</h4>
                <p className="text-xs text-white/60">
                  Drawing a &ldquo;U&rdquo; shape with your head under wide hooks. Drive the roll from knees and hips, not by bending at the waist.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4 border border-white/10">
                <h4 className="font-bold text-white text-sm mb-1 text-primary">The Pull Counter</h4>
                <p className="text-xs text-white/60">
                  Leaning back 3 inches from a jab by flexing the rear knee, then snapping forward with a devastating right hand counter.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4 border border-white/10">
                <h4 className="font-bold text-white text-sm mb-1 text-primary">The Duck</h4>
                <p className="text-xs text-white/60">
                  Squatting 4 inches to drop under high straight combinations, maintaining full visual eye-contact.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="space-y-4 pt-4 border-t border-white/10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-primary" />
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              <div className="glass-card rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white text-base mb-2">Should a beginner use the Philly Shell defense?</h3>
                <p className="text-sm text-white/70">
                  No. The Philly Shell requires years of distance management and anticipation. Beginners should master the traditional High Guard first.
                </p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white text-base mb-2">How do you slip a punch without losing balance?</h3>
                <p className="text-sm text-white/70">
                  Do not bend at your waist. Instead, bend your knees and rotate your shoulders roughly 45 degrees, keeping your center of gravity firmly planted.
                </p>
              </div>
            </div>
          </section>
        </article>

        {/* CTA */}
        <div className="mt-14 p-8 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Check Your Guard Coverage in Real Time</h3>
            <p className="text-sm text-white/60">SparAI tracks your chin exposure and alerts you whenever you drop your hands.</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 px-6 py-3.5 rounded-xl bg-primary text-black font-extrabold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(226,255,59,0.3)]"
          >
            Start Guard Form Test
          </Link>
        </div>
      </main>

      <SeoFooter />
    </div>
  );
}
