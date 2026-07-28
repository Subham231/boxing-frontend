import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap, Target, Activity, ShieldCheck, ChevronRight } from 'lucide-react';
import HomeCta from '@/components/home/HomeCta';

export const metadata: Metadata = {
  title: 'Sparai - AI Boxing Coach & Reflex Trainer',
  description:
    'Sparai is an AI-powered boxing coach: personalized training programs, real-time form analysis, reflex drills, and weekly performance tracking to help you train smarter and box better.',
};

const FEATURES = [
  {
    icon: Target,
    title: 'Personalized Programs',
    body: 'Structured boxing programs built around your goals, experience level, and schedule — not a generic workout list.',
  },
  {
    icon: Activity,
    title: 'AI Form & Reflex Analysis',
    body: 'Real-time computer-vision feedback on technique, plus reflex drills that track your reaction time over the weeks.',
  },
  {
    icon: ShieldCheck,
    title: 'Progress You Can See',
    body: 'Weekly rankings, streaks, and a training roadmap so you always know what to work on next.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
      <header className="max-w-5xl mx-auto flex items-center justify-between px-5 sm:px-6 py-5 sm:py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-black tracking-[3px] uppercase">Sparai</span>
        </div>
        <nav className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/50">
          <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-6">
        <section className="py-10 sm:py-16 md:py-24 flex flex-col items-start gap-5 sm:gap-6">
          <span className="text-[10px] font-black tracking-[3px] text-primary uppercase">
            AI Boxing Protocol
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black italic uppercase leading-[0.95] tracking-tighter">
            Sparai is your <span className="text-primary">AI boxing coach.</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl font-medium">
            Sparai helps boxers of every level train smarter. Get a personalized training
            program, real-time AI feedback on your form using your phone&apos;s camera, reflex
            drills that sharpen your reaction time, and a weekly roadmap that keeps you
            progressing — all in one app.
          </p>
          <div className="w-full sm:w-auto">
            <HomeCta />
          </div>
        </section>

        <section className="py-8 sm:py-12 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-6 border-t border-white/10">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-3 py-4 sm:py-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">{title}</h2>
              <p className="text-white/50 text-sm leading-relaxed font-medium">{body}</p>
            </div>
          ))}
        </section>

        <section className="py-8 sm:py-12 border-t border-white/10">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-5 sm:mb-6">How Sparai works</h2>
          <ol className="flex flex-col gap-3 sm:gap-4 text-white/60 text-sm font-medium leading-relaxed">
            <li><span className="text-primary font-black">1.</span> Sign up with your phone number — we verify it with a one-time code, no passwords.</li>
            <li><span className="text-primary font-black">2.</span> Tell us your goals and experience level so your program is built around you.</li>
            <li><span className="text-primary font-black">3.</span> Train with guided sessions, AI form checks, and reflex drills.</li>
            <li><span className="text-primary font-black">4.</span> Track your progress weekly and keep climbing the leaderboard.</li>
          </ol>
        </section>

        <footer className="py-8 sm:py-12 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-white/30 text-xs font-semibold">© {new Date().getFullYear()} Sparai. All rights reserved.</p>
          <Link
            href="/onboarding"
            className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-1 transition-colors"
          >
            Open the app <ChevronRight size={14} />
          </Link>
        </footer>
      </main>
    </div>
  );
}