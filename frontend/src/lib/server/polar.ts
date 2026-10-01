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

/** Everything needed to receive webhooks (token + signing secret). */
export function polarConfigured(): boolean {
  return Boolean(POLAR_ACCESS_TOKEN && POLAR_WEBHOOK_SECRET);
}

/**
 * Creating a checkout only needs the access token. The webhook secret is for
 * verifying incoming webhooks, so a missing secret must not block checkout
 * (it used to, with a misleading "payment system is not configured").
 */
export function polarCheckoutConfigured(): boolean {
  return Boolean(POLAR_ACCESS_TOKEN);
}

export function polarEnvironment(): 'sandbox' | 'production' {
  return POLAR_SERVER;
}

/** Best-effort extraction of an HTTP status + readable detail from a Polar SDK error. */
export function describePolarError(err: unknown): { status: number | null; detail: string } {
  const e = err as { statusCode?: number; status?: number; message?: string; body?: unknown; detail?: unknown } | null;
  const status = typeof e?.statusCode === 'number' ? e.statusCode : typeof e?.status === 'number' ? e.status : null;
  let detail = e?.message || 'Unknown Polar error';
  const raw = e?.detail ?? e?.body;
  if (raw) {
    try {
      detail += ` | ${typeof raw === 'string' ? raw : JSON.stringify(raw)}`.slice(0, 600);
    } catch {
      /* ignore */
    }
  }
  return { status, detail };
}

/** Turns a Polar failure into something safe to show a customer. */
export function customerFacingPolarError(err: unknown): string {
  const { status } = describePolarError(err);
  if (status === 401 || status === 403) {
    return 'Payments are temporarily unavailable (payment provider authentication). Please contact support.';
  }
  if (status === 404) {
    return 'This plan is temporarily unavailable for checkout. Please contact support.';
  }
  return 'Could not start checkout. Please try again in a moment.';
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
  /** Lower-case ISO currency (e.g. 'usd', 'gbp') the checkout should be presented in. */
  currency?: string;
}

/**
 * Creates a Polar checkout session for one product and returns the hosted
 * checkout URL. external_customer_id ties the session back to the Firebase
 * UID so the webhook can resolve the user without guessing; metadata is a
 * belt-and-suspenders second link to the same UID/plan.
 */
export async function createPolarCheckout(opts: CreatePolarCheckoutOpts) {
  const build = (email: string | undefined, currency: string | undefined) => {
    const params: Record<string, unknown> = {
      products: [opts.productId],
      externalCustomerId: opts.uid,
      successUrl: opts.successUrl,
      metadata: {
        sparai_uid: opts.uid,
        plan_id: opts.planId,
      },
    };
    if (email) params.customerEmail = email;
    // Presentment currency. Only honoured by SDK/API versions that support
    // multi-currency products; otherwise Polar picks the currency itself.
    if (currency) params.currency = currency;
    return params;
  };

  // Attempts, most specific first. A 4xx (validation) failure falls through to
  // a simpler request instead of failing the purchase outright:
  //  - an email that already belongs to a Polar customer with a different
  //    external id is rejected by Polar; Polar then collects the email itself
  //  - a currency the product has no price for is rejected the same way
  const attempts: [string | undefined, string | undefined][] = [
    [opts.customerEmail, opts.currency],
    [undefined, opts.currency],
    [undefined, undefined],
  ];
  const seen = new Set<string>();
  let lastErr: unknown = null;
  for (const [email, currency] of attempts) {
    const key = `${email ?? ''}|${currency ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      return await client().checkouts.create(build(email, currency) as unknown as Parameters<Polar['checkouts']['create']>[0]);
    } catch (err) {
      lastErr = err;
      const { status, detail } = describePolarError(err);
      console.error(`[polar] checkout attempt failed (email=${!!email}, currency=${currency ?? '-'}) status=${status}: ${detail}`);
      if (status === null || status < 400 || status >= 500 || status === 401 || status === 403 || status === 404) break;
    }
  }
  throw lastErr;
}

/** Fetches a checkout session (used to confirm a purchase when the webhook is late or missing). */
export async function getPolarCheckout(checkoutId: string) {
  if (!checkoutId) return null;
  try {
    return await client().checkouts.get({ id: checkoutId });
  } catch (err) {
    console.error('[polar] getPolarCheckout failed', describePolarError(err).detail);
    return null;
  }
}

/**
 * Newest active/trialing subscription for a customer. Looked up by Polar
 * customer id when we have it, otherwise by the Firebase uid we registered as
 * the customer's external id at checkout.
 */
export async function findPolarSubscription(opts: {
  uid: string;
  customerId?: string | null;
  productId?: string | null;
}) {
  const time = (v: string | Date | null | undefined) => (v ? new Date(v).getTime() : 0);
  const filters: Record<string, unknown>[] = [];
  if (opts.customerId) filters.push({ customerId: opts.customerId });
  filters.push({ externalCustomerId: opts.uid });
  for (const filter of filters) {
    try {
      const result = await client().subscriptions.list({
        ...filter,
        ...(opts.productId ? { productId: opts.productId } : {}),
        active: true,
        limit: 10,
      } as unknown as Parameters<Polar['subscriptions']['list']>[0]);
      const items = ((result as unknown as { result?: { items?: unknown[] } })?.result?.items ?? []) as Array<{
        id?: string;
        startedAt?: string | Date | null;
        createdAt?: string | Date | null;
      }>;
      const best = [...items].sort((x, y) => time(y.startedAt ?? y.createdAt) - time(x.startedAt ?? x.createdAt))[0];
      if (best?.id) return best as { id: string };
    } catch (err) {
      console.error('[polar] findPolarSubscription failed', describePolarError(err).detail);
    }
  }
  return null;
}

/** Back-compat wrapper used by /api/subscription/status. */
export async function findPolarSubscriptionForUser(uid: string, productId?: string | null) {
  return findPolarSubscription({ uid, productId });
}

/**
 * Fixed prices on a Polar product, one entry per currency, in minor units
 * (cents/pence/...). This is the source of truth for what the customer will
 * actually be charged, so the app displays these instead of hard-coded numbers.
 */
export async function getPolarProductPrices(productId: string): Promise<{ currency: string; minor: number }[]> {
  if (!polarCheckoutConfigured() || !productId) return [];
  try {
    const product = (await client().products.get({ id: productId })) as unknown as { prices?: unknown[] };
    const out: { currency: string; minor: number }[] = [];
    const seen = new Set<string>();
    for (const raw of product.prices ?? []) {
      const price = raw as { isArchived?: boolean; amountType?: string; priceCurrency?: string; priceAmount?: number };
      if (price.isArchived) continue;
      if (price.amountType && price.amountType !== 'fixed') continue;
      const currency = String(price.priceCurrency || '').toUpperCase();
      if (!currency || typeof price.priceAmount !== 'number' || seen.has(currency)) continue;
      seen.add(currency);
      out.push({ currency, minor: price.priceAmount });
    }
    return out;
  } catch (err) {
    console.error(`[polar] getPolarProductPrices(${productId}) failed`, describePolarError(err).detail);
    return [];
  }
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
