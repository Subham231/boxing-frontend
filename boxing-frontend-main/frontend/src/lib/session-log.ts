// Session history is intentionally kept on-device (localStorage), not in
// Supabase — it's per-session workout telemetry, not identity or rank data.
// This is the single writer/reader for that store, so the shape used by
// the Analytics page always matches what real sessions actually write.

export interface DrillLogEntry {
  command: string;
  velocity_rating: string;
  reflex_time_ms: number;
  extension_speed_ms: number;
  form_notes: string;
}

export interface VisionSessionRecord {
  date: string; // ISO timestamp
  punches: number;
  score: number;
  reflex_tier: string;
  avg_reflex_ms: number;
  accuracy: number;
  flaw: string;
  advice: string;
  raw_data?: {
    drill_data: DrillLogEntry[];
  };
}

const SESSION_HISTORY_KEY = 'boxing_session_history';
const MAX_STORED_SESSIONS = 100;

export function getReflexTier(avgReflexSeconds: number): string {
  if (!isFinite(avgReflexSeconds) || avgReflexSeconds <= 0) return '--';
  if (avgReflexSeconds < 0.25) return 'Elite';
  if (avgReflexSeconds < 0.35) return 'Pro';
  if (avgReflexSeconds < 0.45) return 'Amateur';
  return 'Rookie';
}

export function getVisionSessionHistory(): VisionSessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// Appends one real completed video-analysis session to local history.
// Called exactly once per finished session, from the results screen.
export function logVisionSession(record: VisionSessionRecord) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getVisionSessionHistory();
    existing.unshift(record);
    // Cap stored history so localStorage doesn't grow unbounded.
    const trimmed = existing.slice(0, MAX_STORED_SESSIONS);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to log vision session:', e);
  }
}
