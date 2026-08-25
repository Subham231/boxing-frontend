// Sunday-anchored week id, e.g. "2026-07-19" (the date, UTC, of that week's
// Sunday). Every week's id changes automatically the moment UTC crosses
// into Sunday, which is what makes the weekly leaderboard "reset" — old
// rows just stop matching the new week_id — no cron job required.
//
// (Previously this used an ISO-8601 week number, which resets on Monday,
// not Sunday — this is the fix for that.)
export function getCurrentWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

// Whether higher or lower is "better" depends on the game — reaction time
// (seconds) wants lower, combo score (points) wants higher. Every place
// that orders or ranks reflex_scores needs to know this, so it lives here
// once instead of being silently assumed in multiple files.
export function isLowerBetter(gameId: 'reaction_tap' | 'combo_flash'): boolean {
  return gameId === 'reaction_tap';
}
