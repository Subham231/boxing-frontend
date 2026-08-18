// SERVER-ONLY. Razorpay REST helpers used by webhook, reconcile, verify, cancel.

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export function razorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

export function razorpayAuthHeader(): string {
  return `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`;
}

export function publicRazorpayKeyId(): string {
  return RAZORPAY_KEY_ID;
}

export interface RazorpaySubscription {
  id: string;
  entity?: string;
  plan_id?: string;
  status?: string;
  current_start?: number | null;
  current_end?: number | null;
  notes?: Record<string, string>;
}

export interface RazorpayPayment {
  id: string;
  amount?: number;
  status?: string;
  subscription_id?: string;
  notes?: Record<string, string>;
}

async function razorpayGet<T>(path: string): Promise<T | null> {
  if (!razorpayConfigured()) return null;
  const res = await fetch(`https://api.razorpay.com/v1/${path}`, {
    headers: { Authorization: razorpayAuthHeader() },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export function fetchRazorpaySubscription(subscriptionId: string): Promise<RazorpaySubscription | null> {
  if (!subscriptionId || subscriptionId.startsWith('sub_mock_')) return Promise.resolve(null);
  return razorpayGet<RazorpaySubscription>(`subscriptions/${subscriptionId}`);
}

export function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment | null> {
  if (!paymentId || paymentId.startsWith('mock_')) return Promise.resolve(null);
  return razorpayGet<RazorpayPayment>(`payments/${paymentId}`);
}
