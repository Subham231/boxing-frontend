// SERVER-ONLY spar helpers — command sequences, result gating, scoring.

export type SparCommandKind = 'punch' | 'defense';

export interface SparCommand {
  command: string;
  kind: SparCommandKind;
  callAtMs: number;
}

export interface SparCommandResult {
  index: number;
  command: string;
  kind: SparCommandKind;
  hit: boolean;
  reactionMs: number | null;
  trackingConfidence?: number;
}

export interface SparResultBreakdown {
  commandsResponded: number;
  hits: number;
  misses: number;
  avgReactionMs: number | null;
  score: number;
  perCommand: SparCommandResult[];
}

const PUNCHES: Array<{ command: string; kind: SparCommandKind }> = [
  { command: 'JAB', kind: 'punch' },
  { command: 'CROSS', kind: 'punch' },
  { command: 'LEAD HOOK', kind: 'punch' },
  { command: 'REAR HOOK', kind: 'punch' },
  { command: 'LEAD UPPERCUT', kind: 'punch' },
  { command: 'REAR UPPERCUT', kind: 'punch' },
  { command: 'BODY HOOK', kind: 'punch' },
  { command: 'OVERHAND RIGHT', kind: 'punch' },
  { command: 'DOUBLE JAB', kind: 'punch' },
  { command: '1-2 COMBO', kind: 'punch' },
  { command: '1-2-3 COMBO', kind: 'punch' },
  { command: 'BODY-HEAD COMBO', kind: 'punch' },
];

const GAP_MS = 1600; // Hard rapid tempo
const START_OFFSET_MS = 3500;

/** Punch-only coach-call pool — randomly generates 40 to 70 punch commands, unique every match but identical for both paired fighters. */
export function generateSparCommandSequence(seed?: number): SparCommand[] {
  // Generate high-entropy seed if not explicitly passed
  let s = seed ?? (Date.now() ^ (Math.floor(Math.random() * 1000000) + 1));
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  // Random length between 40 and 70 punch commands
  const sequenceLen = Math.floor(rng() * 31) + 40;

  const pool = PUNCHES;
  const seq: SparCommand[] = [];
  let last = '';
  for (let i = 0; i < sequenceLen; i++) {
    let pick = pool[Math.floor(rng() * pool.length)];
    let guard = 0;
    while (pick.command === last && guard++ < 8) {
      pick = pool[Math.floor(rng() * pool.length)];
    }
    last = pick.command;
    seq.push({
      command: pick.command,
      kind: 'punch',
      callAtMs: START_OFFSET_MS + i * GAP_MS,
    });
  }
  return seq;
}

export function shouldGateResultReveal(_entitlementActive: boolean): boolean {
  // Today: everyone sees who won. Flip to `return !_entitlementActive` later.
  return false;
}

const MIN_REACTION_MS = 100;
const MAX_REACTION_MS = 1800;

export function validateSparResult(
  sequence: SparCommand[],
  breakdown: SparResultBreakdown,
): { ok: boolean; reason?: string; softFlags: string[] } {
  const softFlags: string[] = [];
  if (!breakdown || !Array.isArray(breakdown.perCommand)) {
    return { ok: false, reason: 'Missing per-command breakdown.', softFlags };
  }
  if (breakdown.commandsResponded > sequence.length) {
    return { ok: false, reason: 'commandsResponded exceeds sequence length.', softFlags };
  }
  if (breakdown.perCommand.length > sequence.length) {
    return { ok: false, reason: 'Too many command results.', softFlags };
  }
  for (const row of breakdown.perCommand) {
    if (row.reactionMs != null) {
      if (row.reactionMs < MIN_REACTION_MS) {
        return { ok: false, reason: 'Implausible reaction time.', softFlags };
      }
      if (row.reactionMs > MAX_REACTION_MS) {
        softFlags.push('slow_reaction');
      }
    }
    if (typeof row.trackingConfidence === 'number' && row.trackingConfidence >= 0.999) {
      softFlags.push('perfect_tracking');
    }
  }
  return { ok: true, softFlags };
}

export function computeSparScore(breakdown: SparResultBreakdown): number {
  const hits = breakdown.hits || 0;
  const total = Math.max(1, breakdown.commandsResponded || breakdown.perCommand?.length || 1);
  const accuracy = hits / total;
  const avg = breakdown.avgReactionMs;
  const speedFactor = avg == null ? 0.5 : Math.max(0, Math.min(1, (900 - avg) / 700));
  return Math.round((accuracy * 70 + speedFactor * 30) * 10) / 10;
}

export function pickWinner(
  aUid: string,
  bUid: string,
  a: SparResultBreakdown,
  b: SparResultBreakdown,
): string {
  const aScore = typeof a.score === 'number' ? a.score : computeSparScore(a);
  const bScore = typeof b.score === 'number' ? b.score : computeSparScore(b);
  if (aScore === bScore) {
    const aReact = a.avgReactionMs ?? 9999;
    const bReact = b.avgReactionMs ?? 9999;
    if (aReact === bReact) return aUid; // deterministic tie-break
    return aReact < bReact ? aUid : bUid;
  }
  return aScore > bScore ? aUid : bUid;
}
