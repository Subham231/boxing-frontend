import {
  collection, query, where, orderBy, limit, onSnapshot, getCountFromServer, doc, getDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, firebaseFunctions } from './firebase';

export interface ReflexScoreDoc {
  uid: string;
  phone: string;
  displayName?: string;
  bestScore: number | null;      // lifetime best avg reaction time (seconds), lower = better
  weeklyScore: number | null;    // this week's best avg reaction time (seconds)
  weekId: string;                // e.g. "2026-W29" — the week weeklyScore belongs to
  gamesPlayed: number;           // lifetime
  avgReactionTime: number | null;// lifetime rolling average
  lastPlayed: unknown;
}

// ISO 8601 week id, e.g. "2026-W29". Used to scope the weekly leaderboard
// query — once the week rolls over, old weeklyScore values simply stop
// matching the query filter, so "reset" requires no cron job at all.
export function getCurrentWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function subscribeWeeklyLeaderboard(
  gameId: 'reaction_tap' | 'combo_flash',
  topN: number,
  callback: (rows: ReflexScoreDoc[]) => void
) {
  const weekId = getCurrentWeekId();
  const q = query(
    collection(firestore, `reflex_scores_${gameId}`),
    where('weekId', '==', weekId),
    orderBy('weeklyScore', 'asc'),
    limit(topN)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as ReflexScoreDoc));
  });
}

// Firestore doesn't give you "my rank" directly — this counts how many
// weekly scores beat the user's own weekly score, which is cheap thanks to
// getCountFromServer (an aggregate query, not a full document read).
export async function getUserWeeklyRank(gameId: 'reaction_tap' | 'combo_flash', uid: string): Promise<number | null> {
  const weekId = getCurrentWeekId();
  const myDoc = await getDoc(doc(firestore, `reflex_scores_${gameId}`, uid));
  if (!myDoc.exists()) return null;
  const myScore = (myDoc.data() as ReflexScoreDoc).weeklyScore;
  if (myScore == null || myDoc.data().weekId !== weekId) return null;

  const betterQuery = query(
    collection(firestore, `reflex_scores_${gameId}`),
    where('weekId', '==', weekId),
    where('weeklyScore', '<', myScore)
  );
  const countSnap = await getCountFromServer(betterQuery);
  return countSnap.data().count + 1;
}

// The ONLY way a score gets written. The client sends raw round data; the
// Cloud Function (see /functions/src/index.ts) re-validates and re-computes
// everything server-side before touching Firestore, so a modified client
// can propose a fake score but cannot make the server accept it.
export async function submitReflexScoreSecure(
  gameId: 'reaction_tap' | 'combo_flash',
  roundTimesSeconds: number[]
): Promise<{ accepted: boolean; reason?: string }> {
  const fn = httpsCallable(firebaseFunctions, 'submitReflexScore');
  const result = await fn({ gameId, roundTimes: roundTimesSeconds });
  return result.data as { accepted: boolean; reason?: string };
}
