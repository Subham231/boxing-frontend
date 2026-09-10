import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  Home, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  UserCheck, 
  Sparkles
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Boxing Training at Home: Complete No-Equipment Blueprint | SparAI',
  description: 'Learn how to train boxing at home with zero gear. High-intensity home boxing circuits, shadow boxing workouts, space setup, and AI form tracking.',
  keywords: [
    'boxing training at home',
    'home boxing workout',
    'how to train boxing at home without equipment',
    'boxing workout routine',
    'boxing conditioning at home',
    'no bag boxing workout',
    'sparai home boxing'
  ],
  alternates: {
    canonical: 'https://sparai.in/blog/boxing-training-at-home',
  },
  openGraph: {
    title: 'Boxing Training at Home: Complete No-Equipment Blueprint',
    description: 'Transform your living room into a high-octane boxing gym. Workouts, circuits, and camera AI coaching.',
    url: 'https://sparai.in/blog/boxing-training-at-home',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Home Boxing' }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boxing Training at Home: Complete No-Equipment Blueprint',
    description: 'Master home boxing fitness, 6-round circuits, and punch mechanics with AI camera feedback.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BoxingTrainingAtHomePage() {
  const jsonLdHowTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Train Boxing at Home with No Equipment',
    description: 'A 5-step blueprint for mastering boxing fitness, punch combos, and defensive reflexes at home.',
    image: 'https://sparai.in/logo.jpg',
    totalTime: 'PT30M',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Clear a 6x6 Foot Space and Position Your Camera',
        text: 'Clear any furniture so you have roughly 6 feet in all directions. Prop your phone or laptop at chest level.',
        url: 'https://sparai.in/blog/boxing-training-at-home#step-1',
      },
      {
        '@type': 'HowToStep',
        name: 'Perform a 5-Minute Boxer Warmup',
        text: 'Warm up shoulders and ankles with jumping jacks, arm circles, shadow skips, and neck rolls.',
        url: 'https://sparai.in/blog/boxing-training-at-home#step-2',
      },
      {
        '@type': 'HowToStep',
        name: 'Execute 3-Minute Shadow Boxing Rounds',
        text: 'Throw structured punch combinations (1-2, 1-2-3, 1-1-2) while circling and moving your head.',
        url: 'https://sparai.in/blog/boxing-training-at-home#step-3',
      },
      {
        '@type': 'HowToStep',
        name: 'Boxer Calisthenic Conditioning',
        text: 'Super-set rounds with boxer pushups, squats, and mountain climbers to develop anaerobic power.',
        url: 'https://sparai.in/blog/boxing-training-at-home#step-4',
      },
      {
        '@type': 'HowToStep',
        name: 'AI Camera Velocity & Guard Review',
        text: 'Use SparAI to check your punch speeds and ensure your hands were not dropping during exhaustion.',
        url: 'https://sparai.in/blog/boxing-training-at-home#step-5',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="howto-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdHowTo) }}
      />

      <SeoNav currentPageTitle="Boxing Training at Home" />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-primary">Boxing Training at Home</span>
        </nav>

        {/* Article Header */}
        <header className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <Home className="w-3.5 h-3.5" /> Home Gym Blueprint
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Boxing Training at Home: How to Build Elite Fight Conditioning Without a Heavy Bag
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/60 pt-2 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> 7 min read</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> March 2026</span>
            <span className="flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-primary" /> By SparAI Performance Team</span>
          </div>
        </header>

        {/* Introduction Quote */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-12 border-l-4 border-l-primary border-y border-r border-white/10">
          <p className="text-base sm:text-lg italic text-white/90 leading-relaxed">
            &ldquo;You don&apos;t need an expensive leather heavy bag or $300 boxing gym membership to forge crisp hand speed and championship cardio. Mike Tyson and Floyd Mayweather performed thousands of rounds of shadow boxing alone in small rooms.&rdquo;
          </p>
        </div>

        {/* Core Sections */}
        <article className="prose prose-invert max-w-none space-y-12 text-white/80 leading-relaxed">
          {/* Section 1 */}
          <section id="step-1" className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">01.</span>
              Room Setup: Creating Your Virtual Ring
            </h2>
            <p>
              You only need a 6x6 foot clear zone. Hard surfaces (wood or tile) with gym sneakers or rubber mats are ideal. Avoid high-pile carpets that can catch your pivot foot and torque your knees.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white text-sm mb-2 text-primary">Camera Placement</h3>
                <p className="text-xs text-white/60">
                  Prop your phone or laptop on a desk or shelf at chest height, roughly 6 to 8 feet away so your full torso and knees fit into the lens frame.
                </p>
              </div>
              <div className="glass-card rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white text-sm mb-2 text-primary">Lighting Matters</h3>
                <p className="text-xs text-white/60">
                  Ensure the light source is in front of you, not behind. Backlighting turns your body into a silhouette, hindering pose detection keypoints.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Workout Structure */}
          <section id="step-2" className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">02.</span>
              The 30-Minute At-Home Fighter Circuit
            </h2>
            <p>
              Traditional boxing training is structured around 3-minute rounds with 60 seconds of rest. Follow this 6-round format:
            </p>

            <div className="space-y-4 pt-2">
              <div className="glass-card rounded-xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">Round 1: Footwork & Distance Calibration</h3>
                  <span className="text-xs font-mono text-primary">3 Mins</span>
                </div>
                <p className="text-xs text-white/60">
                  Forward step-slide, backward retreats, lateral pivots. Throw only single jabs (1) while maintaining a tight high guard. Focus on breathing out with every jab snap.
                </p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">Round 2: The Core 1-2 & Slip Counters</h3>
                  <span className="text-xs font-mono text-primary">3 Mins</span>
                </div>
                <p className="text-xs text-white/60">
                  Jab - Cross (1-2) → Slip right → fire another Cross (2). Focus on fully pivoting the rear heel to generate torque through the obliques and hips.
                </p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">Round 3: Angle Changes & Hooks</h3>
                  <span className="text-xs font-mono text-primary">3 Mins</span>
                </div>
                <p className="text-xs text-white/60">
                  Jab - Cross - Lead Hook (1-2-3) → Pivot 90 degrees out. Visualize an oncoming straight right hand, roll underneath it, and reset in your orthodox stance.
                </p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">Round 4: High-Velocity Burnout</h3>
                  <span className="text-xs font-mono text-primary">3 Mins</span>
                </div>
                <p className="text-xs text-white/60">
                  Shoeshine punch drill: rapid straight punches continuously for 30 seconds, followed by 15 seconds of high knees, repeated 4 times.
                </p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">Round 5 & 6: Boxer Calisthenics</h3>
                  <span className="text-xs font-mono text-primary">6 Mins</span>
                </div>
                <p className="text-xs text-white/60">
                  20 knuckles push-ups, 20 jump squats, 30 Russian twists, 1-minute plank hold. Repeat twice.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: The Secret Weapon */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-primary font-mono text-xl">03.</span>
              How AI Transforms Solo Training
            </h2>
            <p>
              The biggest drawback of training boxing alone has always been the lack of a coach watching you. You can develop bad habits—like dropping your left hand on hooks or leaning forward—without realizing it.
            </p>
            <div className="glass-card rounded-2xl p-6 border border-primary/30 bg-primary/[0.04]">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> The SparAI Computer Vision Edge
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Real-time Guard Tracker:</strong> Triggers visual alerts if your cheek protection drops below target thresholds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Velocity Meter (m/s):</strong> Measures acceleration and snap speed on every single jab and cross.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Interactive Reaction Drills:</strong> SparAI flashes targets on screen requiring reactive slips and counter-strikes.</span>
                </li>
              </ul>
            </div>
          </section>
        </article>

        {/* CTA Card */}
        <div className="mt-14 p-8 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Start Your First Home Round Now</h3>
            <p className="text-sm text-white/60">Open the camera, step back into your stance, and let SparAI count your strikes.</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 px-6 py-3.5 rounded-xl bg-primary text-black font-extrabold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(226,255,59,0.3)]"
          >
            Launch Free Workout
          </Link>
        </div>
      </main>

      <SeoFooter />
    </div>
  );
}
