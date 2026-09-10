import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  Calendar, 
  Dumbbell, 
  Flame, 
  ArrowRight, 
  Sparkles, 
  Heart
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Smart Boxing Workout Planner & Training Roadmap | SparAI',
  description: 'AI-generated boxing workout programs. Personalized periodization, aerobic & anaerobic fight conditioning, power development splits, and progressive overload.',
  keywords: [
    'boxing workout planner',
    'boxing training schedule generator',
    'personalized boxing routine',
    'weekly boxing program',
    'boxing strength and conditioning',
    'sparai planner'
  ],
  alternates: {
    canonical: 'https://sparai.in/features/workout-planner',
  },
  openGraph: {
    title: 'Smart Boxing Workout Planner & Training Roadmap | SparAI',
    description: 'Custom boxing training programs built by AI. Periodized splits tailored to your fight goals.',
    url: 'https://sparai.in/features/workout-planner',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Workout Planner' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart Boxing Workout Planner & Training Roadmap | SparAI',
    description: 'AI-generated boxing schedules tailored for speed, power, and cardiovascular endurance.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function WorkoutPlannerFeaturePage() {
  const jsonLdSoftware = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SparAI Smart Workout Planner',
    operatingSystem: 'Web, iOS, Android',
    applicationCategory: 'HealthApplication, SportsApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Personalized AI boxing workout program generator offering periodized splits for beginners, intermediates, and active fighters.',
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="planner-software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />

      <SeoNav currentPageTitle="Workout Planner" />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e2ff3b_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <Calendar className="w-4 h-4" /> Adaptive Periodization
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            A Boxing Training Program Built Around <span className="text-primary">Your Goals</span>
          </h1>

          <p className="text-base sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Stop doing random workouts. SparAI designs periodized weekly training splits that balance technical shadow boxing, power development, high-intensity intervals, and recovery.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/planner"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-black font-extrabold uppercase tracking-wider text-sm hover:bg-primary/90 transition-all shadow-[0_0_35px_rgba(226,255,59,0.35)] hover:shadow-[0_0_50px_rgba(226,255,59,0.6)] active:scale-95"
            >
              <span>Build My Training Plan</span>
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

      {/* 4 Pillars of Training */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-extrabold text-white">The 4 Pillars of the SparAI Engine</h2>
          <p className="text-sm text-white/60">Every generated schedule integrates the core elements of pro fight camps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Skill & Mechanics</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Drills for footwork balance, punch rotation torque, defense slips, and kinetic chain efficiency.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Anaerobic Capacity</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              3-minute round simulations with high output flurries to build championship pace resilience.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Rotational Strength</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Targeted core, shoulder girdle, and hip calisthenics engineered to generate knockout snap.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Active Recovery</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Mobility flows and low-intensity sessions designed to flush lactic acid and avoid overtraining.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Generate Your Customized Roadmap
            </h3>
            <p className="text-sm text-white/70 max-w-xl">
              Choose your schedule (3, 4, or 5 days per week) and let SparAI create your personalized boxing roadmap.
            </p>
          </div>

          <Link
            href="/planner"
            className="shrink-0 px-8 py-4 rounded-2xl bg-primary text-black font-extrabold uppercase tracking-wider text-sm hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(226,255,59,0.4)]"
          >
            Open Workout Planner
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
