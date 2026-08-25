'use client';

import { useEffect, useState } from 'react';
import { firebaseAuth } from './firebase';
import { supabase } from './supabase';
import { useFirebaseUser } from './useFirebaseUser';
import type { RankState } from './rank-system';

// Call this whenever the user finishes a workout/drill session — credits
// today's activity toward their streak and rank server-side. Safe to call
// more than once per day (the server no-ops if today's already credited).
export async function completeSessionSecure(): Promise<{ state: RankState; rankedUp: boolean } | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const idToken = await user.getIdToken();
  const res = await fetch('/api/reflex/complete-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Call this when just VIEWING rank info (e.g. the Ranking page loading) so
// any pending inactivity demotions show up-to-date, without crediting a
// session the user didn't actually complete.
export async function syncRankState(): Promise<RankState | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const idToken = await user.getIdToken();
  const res = await fetch('/api/reflex/sync-rank', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  const { state } = await res.json();
  return state;
}

// Read-only fetch (e.g. for showing someone else's rank badge) — direct
// Supabase read via the public-read RLS policy, no auth token needed.
export async function getRankState(uid: string): Promise<RankState | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('user_streaks').select('*').eq('uid', uid).maybeSingle();
  return data as RankState | null;
}

// Shared hook for anywhere the app *displays* current streak/rank
// (Dashboard, BottomNav, Settings/Profile). Always goes through
// syncRankState so every surface shows the same, up-to-date number —
// including a demotion that happened server-side since the last visit —
// instead of each screen reading its own stale localStorage copy.
export function useRankState() {
  const { user, loading: userLoading } = useFirebaseUser();
  const [rankState, setRankState] = useState<RankState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (userLoading) return;
    if (!user) {
      setRankState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    syncRankState().then((s) => {
      if (!cancelled) {
        setRankState(s);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  return { rankState, loading };
}
