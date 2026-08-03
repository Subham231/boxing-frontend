import type { Metadata } from 'next';
import HomeContent from '@/components/home/HomeContent';

const SITE_URL = 'https://sparai.in';
const OG_DESCRIPTION =
  'Personalized boxing training programs, real-time AI form analysis, reflex drills, and weekly performance tracking — all in one app.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Sparai - AI Boxing Coach & Reflex Trainer',
  description:
    'Sparai is an AI-powered boxing coach: personalized training programs, real-time form analysis, reflex drills, and weekly performance tracking to help you train smarter and box better.',
  keywords: [
    'boxing training app',
    'AI boxing coach',
    'reflex trainer',
    'boxing form analysis',
    'boxing workout planner',
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Sparai — AI Boxing Coach & Reflex Trainer',
    description: OG_DESCRIPTION,
    url: SITE_URL,
    siteName: 'Sparai',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sparai — AI Boxing Coach & Reflex Trainer',
    description: OG_DESCRIPTION,
  },
};

export default function HomePage() {
  return <HomeContent />;
}