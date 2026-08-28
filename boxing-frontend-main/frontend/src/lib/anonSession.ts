/**
 * Anonymous session ID — persistent across page reloads (localStorage),
 * used as a soft server-side abuse signal for anonymous feature limits.
 *
 * This is NOT a security primitive. It can be cleared by the user.
 * The server combines it with a hashed IP for a two-layer check.
 */

const ANON_SESSION_KEY = 'sparai_anon_session';
const ANON_FEATURE_KEY = 'sparai_anon_feature_usage';

export function getAnonSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = localStorage.getItem(ANON_SESSION_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ANON_SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'storage-denied';
  }
}

export type AnonFeature = 'boxing_analysis' | 'free_spar';

export function canUseAnonFeature(feature: AnonFeature, limitPerDay = 1): boolean {
  if (typeof window === 'undefined') return true;

  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(ANON_FEATURE_KEY);
    const current = raw ? JSON.parse(raw) : {} as Record<string, Record<string, number>>;
    const featureState = current[feature] || {};
    const usedToday = Number(featureState[todayKey] || 0);

    if (usedToday >= limitPerDay) {
      return false;
    }

    featureState[todayKey] = usedToday + 1;
    current[feature] = featureState;
    localStorage.setItem(ANON_FEATURE_KEY, JSON.stringify(current));
    return true;
  } catch {
    return true;
  }
}

export function hadAnonFeatureUse(feature: AnonFeature): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(ANON_FEATURE_KEY);
    const current = raw ? JSON.parse(raw) : {} as Record<string, Record<string, number>>;
    return Number(current?.[feature]?.[todayKey] || 0) > 0;
  } catch {
    return false;
  }
}
