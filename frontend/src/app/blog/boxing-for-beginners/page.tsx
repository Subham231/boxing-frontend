import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  ShieldAlert, 
  Target, 
  Clock, 
  Calendar, 
  UserCheck, 
  ArrowRight, 
  Sparkles,
  Zap,
  HelpCircle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Boxing for Beginners: The Ultimate Guide to Stance, Punches & Form | SparAI',
  description: 'Master boxing fundamentals at home. Step-by-step breakdown of orthodox stance, the 4 core punches (jab, cross, hook, uppercut), defensive slips, and beginner training drills.',
  keywords: [
    'boxing for beginners',
    'how to box at home',
    'boxing stance',
    'how to throw a jab',
    'boxing punches 1 2 3 4',
    'boxing basics tutorial',
    'ai boxing coach',
    'shadow boxing for beginners'
  ],
  alternates: {
    canonical: 'https://sparai.in/blog/boxing-for-beginners',
  },
  openGraph: {
    title: 'Boxing for Beginners: The Ultimate Guide to Stance, Punches & Form',
    description: 'Master the fundamental punches, defensive guard, and footwork from home with AI form tracking.',
    url: 'https://sparai.in/blog/boxing-for-beginners',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Boxing for Beginners' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boxing for Beginners: The Ultimate Guide to Stance, Punches & Form',
    description: 'Master orthodox stance, punches 1-4, defense, and complete 7-day training schedule.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BoxingForBeginnersPage() {
  const jsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Boxing for Beginners: The Ultimate Guide to Stance, Punches & Form',
    description: 'Learn boxing fundamentals: orthodox stance, jab, cross, hooks, defense, and complete beginner training schedule.',
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
    datePublished: '2025-01-15',
    dateModified: '2026-03-01',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://sparai.in/blog/boxing-for-beginners',
    },
  };

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Can I learn boxing at home without equipment?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Shadow boxing and footwork drills require zero equipment or punching bags. You only need a small clear space and a mirror or camera. With SparAI, your phone or laptop camera acts as an AI coach providing real-time feedback on your punch velocity and guard position.'
        }
      },
      {
        '@type': 'Question',
        name: 'What is the most common boxing mistake beginners make?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The number one mistake is dropping the opposite hand while punching. When throwing a jab or right cross, beginners often lower their non-punching glove, leaving their chin exposed. Always keep your rear hand glued to your cheek.'
        }
      },
      {
        '@type': 'Question',
        name: 'How long does it take for a beginner to get good at boxing?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'With 3 to 4 focused 20-minute sessions per week, beginners usually develop crisp punch mechanics, balanced footwork, and cardiovascular stamina within 4 to 8 weeks.'
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <SeoNav currentPageTitle="Boxing for Beginners" />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-primary">Boxing for Beginners</span>
        </nav>

        {/* Article Header */}
        <header className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> Beginner Masterclass
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Boxing for Beginners: The Complete Guide to Stance, Punches, and Fundamentals
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/60 pt-2 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> 8 min read</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> Updated March 2026</span>
            <span className="flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-primary" /> By SparAI Biomechanics Lab</span>
          </div>
        </header>

        {/* Interactive Highlight Box */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-12 border border-primary/30 bg-primary/[0.03] shadow-[0_0_30px_rgba(226,255,59,0.08)]">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/20 text-primary shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">
                Accelerate Your Progress with Computer Vision
              </h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                Instead of guessing if your elbow is flared or your chin is exposed, SparAI uses your camera to measure punch velocity, stance symmetry, and reaction latency in real-time.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-black text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all"
              >
                <span>Try Live AI Form Check</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="prose prose-invert max-w-none space-y-12 text-white/80 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">01.</span>
              The Boxing Stance: The Root of All Power
            </h2>
            <p>
              Every punch begins at your feet. Without a solid, balanced stance, punches lose up to 70% of their kinetic energy, and you leave yourself vulnerable to off-balance counters.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="glass-card rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Orthodox (Right-Handed)
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Left foot forward pointed at 1 o&apos;clock, right foot back at 2 o&apos;clock. Feet shoulder-width apart, knees slightly bent, weight split 50/50 on the balls of your feet.
                </p>
              </div>
              <div className="glass-card rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Southpaw (Left-Handed)
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Right foot forward pointed at 11 o&apos;clock, left foot back at 10 o&apos;clock. Power hand (left) is in the rear, ready to release through hip rotation.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-4 border border-white/10 mt-4 text-sm">
              <strong className="text-primary">Key Rule:</strong> Keep your chin tucked into your collarbone. Never look straight up; look through your eyebrows with both hands guarding your cheekbones.
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">02.</span>
              The 4 Fundamental Punches (1-2-3-4 System)
            </h2>
            <p>
              Boxing coaches worldwide use a numerical numbering system for punches. Mastering numbers 1 through 4 gives you the foundation for hundreds of combinations.
            </p>

            <div className="space-y-4">
              {/* Punch 1 */}
              <div className="glass-card rounded-xl p-5 border border-white/10 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">#1 — The Lead Jab</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">Distance & Control</span>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  The most important punch in boxing. Thrown with your front hand straight out from the guard. Rotate your palm down at the final instant of impact while stepping slightly forward.
                </p>
                <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                  <li>Keep rear glove glued to your right cheek.</li>
                  <li>Snap it back immediately along the exact same path.</li>
                </ul>
              </div>

              {/* Punch 2 */}
              <div className="glass-card rounded-xl p-5 border border-white/10 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">#2 — The Straight Rear Cross</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">Power Striking</span>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  Your primary power punch. Push off the ball of your back foot, pivot your rear heel outwards, rotate hips and shoulders together, and fire down the center pipe.
                </p>
                <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                  <li>Pivoting the back foot like putting out a cigarette creates rotational torque.</li>
                  <li>Your lead shoulder lifts slightly to shield your jaw.</li>
                </ul>
              </div>

              {/* Punch 3 */}
              <div className="glass-card rounded-xl p-5 border border-white/10 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">#3 — The Lead Hook</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">Angular Damage</span>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  Horizontal rotation punch with the lead arm bent at a 90-degree angle. Shift weight onto the front foot and pivot the front heel as you whip your torso across.
                </p>
                <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                  <li>Never pull your hand back before throwing (telegraphing).</li>
                  <li>Keep your elbow level with your wrist on impact.</li>
                </ul>
              </div>

              {/* Punch 4 */}
              <div className="glass-card rounded-xl p-5 border border-white/10 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">#4 — The Rear Uppercut</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">Vertical Breach</span>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  An upward strike targeting the chin or solar plexus. Dip your rear hip slightly, drive upward through your legs, and drive your knuckles upward with palm facing you.
                </p>
                <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                  <li>Do not drop your hand down to your hip before throwing.</li>
                  <li>Power comes from the knee extension and upward hip pop.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">03.</span>
              The 7-Day Beginner Training Roadmap
            </h2>
            <p>
              Consistency beats intensity. Follow this 15-to-25 minute daily structure to build neurological pathways for crisp form:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-white font-mono">
                    <th className="py-3 px-3">Day</th>
                    <th className="py-3 px-3">Focus</th>
                    <th className="py-3 px-3">Routine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white/70">
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Day 1</td>
                    <td className="py-3 px-3 font-medium text-white">Stance & Jab (1)</td>
                    <td className="py-3 px-3">3 rounds shadow boxing with jab only + mirror form check.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Day 2</td>
                    <td className="py-3 px-3 font-medium text-white">The 1-2 Combo</td>
                    <td className="py-3 px-3">3 rounds of Jab-Cross, focusing on rear foot hip rotation.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Day 3</td>
                    <td className="py-3 px-3 font-medium text-white">Active Recovery</td>
                    <td className="py-3 px-3">Jump rope 10 mins + mobility & shoulder stretches.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Day 4</td>
                    <td className="py-3 px-3 font-medium text-white">Lead Hook (3) & Slip</td>
                    <td className="py-3 px-3">Slip right, fire 2, slip left, fire 3. 4 rounds of 2 minutes.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Day 5</td>
                    <td className="py-3 px-3 font-medium text-white">Full 1-2-3-2 Flow</td>
                    <td className="py-3 px-3">High-tempo 5 rounds mixing punches with step-slide footwork.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Day 6</td>
                    <td className="py-3 px-3 font-medium text-white">AI Vision Evaluation</td>
                    <td className="py-3 px-3">Run SparAI Camera Analysis to benchmark velocity and guard integrity.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-primary">Day 7</td>
                    <td className="py-3 px-3 font-medium text-white">Rest & Regroup</td>
                    <td className="py-3 px-3">Hydrate, review your stats, and prepare for next week.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: Common Mistakes */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">04.</span>
              Top 3 Beginner Traps & How to Fix Them
            </h2>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
                <div className="font-bold text-red-400 mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Mistake 1: Dropping the Opposite Hand
                </div>
                <p className="text-white/70 text-xs">
                  When you throw the right hand, your left hand tends to drop toward your chest. Keep your left thumb touching your left cheekbone throughout the stroke.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
                <div className="font-bold text-red-400 mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Mistake 2: Flaring the Elbows
                </div>
                <p className="text-white/70 text-xs">
                  Flaring your elbow wide before a punch signals your opponent (telegraphing) and bleeds power. Punch through an imaginary narrow hallway.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
                <div className="font-bold text-red-400 mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Mistake 3: Crossing Your Feet
                </div>
                <p className="text-white/70 text-xs">
                  When moving backwards or sideways, never cross your legs. Step with the foot closest to the direction you are heading, then slide the trailing foot.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="space-y-4 pt-4 border-t border-white/10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-primary" />
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              <div className="glass-card rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white text-base mb-2">Can I learn boxing at home without equipment?</h3>
                <p className="text-sm text-white/70">
                  Yes! Shadow boxing and footwork drills require zero equipment or punching bags. You only need a small clear space and a mirror or camera. With SparAI, your phone or laptop camera acts as an AI coach providing real-time feedback on your punch velocity and guard position.
                </p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white text-base mb-2">What is the most common boxing mistake beginners make?</h3>
                <p className="text-sm text-white/70">
                  The number one mistake is dropping the opposite hand while punching. When throwing a jab or right cross, beginners often lower their non-punching glove, leaving their chin exposed. Always keep your rear hand glued to your cheek.
                </p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white text-base mb-2">How long does it take for a beginner to get good at boxing?</h3>
                <p className="text-sm text-white/70">
                  With 3 to 4 focused 20-minute sessions per week, beginners usually develop crisp punch mechanics, balanced footwork, and cardiovascular stamina within 4 to 8 weeks.
                </p>
              </div>
            </div>
          </section>
        </article>

        {/* Bottom Banner */}
        <div className="mt-14 p-8 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Ready to test your punch form right now?</h3>
            <p className="text-sm text-white/60">No gloves or hardware required. Set your phone down and throw 10 jabs in front of our AI camera.</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 px-6 py-3.5 rounded-xl bg-primary text-black font-extrabold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(226,255,59,0.3)]"
          >
            Start Live Camera Test
          </Link>
        </div>
      </main>

      <SeoFooter />
    </div>
  );
}
