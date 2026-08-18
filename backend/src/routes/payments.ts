import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { razorpay, getPlan } from '../lib/razorpay';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, AuthedRequest } from '../middleware/auth';

export const paymentsRouter = Router();

// Prevent abuse of the order/subscription creation endpoints (e.g. someone
// scripting thousands of Razorpay orders against your account).
const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                  // 10 attempts per user/IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many payment attempts. Please try again later.' },
});

// ---------------------------------------------------------------------------
// POST /api/payments/create-subscription
// Body: { planId: "pro_monthly" }
// Auth: required (Bearer token)
// ---------------------------------------------------------------------------
paymentsRouter.post(
    '/create-subscription',
    createLimiter,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
        try {
            const { planId } = req.body || {};
            const plan = getPlan(planId);

            if (!plan) {
                return res.status(400).json({ error: 'Unknown planId' });
            }
            if (plan.type !== 'subscription') {
                return res.status(400).json({ error: 'This plan is not a subscription plan — use /create-order instead' });
            }
            if (!plan.razorpayPlanId) {
                return res.status(500).json({
                    error: `Server misconfiguration: no Razorpay plan_id set for "${plan.id}". ` +
                        'Create the Plan in the Razorpay Dashboard and set the matching env var.',
                });
            }
            if (!supabaseAdmin) {
                return res.status(500).json({ error: 'Database unavailable' });
            }

            const subscription = await razorpay.subscriptions.create({
                plan_id: plan.razorpayPlanId,
                customer_notify: 1,
                total_count: plan.billingCycles || 120, // effectively "until cancelled" if unset
                notes: {
                    userId: req.userId!,
                    planId: plan.id,
                },
            });

            // Record it immediately as "created" — the webhook will flip this
            // to "active" once Razorpay confirms the first payment actually
            // went through. We do NOT unlock anything for the user yet.
            const { error: dbError } = await supabaseAdmin.from('subscriptions').insert({
                user_id: req.userId,
                plan_id: plan.id,
                razorpay_subscription_id: subscription.id,
                status: 'created',
            });

            if (dbError) {
                console.error('[create-subscription] DB insert failed:', dbError);
                return res.status(500).json({ error: 'Failed to record subscription' });
            }

            res.json({
                subscriptionId: subscription.id,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                planLabel: plan.label,
            });
        } catch (err) {
            console.error('[create-subscription] Error:', err);
            res.status(500).json({ error: 'Failed to create subscription' });
        }
    }
);

// ---------------------------------------------------------------------------
// POST /api/payments/create-order  (for one-time, non-recurring purchases)
// Body: { planId: "some_one_time_plan" }
// Auth: required (Bearer token)
// ---------------------------------------------------------------------------
paymentsRouter.post(
    '/create-order',
    createLimiter,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
        try {
            const { planId } = req.body || {};
            const plan = getPlan(planId);

            if (!plan) {
                return res.status(400).json({ error: 'Unknown planId' });
            }
            if (plan.type !== 'one_time') {
                return res.status(400).json({ error: 'This plan is a subscription — use /create-subscription instead' });
            }

            const order = await razorpay.orders.create({
                amount: plan.amountPaise,
                currency: 'INR',
                receipt: `order_${req.userId}_${Date.now()}`,
                notes: {
                    userId: req.userId!,
                    planId: plan.id,
                },
            });

            res.json({
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                planLabel: plan.label,
            });
        } catch (err) {
            console.error('[create-order] Error:', err);
            res.status(500).json({ error: 'Failed to create order' });
        }
    }
);

