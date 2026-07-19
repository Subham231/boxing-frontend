// Anti-cheat helpers for the Reflex Enhancer games. These run entirely
// client-side and catch the obvious spam/macro/multi-tab exploits. They are
// NOT a substitute for server-side validation — a determined cheater can
// still edit client JS directly. True security requires the backend score
// -validation step described in the Firebase setup notes; this layer exists
// to stop casual spam-clicking and make automated exploitation harder.

// Documented human simple-reaction-time floor. Elite sprinters/gamers can
// occasionally dip toward ~150ms; anything under this is not a genuine
// visual reaction and is almost certainly a false start or macro.
export const MIN_PLAUSIBLE_REACTION_SECONDS = 0.12;

// If taps arrive faster than this, sustained, it reads as automated input
// rather than deliberate human taps.
export const MIN_HUMAN_TAP_INTERVAL_MS = 60;

export function isPlausibleReactionTime(elapsedSeconds: number): boolean {
  return elapsedSeconds >= MIN_PLAUSIBLE_REACTION_SECONDS;
}

// Flags a set of tap intervals (ms between consecutive taps) as bot-like if
// they're both very fast AND suspiciously uniform (real human taps have
// natural variance; a macro/auto-clicker does not).
export function looksAutomated(intervalsMs: number[]): boolean {
  if (intervalsMs.length < 3) return false;
  const fastOnes = intervalsMs.filter((i) => i < MIN_HUMAN_TAP_INTERVAL_MS);
  if (fastOnes.length < 3) return false;

  const mean = fastOnes.reduce((a, b) => a + b, 0) / fastOnes.length;
  const variance = fastOnes.reduce((a, b) => a + (b - mean) ** 2, 0) / fastOnes.length;
  const stdDev = Math.sqrt(variance);
  // Very low variance at very high speed = macro-like consistency.
  return stdDev < 8;
}

// --- Multi-tab guard -------------------------------------------------------
// Prevents the same score-earning session from running in two tabs at once
// (which could otherwise be used to game weekly session caps or timers).
const TAB_LOCK_KEY = 'reflex_active_tab_v1';
const HEARTBEAT_MS = 1500;
const STALE_AFTER_MS = 4000;

export function createTabLock(gameId: string) {
  const tabId = `${gameId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let interval: ReturnType<typeof setInterval> | null = null;

  const write = () => {
    try {
      localStorage.setItem(TAB_LOCK_KEY, JSON.stringify({ tabId, gameId, ts: Date.now() }));
    } catch {
      // ignore
    }
  };

  const isOwner = (): boolean => {
    try {
      const raw = localStorage.getItem(TAB_LOCK_KEY);
      if (!raw) return true;
      const parsed = JSON.parse(raw);
      if (parsed.tabId === tabId) return true;
      // Another tab's lock is stale — we can take over.
      return Date.now() - parsed.ts > STALE_AFTER_MS;
    } catch {
      return true;
    }
  };

  return {
    acquire() {
      write();
      interval = setInterval(write, HEARTBEAT_MS);
    },
    release() {
      if (interval) clearInterval(interval);
      try {
        const raw = localStorage.getItem(TAB_LOCK_KEY);
        if (raw && JSON.parse(raw).tabId === tabId) localStorage.removeItem(TAB_LOCK_KEY);
      } catch {
        // ignore
      }
    },
    isOwner,
  };
}
