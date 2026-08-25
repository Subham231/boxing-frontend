'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function RefundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 font-sans relative">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex justify-between items-center border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-primary/50 flex items-center justify-center text-primary bg-primary/10">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-primary tracking-widest uppercase block">SPARAI LEGAL</span>
              <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">Refund & Cancellation</h1>
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
              Thank you for subscribing to <strong>SparAI</strong>. Please review our policy regarding cancellations and refunds below.
            </p>
          </GlassCard>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">1. Strict No-Refund Policy</h2>
          <p>
            Except as explicitly stated in Section 2, all subscription purchases made on SparAI are final and non-refundable. Since our service provides instant digital access to personalized AI training plans and elite coaching tools, we do not offer refunds once a transaction is successfully processed.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">2. Exceptions (Billing Errors)</h2>
          <div className="flex flex-col gap-3">
            <p>
              We want to ensure a fair experience. We will process a refund under the following conditions:
            </p>
            <ul className="list-disc list-inside pl-4 flex flex-col gap-2">
              <li>
                <strong>Duplicate Payments:</strong> If you are accidentally charged multiple times for a single subscription cycle due to a technical error.
              </li>
              <li>
                <strong>Failed Transactions:</strong> If your account is debited but the subscription service fails to activate within 24 hours of payment validation.
              </li>
            </ul>
            <p>
              In such cases, you must notify us at <span className="text-primary">sk.ish24@gmail.com</span> with details of your payment reference (such as the Razorpay payment ID) within <strong>7 days</strong> of the transaction.
            </p>
          </div>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">3. Subscription Cancellation</h2>
          <p>
            You can cancel your subscription at any time. When you cancel, your premium access will remain active until the end of your current billing period. No future automatic renewals or charges will occur after cancellation.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">4. Processing of Refunds</h2>
          <p>
            Approved billing error refunds will be credited back to the original payment source (credit card, bank account, UPI, etc.) used at the time of purchase. Refund processing times usually vary between <strong>5 to 7 business days</strong>, depending on bank and gateway (Razorpay) policies.
          </p>

          <h2 className="text-lg font-black uppercase text-primary tracking-wider mt-4">5. Contact Support</h2>
          <p>
            If you believe you have been billed in error, please contact us promptly at <span className="text-primary">sk.ish24@gmail.com</span>.
          </p>

          <NeonButton onClick={() => router.back()} className="w-full h-14 mt-6 font-black uppercase text-xs tracking-widest">
            Back to Application
          </NeonButton>
        </main>
      </div>
    </div>
  );
}
