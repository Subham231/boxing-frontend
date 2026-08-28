'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function SecurityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 font-sans relative">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex justify-between items-center border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-primary/50 flex items-center justify-center text-primary bg-primary/10">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-primary tracking-widest uppercase block">SPARAI LEGAL</span>
              <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">Security</h1>
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
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Last Updated: July 28, 2026</p>
            <p>
              Security is core to how <strong>Sparai</strong> is built. This page explains the
              practical measures we take to keep your account and data safe.
            </p>
          </GlassCard>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">1. Authentication</h2>
          <p>
            Sparai has no passwords to steal or leak. Sign-in is handled entirely through
            Firebase Phone Authentication with a one-time code sent to your number — every
            login is verified freshly, and we never store or see the code itself.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">2. Data in Transit & at Rest</h2>
          <p>
            All traffic between your device and our servers is encrypted over HTTPS/TLS.
            Profile and training data is stored in a managed Supabase Postgres database with
            row-level security enabled, and all writes go through authenticated server-side
            routes rather than directly from the app.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">3. Payments</h2>
          <p>
            Subscription payments are processed by <strong>Razorpay</strong>, a PCI-DSS
            compliant payment gateway. Sparai never sees or stores your card, UPI, or
            netbanking credentials — that information never touches our servers.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">4. Access Controls</h2>
          <p>
            Administrative access to production data is restricted, logged, and limited to
            what&apos;s needed to operate the service. Service credentials (database keys,
            signing keys) are kept server-side only and are never shipped to the browser.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">5. Reporting a Concern</h2>
          <p>
            If you believe you&apos;ve found a security issue or vulnerability, please email us
            immediately at <span className="text-primary">spar.ai.support@gmail.com</span> with details
            — we take these reports seriously and will respond promptly.
          </p>

          <NeonButton onClick={() => router.back()} className="w-full h-14 mt-6 font-black uppercase text-xs tracking-widest">
            Back to Application
          </NeonButton>
        </main>
      </div>
    </div>
  );
}