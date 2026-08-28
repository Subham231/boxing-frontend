import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

if (!keyId || !keySecret) {
    console.warn(
        '[razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET — ' +
        'payment routes will fail until these are set.'
    );
}

export const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
});

// ---------------------------------------------------------------------------
// SERVER-SIDE PLAN DEFINITIONS — the price and Razorpay plan_id for each tier
// live here, never on the client. A request from the browser only ever sends
// a `planId` string like "pro_monthly" — the backend looks up the real price
// itself. This is deliberate: if the amount were trusted from the client, a
// tampered request could pay ₹1 for a ₹999 plan.
//
// For recurring plans, create the matching Plan in the Razorpay Dashboard
// first (Subscriptions → Plans → Create Plan) and paste its plan_id below.
// For one-time plans, no dashboard step is needed — amountPaise is enough.
// ---------------------------------------------------------------------------

export type PlanId = 'pro_monthly' | 'pro_yearly';

export interface PlanDefinition {
    id: PlanId;
    label: string;
    type: 'subscription' | 'one_time';
    amountPaise: number;       // used directly for one_time plans, and for display/verification for subscriptions
    razorpayPlanId?: string;   // required for type: 'subscription' — from the Razorpay Dashboard
    billingCycles?: number;    // e.g. 12 for "bill monthly for 12 months then stop"; omit for indefinite
}

export const PLANS: Record<PlanId, PlanDefinition> = {
    pro_monthly: {
        id: 'pro_monthly',
        label: 'Pro — Monthly',
        type: 'subscription',
        amountPaise: 49900, // ₹499.00 — adjust to your real price
        razorpayPlanId: process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY || '',
    },
    pro_yearly: {
        id: 'pro_yearly',
        label: 'Pro — Yearly',
        type: 'subscription',
        amountPaise: 499900, // ₹4,999.00 — adjust to your real price
        razorpayPlanId: process.env.RAZORPAY_PLAN_ID_PRO_YEARLY || '',
    },
};

export function getPlan(planId: string): PlanDefinition | null {
    return (PLANS as Record<string, PlanDefinition>)[planId] || null;
}
