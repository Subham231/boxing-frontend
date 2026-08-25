/**
 * Anonymous session ID — persistent across page reloads (localStorage),
 * used as a soft server-side abuse signal for anonymous feature limits.
 *
 * This is NOT a security primitive. It can be cleared by the user.
 * The server combines it with a hashed IP for a two-layer check.
 */

const ANON_SESSION_KEY = 'sparai_anon_session';

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
