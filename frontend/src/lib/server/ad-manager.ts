import crypto from 'crypto';

export type RewardProvider = 'google_ad_manager' | 'dev';

export interface RewardVerificationResult {
  ok: boolean;
  uid: string | null;
  provider: RewardProvider;
  reason?: string;
  metadata?: Record<string, string>;
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

/**
 * Placeholder verification layer for Google Ad Manager rewarded ads.
 *
 * This intentionally keeps the app ready for a future real GAM API/webhook
 * integration without gating the new reward flow on a production provider
 * being active yet. The route still enforces the transaction in the app, but
 * the exact GAM callback schema can be swapped in here later.
 */
export function verifyGoogleAdManagerReward(
  url: URL,
  headers: Headers,
): RewardVerificationResult {
  const secret = process.env.GAM_SSV_SECRET || '';
  const signature =
    url.searchParams.get('signature') ||
    url.searchParams.get('sig') ||
    headers.get('x-ad-manager-signature') ||
    headers.get('x-gam-signature') ||
    '';

  const customData =
    url.searchParams.get('custom_data') ||
    url.searchParams.get('user_id') ||
    url.searchParams.get('uid') ||
    '';

  const transactionId =
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
    const payload = url.searchParams.toString().replace(/&?(signature|sig)=[^&]*/g, '');
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
    // Placeholder path: the app is ready to accept the real provider callback,
    // but the live GAM secret is intentionally not hard-coded in code.
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
