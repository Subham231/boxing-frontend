// A single account is "active" if either the new plan-based entitlement or
// the legacy subscription_until column is set and in the future. The new
// payment system writes to plan/plan_expires_at; older profiles and referral
// rewards may still write to subscription_until, so we check both until the
// old column is fully migrated away.
export function isSubscriptionActive(
  profile: { subscription_until?: string | null; plan_expires_at?: string | null; current_period_end?: string | null; subscription_status?: string | null; plan?: string | null } | null | undefined,
): boolean {
  if (!profile || !profile.plan) return false;

  if (profile.plan === 'referral_reward') {
    return !!profile.plan_expires_at && new Date(profile.plan_expires_at).getTime() > Date.now();
  }

  if (profile.subscription_status && ['expired', 'completed', 'created', 'inactive'].includes(profile.subscription_status)) {
    return false;
  }

  const now = Date.now();
  if (profile.current_period_end && new Date(profile.current_period_end).getTime() > now) return true;
  if (profile.plan_expires_at && new Date(profile.plan_expires_at).getTime() > now) return true;
  if (profile.subscription_until && new Date(profile.subscription_until).getTime() > now) return true;
  return false;
}

// Routes that must stay reachable even for an inactive account — otherwise
// the subscription gate itself, or the subscription page meant to fix the
// problem, would be unreachable (an infinite redirect loop) or the person
// couldn't even log out.
export const SUBSCRIPTION_GATE_EXEMPT_PATHS = ['/subscription', '/settings', '/spar', '/checkout', '/legal'];

export function isExemptFromSubscriptionGate(pathname: string): boolean {
  return SUBSCRIPTION_GATE_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
}
