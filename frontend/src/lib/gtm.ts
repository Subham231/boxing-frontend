'use client';

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-TWLX8P7R';

declare global {
  interface Window {
    dataLayer: Record<string, any>[];
  }
}

/**
 * Pushes an event and payload to Google Tag Manager dataLayer.
 * Safe to call in both client and server environments (no-op on server).
 */
export function pushToDataLayer(event: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...params,
  });
}

/**
 * Tracks virtual pageviews on client-side route transitions in Next.js
 */
export function trackPageView(url: string, title?: string) {
  pushToDataLayer('page_view', {
    page_path: url,
    page_title: title || (typeof document !== 'undefined' ? document.title : ''),
    page_location: typeof window !== 'undefined' ? window.location.href : '',
  });
}

/**
 * Specific tracking for the onboarding funnel
 */
export function trackOnboardingStep(
  stepNumber: number,
  stepName: string,
  progressPercent: number,
  metadata?: Record<string, any>
) {
  pushToDataLayer('onboarding_step_view', {
    step_number: stepNumber,
    step_name: stepName,
    progress_percent: progressPercent,
    ...metadata,
  });
}

export function trackOnboardingEmailSubmitted(emailDomain?: string) {
  pushToDataLayer('onboarding_email_submit', {
    email_domain: emailDomain,
    timestamp: Date.now(),
  });
}

export function trackOnboardingEmailVerified() {
  pushToDataLayer('onboarding_email_verified', {
    timestamp: Date.now(),
  });
}

export function trackOnboardingCompleted(data?: Record<string, any>) {
  pushToDataLayer('onboarding_complete', {
    ring_name: data?.ringName,
    primary_goal: data?.primary_goal,
    experience_level: data?.experience_level,
    days_per_week: data?.daysPerWeek,
    timestamp: Date.now(),
  });
}

/**
 * Tracking for Authentication events
 */
export function trackAuthEvent(
  action: 'signup_link_sent' | 'login_link_sent' | 'google_login_started' | 'google_login_success' | 'sign_out',
  params?: Record<string, any>
) {
  pushToDataLayer(action, {
    timestamp: Date.now(),
    ...params,
  });
}

/**
 * Tracking for Subscription & Monetization events
 */
export function trackSubscriptionEvent(
  action: 'view_subscription_plans' | 'select_plan' | 'begin_checkout' | 'checkout_completed',
  params?: Record<string, any>
) {
  pushToDataLayer(action, {
    timestamp: Date.now(),
    ...params,
  });
}