// ---------------------------------------------------------------------------
// POST /api/payments/verify  (called by the frontend right after checkout
// closes — gives instant UI feedback. This is NOT the source of truth; the
// webhook below is. A user closing the tab before this fires must not be
// able to block their subscription from activating — the webhook covers it.)
// ---------------------------------------------------------------------------
paymentsRouter.post('/verify', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_subscription_id,
            razorpay_signature,
        } = req.body || {};

        if (!razorpay_payment_id || !razorpay_signature || (!razorpay_order_id && !razorpay_subscription_id)) {
            return res.status(400).json({ error: 'Missing required verification fields' });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET || '';
        const payload = razorpay_subscription_id
            ? `${razorpay_payment_id}|${razorpay_subscription_id}`
            : `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

        const isValid = safeCompare(expectedSignature, razorpay_signature);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Signature is valid — but we still wait for the webhook to actually
        // flip the DB row to "active" (it carries the authoritative event
        // straight from Razorpay's servers). Here we just tell the client
        // "yes, this looks genuine" so the UI can show a success state.
        res.json({ verified: true });
    } catch (err) {
        console.error('[verify] Error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/payments/subscription-status
// Returns the caller's current subscription, if any.
// ---------------------------------------------------------------------------
paymentsRouter.get('/subscription-status', requireAuth, async (req: AuthedRequest, res: Response) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Database unavailable' });

    const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_id, status, current_period_end, created_at')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[subscription-status] Error:', error);
        return res.status(500).json({ error: 'Failed to fetch subscription status' });
    }

    res.json({ subscription: data || null });
});

// ---------------------------------------------------------------------------
// POST /api/payments/webhook  — THE SOURCE OF TRUTH
//
// Registered in Razorpay Dashboard → Settings → Webhooks, subscribed to at
// least: subscription.activated, subscription.charged, subscription.cancelled,
// payment.captured, payment.failed.
//
// IMPORTANT: this route needs the RAW request body (not JSON-parsed) to
// verify the signature correctly — see server.ts for how the raw body
// parser is scoped to only this path, mounted before the global JSON parser.
// ---------------------------------------------------------------------------
export function handleWebhook(req: Request, res: Response) {
    void (async () => {
        try {
            const signature = req.headers['x-razorpay-signature'] as string | undefined;
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

            if (!signature || !webhookSecret) {
                return res.status(400).json({ error: 'Missing signature or webhook secret not configured' });
            }

            // req.body is a Buffer here because of the raw-body middleware —
            // signature must be computed over the exact raw bytes Razorpay sent.
            const rawBody = req.body as Buffer;
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            if (!safeCompare(expectedSignature, signature)) {
                console.warn('[webhook] Signature mismatch — rejecting.');
                return res.status(400).json({ error: 'Invalid signature' });
            }

            const event = JSON.parse(rawBody.toString('utf8'));
            const eventId: string | undefined = event.id || req.headers['x-razorpay-event-id'] as string;
            const eventType: string = event.event;

            if (!supabaseAdmin) {
                console.error('[webhook] Supabase admin client unavailable.');
                return res.status(500).json({ error: 'Database unavailable' });
            }

            // Idempotency: skip if we've already processed this exact event.
            if (eventId) {
                const { data: existing } = await supabaseAdmin
                    .from('processed_webhook_events')
                    .select('event_id')
                    .eq('event_id', eventId)
                    .maybeSingle();

                if (existing) {
                    return res.status(200).json({ status: 'already_processed' });
                }
            }

            await processWebhookEvent(eventType, event);

            if (eventId) {
                await supabaseAdmin.from('processed_webhook_events').insert({
                    event_id: eventId,
                    event_type: eventType,
                });
            }

            // Always 200 quickly once handled — Razorpay retries on non-2xx.
            res.status(200).json({ status: 'ok' });
        } catch (err) {
            console.error('[webhook] Unhandled error:', err);
            // Returning 500 causes Razorpay to retry later, which is fine —
            // the idempotency check above means a retry can't double-apply.
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    })();
}

async function processWebhookEvent(eventType: string, event: any) {
    if (!supabaseAdmin) return;

    switch (eventType) {
        case 'subscription.activated':
        case 'subscription.charged': {
            const sub = event.payload?.subscription?.entity;
            if (!sub?.id) break;

            const currentEnd = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null;

            await supabaseAdmin
                .from('subscriptions')
                .update({ status: 'active', current_period_end: currentEnd })
                .eq('razorpay_subscription_id', sub.id);
            break;
        }

        case 'subscription.cancelled':
        case 'subscription.completed': {
            const sub = event.payload?.subscription?.entity;
            if (!sub?.id) break;

            await supabaseAdmin
                .from('subscriptions')
                .update({ status: 'cancelled' })
                .eq('razorpay_subscription_id', sub.id);
            break;
        }

        case 'subscription.pending':
        case 'subscription.halted': {
            const sub = event.payload?.subscription?.entity;
            if (!sub?.id) break;

            await supabaseAdmin
                .from('subscriptions')
                .update({ status: 'past_due' })
                .eq('razorpay_subscription_id', sub.id);
            break;
        }

        case 'payment.captured': {
            const payment = event.payload?.payment?.entity;
            if (!payment) break;

            const userId = payment.notes?.userId;
            const planId = payment.notes?.planId;

            // Only relevant for one-time (non-subscription) purchases — the
            // order flow. Subscription payments are handled by the
            // subscription.* events above.
            if (userId && planId && payment.order_id && !payment.notes?.subscription_id) {
                await supabaseAdmin.from('subscriptions').upsert(
                    {
                        user_id: userId,
                        plan_id: planId,
                        razorpay_order_id: payment.order_id,
                        razorpay_payment_id: payment.id,
                        status: 'active',
                    },
                    { onConflict: 'razorpay_order_id' }
                );
            }
            break;
        }

        case 'payment.failed': {
            const payment = event.payload?.payment?.entity;
            console.warn('[webhook] Payment failed:', payment?.id, payment?.error_description);
            break;
        }

        default:
            // Unhandled event types are fine to ignore — just log for visibility.
            console.log('[webhook] Unhandled event type:', eventType);
    }
}

// Constant-time string comparison to avoid leaking signature info via
// response-timing side channels.
function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}
