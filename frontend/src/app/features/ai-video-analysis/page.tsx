import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  Eye, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Crosshair, 
  Lock, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Video Analysis for Boxing & Combat Sports | SparAI Computer Vision',
  description: 'Track punch velocity, analyze guard height, and detect mechanical flaws in real time with SparAI computer vision. No sensors required—just your camera.',
  keywords: [
    'ai boxing video analysis',
    'computer vision boxing coach',
    'punch velocity tracker',
    'boxing form analysis app',
    'ai combat coach',
    'boxing camera workout',
    'sparai vision'
  ],
  alternates: {
    canonical: 'https://sparai.in/features/ai-video-analysis',
  },
  openGraph: {
    title: 'AI Video Analysis for Boxing | SparAI Computer Vision',
    description: 'Real-time biomechanical analysis: punch velocity meters, guard coverage, and reflex tracking via your device camera.',
    url: 'https://sparai.in/features/ai-video-analysis',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI AI Video Analysis' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Video Analysis for Boxing | SparAI Computer Vision',
    description: 'Track punch velocity, analyze guard height, and detect flaws in real time with client-side AI computer vision.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AiVideoAnalysisFeaturePage() {
  const jsonLdSoftware = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SparAI Computer Vision Boxing Coach',
    operatingSystem: 'Web, iOS, Android',
    applicationCategory: 'HealthApplication, SportsApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '1280',
    },
    description: 'AI-powered computer vision engine analyzing boxing punch speed, guard integrity, and reaction time in real-time on client devices.',
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />

      <SeoNav currentPageTitle="AI Video Vision" />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e2ff3b_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none" />
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <Cpu className="w-4 h-4" /> Next-Gen Neural Vision Pipeline
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            AI Video Analysis That Reads Every <span className="text-primary">Punch & Slip</span>
          </h1>

          <p className="text-base sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Turn your webcam or smartphone into a biomechanical boxing coach. SparAI detects 33 skeletal landmarks in 60 FPS to measure velocity, guard protection, and tactical reflexes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-black font-extrabold uppercase tracking-wider text-sm hover:bg-primary/90 transition-all shadow-[0_0_35px_rgba(226,255,59,0.35)] hover:shadow-[0_0_50px_rgba(226,255,59,0.6)] active:scale-95"
            >
              <span>Test AI Camera Free</span>
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

      {/* Cyber Tactical HUD Preview Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-20">
        <div className="glass-card rounded-3xl p-6 sm:p-10 border border-primary/40 bg-black/80 shadow-[0_0_60px_rgba(226,255,59,0.15)] relative overflow-hidden">
          {/* Cyber HUD Corner Elements */}
          <div className="absolute top-4 left-4 font-mono text-[10px] text-primary/70 tracking-widest">
            AI_VISION // POSE_DETECT_ONLINE
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[10px] text-white/60">60 FPS ACTIVE</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
            {/* Visual Screen Mock */}
            <div className="lg:col-span-2 relative min-h-[300px] sm:min-h-[400px] rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-white/10 flex flex-col justify-between p-6 overflow-hidden">
              {/* Tactical overlay lines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(226,255,59,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(226,255,59,0.03)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
              
              {/* Crosshair target center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-48 rounded-full border border-dashed border-primary/30 flex items-center justify-center animate-spin-slow">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              </div>

              {/* HUD Header Readouts */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="px-3 py-1 rounded bg-black/60 backdrop-blur border border-primary/40 font-mono text-xs text-primary">
                  TARGET: STRIKE ZONE
                </div>
                <div className="px-3 py-1 rounded bg-black/60 backdrop-blur border border-white/20 font-mono text-xs text-white/80">
                  GUARD COVERAGE: 94%
                </div>
              </div>

              {/* Simulated Skeleton Tracking */}
              <div className="relative z-10 text-center py-12">
                <div className="inline-block p-4 rounded-2xl bg-black/60 backdrop-blur border border-primary/30 text-white">
                  <div className="font-mono text-xs text-primary mb-1">REAL-TIME BIOMETRIC READOUT</div>
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-wider">
                    8.4 <span className="text-sm font-normal text-white/60">m/s</span>
                  </div>
                  <div className="text-[11px] text-white/60 mt-1">PEAK JAB SNAP ACCELERATION</div>
                </div>
              </div>

              {/* HUD Footer Readouts */}
              <div className="relative z-10 grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-black/70 border border-white/10 text-center">
                  <span className="text-white/40 block">LATENCY</span>
                  <span className="text-primary font-bold">24ms</span>
                </div>
                <div className="p-2 rounded bg-black/70 border border-white/10 text-center">
                  <span className="text-white/40 block">ELBOW ANGLE</span>
                  <span className="text-white font-bold">89.4°</span>
                </div>
                <div className="p-2 rounded bg-black/70 border border-white/10 text-center">
                  <span className="text-white/40 block">CHIN SHIELD</span>
                  <span className="text-primary font-bold">LOCKED</span>
                </div>
              </div>
            </div>

            {/* Side Metric Explanations */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase mb-1">
                  <Activity className="w-4 h-4" /> Strike Velocity Meter
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Computes meters-per-second acceleration vector from wrist release to peak impact lock. Compare your left jab snap against pro benchmarks.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase mb-1">
                  <Crosshair className="w-4 h-4" /> Guard Integrity Radar
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Tracks distance between glove landmarks and zygomatic facial points. Alert rings immediately if a punch causes you to drop your opposite hand.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase mb-1">
                  <Lock className="w-4 h-4" /> 100% Client-Side Privacy
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Raw camera feeds never leave your browser or device. All pose estimation tensors execute client-side via hardware-accelerated WebGL.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Engineering Precision For Combat Athletes
          </h2>
          <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto">
            Traditional shadow boxing leaves you guessing. SparAI quantifies every millimeter of movement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-primary/40 transition-colors">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Pose Landmark Triangulation</h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Maps shoulders, elbows, wrists, hips, and knees simultaneously to evaluate kinetic chain rotation and posture tilt.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-primary/40 transition-colors">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Historical Velocity Tracking</h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Track how your punch speed progresses over weeks of training. See if fatigue slows your output in round 5 vs round 1.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-primary/40 transition-colors">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Flaw & Telegraph Detection</h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Identifies pre-punch tells such as loading hands back before firing or flaring elbows, which give away strikes in sparring.
            </p>
          </div>
        </div>
      </section>

      {/* Conversion Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/30 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Ready to See Your Punch Speed on Screen?
            </h3>
            <p className="text-sm text-white/70 max-w-xl">
              No downloads or credit card required. Enable your camera and experience the future of boxing training.
            </p>
          </div>

          <Link
            href="/login"
            className="shrink-0 px-8 py-4 rounded-2xl bg-primary text-black font-extrabold uppercase tracking-wider text-sm hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(226,255,59,0.4)]"
          >
            Launch AI Vision Camera
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
