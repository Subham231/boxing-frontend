import crypto from 'crypto';

export type RewardProvider = 'google_ad_manager' | 'dev';

export interface RewardVerificationResult {
  ok: boolean;
  uid: string | null;
  provider: RewardProvider;
  reason?: string;
  metadata?: Record<string, string>;
}

export interface RewardCallbackBody {
  uid?: string;
  user_id?: string;
  custom_data?: string;
  transaction_id?: string;
  reward_id?: string;
  ad_unit_id?: string;
  network_code?: string;
  signature?: string;
  sig?: string;
  [key: string]: unknown;
}

export function getRewardProvider(): RewardProvider {
  const configured = process.env.GAM_REWARD_PROVIDER || 'google_ad_manager';
  return configured === 'dev' ? 'dev' : 'google_ad_manager';
}

export function isGoogleAdManagerConfigured(): boolean {
  return Boolean(
    process.env.GAM_SSV_SECRET ||
      process.env.GAM_NETWORK_CODE ||
      process.env.GAM_API_KEY ||
      process.env.GAM_REWARDED_AD_UNIT_ID,
  );
}

function canonicalJsonForSignature(payload: Record<string, unknown>): string {
  const sorted = Object.keys(payload)
    .filter((key) => key !== 'signature' && key !== 'sig')
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});

  return JSON.stringify(sorted);
}

/**
 * Placeholder verification layer for Google Ad Manager rewarded ads.
 *
 * This supports both the common query-string callback format and a JSON POST
 * payload so the app is ready for the live GAM contract without locking the
 * implementation to one callback format prematurely.
 */
export function verifyGoogleAdManagerReward(
  url: URL,
  headers: Headers,
  body: RewardCallbackBody = {},
): RewardVerificationResult {
  const secret = process.env.GAM_SSV_SECRET || '';
  const signature =
    url.searchParams.get('signature') ||
    url.searchParams.get('sig') ||
    body.signature ||
    body.sig ||
    headers.get('x-ad-manager-signature') ||
    headers.get('x-gam-signature') ||
    '';

  const customData =
    body.custom_data ||
    body.user_id ||
    body.uid ||
    url.searchParams.get('custom_data') ||
    url.searchParams.get('user_id') ||
    url.searchParams.get('uid') ||
    '';

  const transactionId =
    body.transaction_id ||
    body.reward_id ||
    url.searchParams.get('transaction_id') ||
    url.searchParams.get('reward_id') ||
    headers.get('x-gam-transaction-id') ||
    '';

  const provider = getRewardProvider();

  if (!secret && !isGoogleAdManagerConfigured()) {
    return {
      ok: false,
      uid: null,
      provider,
      reason: 'Google Ad Manager reward verification is not configured yet.',
      metadata: {
        status: 'pending_provider_setup',
        provider: 'google_ad_manager',
      },
    };
  }

  if (!customData) {
    return {
      ok: false,
      uid: null,
      provider,
      reason: 'Missing custom_data or uid in reward callback.',
      metadata: {
        status: 'missing_uid',
        provider: 'google_ad_manager',
      },
    };
  }

  if (secret && signature) {
    const hasBodyPayload = Object.keys(body).length > 0;
    const payload = hasBodyPayload
      ? canonicalJsonForSignature(body as Record<string, unknown>)
      : url.searchParams.toString().replace(/&?(signature|sig)=[^&]*/g, '');

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');

    const isValid =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

    if (!isValid) {
      return {
        ok: false,
        uid: customData,
        provider,
        reason: 'Invalid Google Ad Manager reward signature.',
        metadata: {
          status: 'signature_mismatch',
          provider: 'google_ad_manager',
          transactionId,
        },
      };
    }
  } else if (!secret) {
    return {
      ok: true,
      uid: customData,
      provider,
      metadata: {
        status: 'provider_ready_waiting_for_live_api',
        provider: 'google_ad_manager',
        transactionId,
      },
    };
  }

  return {
    ok: true,
    uid: customData,
    provider,
    metadata: {
      status: 'verified',
      provider: 'google_ad_manager',
      transactionId,
    },
  };
}
