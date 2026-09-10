import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  Camera, 
  Zap, 
  Calendar, 
  Bot, 
  Trophy, 
  BarChart3, 
  ArrowRight, 
  Check, 
  X,
  Layers
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Platform Features: AI Boxing Coach, Vision & Reflex Drills | SparAI',
  description: 'Explore the full SparAI ecosystem: AI computer vision video analysis, interactive reflex training drills, intelligent workout roadmaps, and AI cornerman advice.',
  keywords: [
    'ai boxing features',
    'boxing app features',
    'reflex trainer boxing',
    'sparai features',
    'ai workout planner boxing',
    'ai corner coach'
  ],
  alternates: {
    canonical: 'https://sparai.in/features',
  },
  openGraph: {
    title: 'SparAI Platform Features: The All-In-One AI Boxing Coach',
    description: 'Explore computer vision punch meters, reflex reaction drills, AI sparring coach, and tailored training plans.',
    url: 'https://sparai.in/features',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Features' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SparAI Platform Features: The All-In-One AI Boxing Coach',
    description: 'AI vision analytics, reflex trainer, adaptive workout planner, and AI corner coach.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FeaturesIndexPage() {
  const jsonLdCollection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'SparAI Platform Features',
    description: 'Complete breakdown of AI boxing vision analysis, reflex reaction drills, and personalized fight training plans.',
    url: 'https://sparai.in/features',
  };

  const featureList = [
    {
      id: 'vision',
      title: 'AI Video Analysis & Biometrics',
      tag: 'Flagship Vision Engine',
      description: 'Zero hardware required. Your device camera tracks 33 skeletal joint coordinates to calculate punch snap velocity, guard coverage, and shoulder rotation angle.',
      link: '/features/ai-video-analysis',
      linkText: 'Explore Vision Engine',
      icon: Camera,
      badge: 'Real-time 60 FPS',
    },
    {
      id: 'reflex',
      title: 'Tactical Reflex Trainer',
      tag: 'Reaction Speed Drills',
      description: 'Audio-visual dynamic triggers simulate oncoming strikes. Tests your defensive slip latency, duck timing, and immediate counter-punch response in milliseconds.',
      link: '/reflex',
      linkText: 'Try Reflex Trainer',
      icon: Zap,
      badge: 'Sub-300ms Tracking',
    },
    {
      id: 'planner',
      title: 'Smart Workout Planner',
      tag: 'Adaptive Progression',
      description: 'Generates weekly periodized training splits customized to your current skill level, whether you are conditioning for endurance, knockout power, or beginner fundamentals.',
      link: '/planner',
      linkText: 'Generate Training Plan',
      icon: Calendar,
      badge: 'Auto-Adjusting',
    },
    {
      id: 'guru',
      title: 'Spar Guru: AI Corner Coach',
      tag: 'Combat Knowledge Base',
      description: 'Trained on decades of championship boxing strategy, style breakdowns (Peek-a-boo, Philly Shell, Out-boxer), fight nutrition, and recovery science.',
      link: '/guru',
      linkText: 'Consult Spar Guru',
      icon: Bot,
      badge: '24/7 AI Corner',
    },
    {
      id: 'analytics',
      title: 'Fighter Analytics & Metrics',
      tag: 'Velocity & Form Logs',
      description: 'Every round is logged. Monitor your punch volume per round, average strike velocity progression, streak consistency, and personal best records.',
      link: '/analytics',
      linkText: 'View Analytics Dashboard',
      icon: BarChart3,
      badge: 'Biometric Records',
    },
    {
      id: 'arena',
      title: 'Fighter Rank & Leaderboard',
      tag: 'Global Competition',
      description: 'Climb the global ranks from White Collar to Contender and Championship belt tier as your consistency and reflex reaction speeds sharpen.',
      link: '/leaderboard',
      linkText: 'Check Global Leaderboard',
      icon: Trophy,
      badge: 'Tier Progression',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdCollection) }}
      />

      <SeoNav currentPageTitle="Features" />

      {/* Header */}
      <section className="relative py-16 sm:py-24 border-b border-white/10 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <Layers className="w-3.5 h-3.5" /> Next-Generation Combat Suite
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            The Complete AI Boxing & <span className="text-primary">Combat Engine</span>
          </h1>

          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            From computer vision punch analysis to interactive reflex training and intelligent roadmaps—discover everything built to make you a more lethal striker.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureList.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between hover:border-primary/50 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                      {feature.badge}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-mono text-primary uppercase tracking-wider block mb-1">
                      {feature.tag}
                    </span>
                    <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                      {feature.title}
                    </h2>
                  </div>

                  <p className="text-sm text-white/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10">
                  <Link
                    href={feature.link}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-white transition-colors"
                  >
                    <span>{feature.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Matrix Table */}
        <section className="mt-24 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Why Fighters Choose SparAI
            </h2>
            <p className="text-sm text-white/60">
              See how our AI vision stack compares to traditional training methods.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 glass-card">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/80 font-mono">
                  <th className="p-4 sm:p-6">Capability</th>
                  <th className="p-4 sm:p-6 text-primary font-bold">SparAI Platform</th>
                  <th className="p-4 sm:p-6 text-white/50">Generic Fitness Apps</th>
                  <th className="p-4 sm:p-6 text-white/50">Boxing Gym Alone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/70">
                <tr>
                  <td className="p-4 sm:p-6 font-semibold text-white">Punch Velocity Meter (m/s)</td>
                  <td className="p-4 sm:p-6 text-primary"><Check className="w-5 h-5" /></td>
                  <td className="p-4 sm:p-6 text-white/40"><X className="w-4 h-4" /></td>
                  <td className="p-4 sm:p-6 text-white/40"><X className="w-4 h-4" /></td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-6 font-semibold text-white">Real-Time Camera Guard Alerts</td>
                  <td className="p-4 sm:p-6 text-primary"><Check className="w-5 h-5" /></td>
                  <td className="p-4 sm:p-6 text-white/40"><X className="w-4 h-4" /></td>
                  <td className="p-4 sm:p-6 text-white/60">Only with paid private coach</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-6 font-semibold text-white">Zero Extra Equipment / Hardware</td>
                  <td className="p-4 sm:p-6 text-primary"><Check className="w-5 h-5" /></td>
                  <td className="p-4 sm:p-6 text-white/40"><Check className="w-5 h-5 text-white/60" /></td>
                  <td className="p-4 sm:p-6 text-white/40"><X className="w-4 h-4" /></td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-6 font-semibold text-white">Millisecond Reflex Latency Drills</td>
                  <td className="p-4 sm:p-6 text-primary"><Check className="w-5 h-5" /></td>
                  <td className="p-4 sm:p-6 text-white/40"><X className="w-4 h-4" /></td>
                  <td className="p-4 sm:p-6 text-white/40"><X className="w-4 h-4" /></td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-6 font-semibold text-white">24/7 AI Corner Boxing Advice</td>
                  <td className="p-4 sm:p-6 text-primary"><Check className="w-5 h-5" /></td>
                  <td className="p-4 sm:p-6 text-white/40"><X className="w-4 h-4" /></td>
                  <td className="p-4 sm:p-6 text-white/40"><X className="w-4 h-4" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <SeoFooter />
    </div>
  );
}
