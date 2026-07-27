// A single account is "active" purely based on reflex_profiles.subscription_until
// being set and in the future. Referral-earned free time (see claim_referral()
// in supabase/reflex-schema.sql) writes directly into this same column, so
// there's no separate "free days" concept to track — a referral reward and a
// paid month both just extend this one timestamp.
export function isSubscriptionActive(subscriptionUntil: string | null | undefined): boolean {
  if (!subscriptionUntil) return false;
  return new Date(subscriptionUntil).getTime() > Date.now();
}

// Routes that must stay reachable even for an inactive account — otherwise
// the subscription gate itself, or the checkout flow meant to fix the
// problem, would be unreachable (an infinite redirect loop) or the person
// couldn't even log out.
export const SUBSCRIPTION_GATE_EXEMPT_PATHS = ['/subscription', '/checkout', '/settings'];

export function isExemptFromSubscriptionGate(pathname: string): boolean {
  return SUBSCRIPTION_GATE_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
}
