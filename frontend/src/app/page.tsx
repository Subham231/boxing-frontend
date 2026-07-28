import type { Metadata } from 'next';
import HomeContent from '@/components/home/HomeContent';

export const metadata: Metadata = {
  title: 'Sparai - AI Boxing Coach & Reflex Trainer',
  description:
    'Sparai is an AI-powered boxing coach: personalized training programs, real-time form analysis, reflex drills, and weekly performance tracking to help you train smarter and box better.',
};

export default function HomePage() {
  return <HomeContent />;
}