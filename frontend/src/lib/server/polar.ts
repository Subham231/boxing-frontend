// SERVER-ONLY. Polar REST/SDK helpers — the Polar equivalent of
// lib/server/razorpay.ts. Never import this from a 'use client' component:
// POLAR_ACCESS_TOKEN and POLAR_WEBHOOK_SECRET must never reach the browser
// bundle. Uses the official @polar-sh/sdk rather than hand-rolled fetch
// calls, since Polar's webhook signature scheme (Standard Webhooks,
// HMAC-SHA256 over "{webhook-id}.{webhook-timestamp}.{body}", with a
// secret-encoding subtlety around the `whsec_` prefix) is easy to get
// subtly wrong by hand — the SDK's validateEvent() is the "don't invent
// webhook payloads" safe choice here.
import { Polar } from '@polar-sh/sdk';

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN || '';
const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET || '';
const POLAR_ORGANIZATION_ID = process.env.POLAR_ORGANIZATION_ID || '';
const POLAR_SERVER: 'sandbox' | 'production' =
  process.env.POLAR_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';

export function polarConfigured(): boolean {
  return Boolean(POLAR_ACCESS_TOKEN && POLAR_WEBHOOK_SECRET);
}

let _client: Polar | null = null;
function client(): Polar {
  if (!_client) {
    _client = new Polar({ accessToken: POLAR_ACCESS_TOKEN, server: POLAR_SERVER });
  }
  return _client;
}

export interface CreatePolarCheckoutOpts {
  productId: string;
  uid: string;
  planId: string;
  successUrl: string;
  customerEmail?: string;
}

/**
 * Creates a Polar checkout session for one product and returns the hosted
 * checkout URL. external_customer_id ties the session back to the Firebase
 * UID so the webhook can resolve the user without guessing; metadata is a
 * belt-and-suspenders second link to the same UID/plan.
 */
export async function createPolarCheckout(opts: CreatePolarCheckoutOpts) {
  const checkout = await client().checkouts.create({
    products: [opts.productId],
    externalCustomerId: opts.uid,
    customerEmail: opts.customerEmail,
    successUrl: opts.successUrl,
    metadata: {
      sparai_uid: opts.uid,
      plan_id: opts.planId,
    },
  });
  return checkout; // { id, url, ... }
}

export async function getPolarCustomerByExternalId(uid: string) {
  try {
    return await client().customers.getExternal({ externalId: uid });
  } catch {
    return null;
  }
}

export async function getPolarSubscription(subscriptionId: string) {
  if (!subscriptionId) return null;
  try {
    return await client().subscriptions.get({ id: subscriptionId });
  } catch (err) {
    console.error('[polar] getPolarSubscription failed', err);
    return null;
  }
}

/**
 * Cancels at period end — mirrors the existing Razorpay cancel route's
 * cancel_at_cycle_end behavior so premium access is preserved until the
 * paid period actually ends. Verified against @polar-sh/sdk's actual
 * SubscriptionCancel type (cancelAtPeriodEnd is nested under
 * subscriptionUpdate, not a top-level field).
 */
export async function cancelPolarSubscription(subscriptionId: string) {
  return client().subscriptions.update({
    id: subscriptionId,
    subscriptionUpdate: { cancelAtPeriodEnd: true },
  });
}

export async function createPolarPortalSession(customerId: string) {
  try {
    return await client().customerSessions.create({ customerId });
  } catch (err) {
    console.error('[polar] createPolarPortalSession failed', err);
    return null;
  }
}

/**
 * Verifies + parses a raw webhook body. Throws on invalid signature —
 * callers must catch and return 401/403 without processing the payload.
 * IMPORTANT: pass the raw, unparsed request body (string/Buffer) exactly
 * as received — never JSON.parse-then-restringify before verification.
 */
export async function verifyPolarWebhook(rawBody: string, headers: Headers) {
  const { validateEvent } = await import('@polar-sh/sdk/webhooks');
  const headerObj: Record<string, string> = {};
  headers.forEach((value, key) => {
    headerObj[key] = value;
  });
  return validateEvent(rawBody, headerObj, POLAR_WEBHOOK_SECRET);
}

export { POLAR_ORGANIZATION_ID };
