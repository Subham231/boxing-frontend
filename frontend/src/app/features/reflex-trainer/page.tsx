import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  Zap, 
  Target, 
  Gauge, 
  ArrowRight, 
  Activity
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Boxing Reflex Trainer: Improve Reaction Time & Defense | SparAI',
  description: 'Sharpen your reaction latency and defensive reflexes with SparAI. Interactive audio-visual slip cues, sub-300ms reaction testing, and counter-punch drills.',
  keywords: [
    'boxing reflex trainer',
    'reaction time training boxing',
    'slip reflex drills',
    'hand eye coordination boxing',
    'boxing reaction ball app',
    'combat reflex drills',
    'sparai reflex'
  ],
  alternates: {
    canonical: 'https://sparai.in/features/reflex-trainer',
  },
  openGraph: {
    title: 'Boxing Reflex Trainer: Improve Reaction Time & Defense | SparAI',
    description: 'Sub-300ms reaction tracking: drill slips, rolls, and lightning counter-punches with dynamic AI triggers.',
    url: 'https://sparai.in/features/reflex-trainer',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Reflex Trainer' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boxing Reflex Trainer: Improve Reaction Time & Defense | SparAI',
    description: 'Interactive slip, roll, and counter-punch drills with millisecond reaction scoring.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ReflexTrainerFeaturePage() {
  const jsonLdSoftware = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SparAI Tactical Reflex Trainer',
    operatingSystem: 'Web, iOS, Android',
    applicationCategory: 'HealthApplication, SportsApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Interactive combat reflex trainer testing reaction latency, defensive slips, and rapid counter-punching with audio-visual stimulus.',
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="reflex-software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />

      <SeoNav currentPageTitle="Reflex Trainer" />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e2ff3b_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none" />
        <div className="absolute top-10 left-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <Zap className="w-4 h-4" /> Millisecond Reaction Conditioning
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Train Neural Reflexes To Slip <span className="text-primary">Incoming Strikes</span>
          </h1>

          <p className="text-base sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            In combat, 50 milliseconds makes the difference between slipping a right hook or taking a flush hit. SparAI conditions your central nervous system with randomized audio-visual stimulus and instant counter cues.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/reflex"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-black font-extrabold uppercase tracking-wider text-sm hover:bg-primary/90 transition-all shadow-[0_0_35px_rgba(226,255,59,0.35)] hover:shadow-[0_0_50px_rgba(226,255,59,0.6)] active:scale-95"
            >
              <span>Launch Live Reflex Arena</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/15 text-sm font-semibold transition-all active:scale-95"
            >
              <span>Explore All Features</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Latency Benchmarks */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-extrabold text-white">How Fast Are Your Fight Reflexes?</h2>
          <p className="text-sm text-white/60">Compare your human reaction benchmarks against trained boxers.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6 border border-white/10 text-center space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-white/40">Untrained Adult</div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">320 - 400 <span className="text-xs text-white/50">ms</span></div>
            <p className="text-xs text-white/60">Average visual response time to sudden movement.</p>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white/10 text-center space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-white/40">Amateur Boxer</div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">230 - 270 <span className="text-xs text-white/50">ms</span></div>
            <p className="text-xs text-white/60">Conditioned peripheral anticipation and slip trigger.</p>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-primary/40 text-center space-y-2 bg-primary/[0.04] shadow-[0_0_30px_rgba(226,255,59,0.15)]">
            <div className="text-xs font-mono uppercase tracking-wider text-primary font-bold">SparAI Pro Tier</div>
            <div className="text-3xl sm:text-4xl font-extrabold text-primary font-mono">&lt; 200 <span className="text-xs text-primary/70">ms</span></div>
            <p className="text-xs text-white/70">Sub-conscious muscle memory with immediate counter response.</p>
          </div>
        </div>
      </section>

      {/* Feature Mechanics */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white">
            Built for Tactical Fight Readiness
          </h2>
          <p className="text-sm text-white/60 max-w-xl mx-auto">
            Traditional reflex balls fly unpredictably into walls. SparAI provides structured, measurable, and adaptive training routines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Randomized Direction Vectors</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Stimuli appear from varying angles (left hook, straight right, body shot), training your brain to identify the threat angle without anticipating a pattern.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <Gauge className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Progressive Speed Ramping</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              The arena increases interval pace as your score rises. Miss a beat and the intensity resets, enforcing hyper-focus under cardiovascular stress.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Instant Counter-Punch Cues</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Defense without offense loses rounds. Every defensive slip command is followed immediately by a designated counter strike (e.g., Slip Right → 2 Cross).
            </p>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Test Your Reflex Speed Right Now
            </h3>
            <p className="text-sm text-white/70 max-w-xl">
              No equipment needed. Jump into the arena, turn up the audio cues, and measure your reaction latency in 60 seconds.
            </p>
          </div>

          <Link
            href="/reflex"
            className="shrink-0 px-8 py-4 rounded-2xl bg-primary text-black font-extrabold uppercase tracking-wider text-sm hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(226,255,59,0.4)]"
          >
            Start Reflex Drill
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
