'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 font-sans relative">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex justify-between items-center border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-primary/50 flex items-center justify-center text-primary bg-primary/10">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-primary tracking-widest uppercase block">SPARAI LEGAL</span>
              <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">Privacy Policy</h1>
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
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Last Updated: July 22, 2026</p>
            <p>
              Welcome to <strong>SparAI</strong>. We value your privacy and are committed to protecting your personal data. This Privacy Policy describes how we collect, use, and share information when you use our services.
            </p>
          </GlassCard>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">1. Information We Collect</h2>
          <div className="flex flex-col gap-3">
            <p>
              <strong>Phone & OTP Authentication:</strong> We collect your mobile phone number to authenticate your identity via Firebase Phone Auth. We do not use traditional passwords.
            </p>
            <p>
              <strong>Training and Biometrics Data:</strong> Your training roadmaps, experience levels, goals, available equipment, height, and weight are processed to personalize your experience. Much of this data is stored in your device's local vault (LocalStorage).
            </p>
            <p>
              <strong>Payment Information:</strong> All payments are processed securely through our authorized payment gateway, <strong>Razorpay</strong>. We do not store or collect your payment card details or netbanking credentials on our servers.
            </p>
          </div>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">2. How We Use Your Information</h2>
          <p>
            We use the collected information to generate custom AI-based training plans, verify your identity via secure OTP, facilitate subscription payments through Razorpay, and improve the user experience of the SparAI platform.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">3. Data Sharing and Disclosures</h2>
          <p>
            We do not sell, rent, or trade your personal information. We share data only with third-party service providers (like Firebase for authentication and Razorpay for payment processing) to the extent necessary to deliver the service.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">4. Data Security & Storage</h2>
          <p>
            Your training history is stored locally in your device's browser vault. Profile metrics are synced to our secure database environment. However, no electronic transmission or storage method is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">5. Your Rights</h2>
          <p>
            You have the right to access, update, or request the deletion of your account and related phone data. You can completely purge all locally stored metrics directly inside the Settings menu by selecting "Reset Engine".
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">6. Contact Us</h2>
          <p>
            For any queries or concerns regarding this Privacy Policy, please reach out to us at <span className="text-primary">sk.ish24@gmail.com</span>.
          </p>

          <NeonButton onClick={() => router.back()} className="w-full h-14 mt-6 font-black uppercase text-xs tracking-widest">
            Back to Application
          </NeonButton>
        </main>
      </div>
    </div>
  );
}
