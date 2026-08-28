'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, MapPin, ExternalLink } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function ContactPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 font-sans relative">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex justify-between items-center border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-primary/50 flex items-center justify-center text-primary bg-primary/10">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-primary tracking-widest uppercase block">SPARAI LEGAL</span>
              <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">Contact Us</h1>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </header>

        <main className="flex flex-col gap-6 text-sm text-white/80 leading-relaxed font-semibold">
          <GlassCard className="border-white/5 bg-black/40 p-6 flex flex-col gap-4">
            <h2 className="text-sm font-black uppercase text-white tracking-wider">SparAI Customer Support</h2>
            <p>
              We're here to help. If you have questions about your subscription, technical issues, or billing errors, please reach out to our team.
            </p>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <GlassCard className="border-white/5 bg-black/40 p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Email Support</span>
              </div>
              <p className="text-white/60 text-xs font-semibold">
                For account assistance, billing questions, and general inquiries:
              </p>
              <a href="mailto:spar.ai.support@gmail.com" className="text-white text-base font-black tracking-tight hover:underline flex items-center gap-1.5 mt-2">
                spar.ai.support@gmail.com <ExternalLink className="w-4 h-4 text-primary" />
              </a>
            </GlassCard>

            <GlassCard className="border-white/5 bg-black/40 p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Headquarters</span>
              </div>
              <p className="text-white/60 text-xs font-semibold">
                SparAI Operations Team:
              </p>
              <p className="text-white font-black text-sm uppercase tracking-wider mt-2 leading-relaxed">
                SparAI Headquarters<br />
                Greater Noida, India
              </p>
            </GlassCard>
          </div>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">Response Time</h2>
          <p>
            We strive to respond to all support requests within <strong>24 to 48 hours</strong> on business days. For urgent billing issues regarding duplicate payments, please include the word "URGENT" and your transaction references in the email subject.
          </p>

          <NeonButton onClick={() => router.back()} className="w-full h-14 mt-6 font-black uppercase text-xs tracking-widest">
            Back to Application
          </NeonButton>
        </main>
      </div>
    </div>
  );
}
