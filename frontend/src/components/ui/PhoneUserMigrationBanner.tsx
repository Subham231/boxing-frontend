'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, KeyRound } from 'lucide-react';
import { useFirebaseUser } from '@/lib/useFirebaseUser';
import { useMyProfile } from '@/lib/profile-client';
import { isPhoneOnlyUser } from '@/lib/firebase-auth';

interface PhoneUserMigrationBannerProps {
  className?: string;
}

export function PhoneUserMigrationBanner({ className = '' }: PhoneUserMigrationBannerProps) {
  const { user, loading } = useFirebaseUser();
  const { profile } = useMyProfile();

  // Only show if the user is ALREADY logged in AND has no email on the account.
  // Explicitly return null while auth is loading or when there is no session.
  if (loading || !user) return null;

  const isPhoneOnly = isPhoneOnlyUser(user) || (profile && !profile.email);

  if (!isPhoneOnly) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/20 via-black/80 to-primary/10 p-4 shadow-[0_0_20px_rgba(226,255,59,0.15)] backdrop-blur-md ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/20 text-primary shadow-[0_0_12px_rgba(226,255,59,0.3)]">
          <ShieldAlert className="h-5 w-5 animate-pulse" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-primary">
              Action Required
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">
              Phone Account
            </span>
          </div>

          <h3 className="mt-1 text-sm font-black uppercase italic tracking-tight text-white">
            Secure Your Account with Email &amp; Password
          </h3>

          <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/70">
            SMS verification is not available on this web app. Add an email &amp; password now so you can always log into your account, keeping all your streaks and scores safe.
          </p>

          <div className="mt-3">
            <Link
              href="/account/link-email"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-[#10130a] shadow-[0_0_15px_rgba(226,255,59,0.4)] transition-all hover:bg-[#d4f52e] hover:shadow-[0_0_20px_rgba(226,255,59,0.6)] active:scale-95"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Add Email &amp; Password
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
