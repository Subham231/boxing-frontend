import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

// -----------------------------------------------------------------------
// Reflex Enhancer — server-side score validation
// -----------------------------------------------------------------------
// This is the actual security boundary. The client sends raw per-round
// reaction times; everything here re-validates them independently of
// whatever the client claims, and the client-computed average is NEVER
// trusted or used directly.

const MIN_PLAUSIBLE_REACTION_SECONDS = 0.12; // faster = not a real human reaction
const MAX_PLAUSIBLE_REACTION_SECONDS = 3.0;  // slower = timed out, shouldn't be "counted"
const MAX_ROUNDS_PER_SUBMISSION = 5;

function getCurrentWeekId(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export const submitReflexScore = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to submit a score.');
  }
  const uid = request.auth.uid;
  const { gameId, roundTimes } = request.data as { gameId: string; roundTimes: number[] };

  // NOTE: combo_flash is accepted here for forward-compatibility but this
  // function's validation/scoring math (plausible-reaction-time range,
  // "lower score wins") is only correct for reaction_tap so far. Combo Flash
  // scores points-per-level where HIGHER is better, on a totally different
  // scale — wire it up with its own validation range and Math.max instead
  // of Math.min before enabling it client-side. Currently only reaction_tap
  // is called from the client.
  if (gameId !== 'reaction_tap' && gameId !== 'combo_flash') {
    throw new HttpsError('invalid-argument', 'Unknown game id.');
  }
  if (!Array.isArray(roundTimes) || roundTimes.length === 0 || roundTimes.length > MAX_ROUNDS_PER_SUBMISSION) {
    throw new HttpsError('invalid-argument', 'Invalid round data.');
  }

  // Re-validate every round independently — reject the whole submission if
  // anything looks physiologically impossible or malformed.
  for (const t of roundTimes) {
    if (typeof t !== 'number' || !Number.isFinite(t)) {
      throw new HttpsError('invalid-argument', 'Malformed round time.');
    }
    if (t < MIN_PLAUSIBLE_REACTION_SECONDS || t > MAX_PLAUSIBLE_REACTION_SECONDS) {
      return { accepted: false, reason: 'Round time outside plausible human range.' };
    }
  }

  const avg = roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length;
  const weekId = getCurrentWeekId();
  const ref = db.collection(`reflex_scores_${gameId}`).doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? snap.data()! : null;

    const prevGamesPlayed = existing?.gamesPlayed || 0;
    const prevAvg = existing?.avgReactionTime ?? avg;
    const newGamesPlayed = prevGamesPlayed + 1;
    // Rolling lifetime average across all submitted sessions.
    const newLifetimeAvg = (prevAvg * prevGamesPlayed + avg) / newGamesPlayed;

    const prevBest = existing?.bestScore;
    const newBest = prevBest == null ? avg : Math.min(prevBest, avg);

    // Weekly score resets automatically whenever the stored weekId no
    // longer matches the current week — no scheduled job required.
    const sameWeek = existing?.weekId === weekId;
    const prevWeekly = sameWeek ? existing?.weeklyScore : null;
    const newWeekly = prevWeekly == null ? avg : Math.min(prevWeekly, avg);

    tx.set(ref, {
      uid,
      phone: request.auth!.token.phone_number || '',
      bestScore: newBest,
      weeklyScore: newWeekly,
      weekId,
      gamesPlayed: newGamesPlayed,
      avgReactionTime: newLifetimeAvg,
      lastPlayed: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return { accepted: true };
});

// -----------------------------------------------------------------------
// Referral rewards — +1 month free per 5 successful referrals
// -----------------------------------------------------------------------
// Runs server-side whenever a new user document is created, so the
// referral count can never be inflated by a client writing directly to
// someone else's document.

export const onUserCreatedGrantReferral = onDocumentCreated('users/{uid}', async (event) => {
  const data = event.data?.data();
  if (!data?.referredBy) return;

  const code = String(data.referredBy).toUpperCase();
  const referrerQuery = await db.collection('users').where('referralCode', '==', code).limit(1).get();
  if (referrerQuery.empty) return;

  const referrerRef = referrerQuery.docs[0].ref;

  await db.runTransaction(async (tx) => {
    const referrerSnap = await tx.get(referrerRef);
    if (!referrerSnap.exists) return;
    const referrer = referrerSnap.data();

    const newCount = (referrer.referralCount || 0) + 1;
    const update: Record<string, unknown> = { referralCount: newCount };

    // Every 5th referral grants a free month, stacking on top of any
    // existing (possibly still-active) subscription reward.
    if (newCount % 5 === 0) {
      const now = new Date();
      const currentExpiry = referrer.subscriptionUntil ? new Date(referrer.subscriptionUntil) : now;
      const base = currentExpiry > now ? currentExpiry : now;
      const next = new Date(base);
      next.setDate(next.getDate() + 30);
      update.subscriptionUntil = next.toISOString();
    }

    tx.update(referrerRef, update);
  });
});
