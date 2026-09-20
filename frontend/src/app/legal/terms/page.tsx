'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 font-sans relative">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex justify-between items-center border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-primary/50 flex items-center justify-center text-primary bg-primary/10">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-primary tracking-widest uppercase block">SPARAI LEGAL</span>
              <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">Terms & Conditions</h1>
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
              Please read these Terms & Conditions carefully before using the <strong>SparAI</strong> web application. By accessing or using the platform, you agree to be bound by these terms.
            </p>
          </GlassCard>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">1. Account and Security</h2>
          <p>
            To use certain features of SparAI, you must sign in using your mobile number and authenticate via one-time password (OTP). You are responsible for all activities that occur under your session and for keeping your device secure.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">2. Subscriptions and Payments</h2>
          <div className="flex flex-col gap-3">
            <p>
              <strong>Pricing & Billing:</strong> Certain features are paid subscription services (&quot;Pro Plans&quot;). You agree to pay the fees associated with the subscription plan you select. Recurring charges are collected by Razorpay according to the plan you choose until you cancel.
            </p>
            <p>
              <strong>Razorpay Integration:</strong> Payment transactions are executed using the Razorpay gateway. Subscription access is activated only after Razorpay confirms a successful payment (webhook and/or verified checkout). Failed or incomplete payments do not extend your billed period.
            </p>
            <p>
              <strong>Cancellation:</strong> You may cancel auto-renewal at any time in the app. Cancellation stops future charges. Access continues until the end of the current paid period confirmed by Razorpay. No further access is granted after that date unless you subscribe again.
            </p>
            <p>
              <strong>Refunds:</strong> Refund requests are handled in line with applicable Indian consumer protection rules and Razorpay&apos;s settlement process. Contact <span className="text-primary">spar.ai.support@gmail.com</span> with your registered phone number and Razorpay payment ID. Approved refunds are processed to the original payment method. Usage already consumed in a billed period is not automatically extra-credited.
            </p>
            <p>
              <strong>Invoices & GST:</strong> Payment receipts/invoices are issued through Razorpay. If you need a GST invoice, email the same address with your GSTIN and billing details. We will add our GSTIN to invoices once it is registered on this page.
            </p>
          </div>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">3. Acceptable Use</h2>
          <p>
            You agree not to use SparAI for any unlawful purposes, or to disrupt or interfere with the security or operation of the service. Any attempt to reverse engineer, scrape, or extract our AI algorithms is strictly prohibited.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">4. Intellectual Property</h2>
          <p>
            All content, including but not limited to the AI training algorithms, roadmap generation logic, brand elements, UI designs, and user interface features, are the exclusive property of <strong>SparAI</strong> and are protected by applicable intellectual property laws.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">5. Disclaimer & Limitation of Liability</h2>
          <p>
            SparAI provides general boxing coaching and fitness roadmaps generated by AI. It is not a substitute for professional medical advice or physical coaching. You participate in training and fitness routines at your own risk. SparAI is not liable for any physical injury, property damage, or financial loss resulting from the use of our services.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">6. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be posted on this page with an updated &quot;Last Updated&quot; date. Continued use of the platform constitutes agreement to the updated terms.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">7. Contact</h2>
          <p>
            If you have any questions about these Terms & Conditions, please contact us at <span className="text-primary">spar.ai.support@gmail.com</span>.
          </p>

          <NeonButton onClick={() => router.back()} className="w-full h-14 mt-6 font-black uppercase text-xs tracking-widest">
            Back to Application
          </NeonButton>
        </main>
      </div>
    </div>
  );
}
