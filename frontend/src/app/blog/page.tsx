import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { 
  BookOpen, 
  Clock, 
  ArrowRight, 
  Flame, 
  Target, 
  Home, 
  Sparkles, 
  Calendar
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Boxing Guides & Shadow Boxing Workouts | SparAI Blog',
  description: 'Free boxing training guides, shadow boxing routines, punch technique tutorials, and combat conditioning blueprints designed by AI coaches.',
  keywords: [
    'boxing guides',
    'boxing blog',
    'shadow boxing tutorials',
    'boxing workouts at home',
    'how to box',
    'boxing drills and combos'
  ],
  alternates: {
    canonical: 'https://sparai.in/blog',
  },
  openGraph: {
    title: 'Boxing Guides & Workouts | SparAI Training Lab',
    description: 'Master boxing fundamentals, shadow boxing routines, and at-home fight conditioning.',
    url: 'https://sparai.in/blog',
    siteName: 'SparAI',
    images: [{ url: '/logo.jpg', width: 1080, height: 1080, alt: 'SparAI Guides' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boxing Guides & Workouts | SparAI Training Lab',
    description: 'Master boxing fundamentals, shadow boxing routines, and at-home fight conditioning.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BlogIndexPage() {
  const jsonLdBlog = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'SparAI Combat & Boxing Guides',
    description: 'Practical training guides, workouts, and tutorials for boxers, combat athletes, and fitness enthusiasts.',
    url: 'https://sparai.in/blog',
  };

  const articles = [
    {
      slug: '/blog/boxing-for-beginners',
      title: 'Boxing for Beginners: The Complete Guide to Stance, Punches, and Fundamentals',
      description: 'Master orthodox and southpaw stances, the 4 core punches (jab, cross, hook, uppercut), defensive slips, and avoid top beginner traps.',
      readTime: '8 min read',
      tag: 'Fundamentals',
      icon: Target,
      featured: true,
      date: 'March 2026',
    },
    {
      slug: '/blog/boxing-training-at-home',
      title: 'Boxing Training at Home: The Complete No-Equipment Blueprint',
      description: 'Transform any 6x6 room into an elite fight gym. Structured 30-minute rounds, calisthenics supersets, and camera positioning guide.',
      readTime: '7 min read',
      tag: 'Home Training',
      icon: Home,
      featured: false,
      date: 'March 2026',
    },
    {
      slug: '/blog/shadow-boxing-workout',
      title: 'The Ultimate Shadow Boxing Workout: 15, 30 & 45-Minute Routines',
      description: 'High-intensity protocols to burn fat, build hand speed, and master the 6-punch combination system without gear.',
      readTime: '6 min read',
      tag: 'Conditioning',
      icon: Flame,
      featured: false,
      date: 'March 2026',
    },
    {
      slug: '/blog/boxing-defense-techniques',
      title: 'Boxing Defense Techniques: Slips, Rolls, Pulls & Guard Styles',
      description: 'Master head movement, slipping straight punches, rolling under hooks, and compare High Guard vs Philly Shell.',
      readTime: '8 min read',
      tag: 'Defense',
      icon: Target,
      featured: false,
      date: 'March 2026',
    },
    {
      slug: '/blog/heavy-bag-workout-routines',
      title: 'Heavy Bag Workout Routines: The 8-Round Fighter Protocol',
      description: 'Championship 8-round punching bag circuits designed for knockout power, combination endurance, and wrist safety.',
      readTime: '7 min read',
      tag: 'Power & Bag',
      icon: Home,
      featured: false,
      date: 'March 2026',
    },
    {
      slug: '/blog/boxing-footwork-drills',
      title: 'Boxing Footwork Drills: Master Balance, Pivots & Ring Generalship',
      description: 'Learn step-and-slide mechanics, 90-degree front foot pivots, corner box drills, and cutting off the ring.',
      readTime: '6 min read',
      tag: 'Footwork',
      icon: Target,
      featured: false,
      date: 'March 2026',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col selection:bg-primary selection:text-black">
      <Script
        id="blog-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBlog) }}
      />

      <SeoNav currentPageTitle="Guides & Articles" />

      {/* Hero Header */}
      <section className="relative py-16 sm:py-24 border-b border-white/10 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest">
            <BookOpen className="w-3.5 h-3.5" /> Fight Knowledge Base
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Boxing Guides, Routines & <span className="text-primary">Training Blueprints</span>
          </h1>

          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            Practical tutorials and workouts developed by boxing coaches and biomechanical AI engineers. Zero fluff. 100% actionable.
          </p>
        </div>
      </section>

      {/* Main Articles List */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => {
            const Icon = article.icon;
            return (
              <article
                key={article.slug}
                className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between hover:border-primary/50 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-primary">
                      {article.tag}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.readTime}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {article.date}</span>
                    </div>

                    <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-2">
                      <Link href={article.slug}>
                        {article.title}
                      </Link>
                    </h2>

                    <p className="text-sm text-white/60 leading-relaxed line-clamp-3">
                      {article.description}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10">
                  <Link
                    href={article.slug}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-white transition-colors"
                  >
                    <span>Read Complete Guide</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* AI Camera Callout */}
        <section className="mt-20 p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/30 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-primary uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Real-Time Form Correction
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Stop Guessing If Your Punches Are Clean
            </h3>
            <p className="text-sm text-white/70 max-w-xl">
              Our free AI video camera measures your punch velocity, checks guard height, and spots mechanical flaws in real time.
            </p>
          </div>

          <Link
            href="/login"
            className="shrink-0 px-8 py-4 rounded-2xl bg-primary text-black font-extrabold uppercase tracking-wider text-sm hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(226,255,59,0.35)]"
          >
            Try Free AI Camera
          </Link>
        </section>
      </main>

      <SeoFooter />
    </div>
  );
}
