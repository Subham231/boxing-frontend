'use client';

import { useEffect, useState } from 'react';
import { useFirebaseUser } from './useFirebaseUser';
import { ensureUserProfile, saveProfileDetails, type UserProfile } from './firebase-auth';

const LOCAL_CACHE_KEY = 'boxing_onboarding_data';

// Mirrors the authoritative Supabase profile into the legacy localStorage
// cache other pages (Dashboard header, Leaderboard "is this me" check,
// Analytics header) already read from — so those don't need touching
// individually, they just automatically see live data.
export function cacheProfileLocally(profile: UserProfile) {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
    const merged = {
      ...existing,
      ringName: profile.display_name || 'FIGHTER',
      ring_name: profile.display_name || 'FIGHTER',
      age: profile.age ?? undefined,
      profession: profile.profession || '',
      avatar_url: profile.avatar_url || '',
      promise: profile.promise_word || '',
      promise_trigger: profile.promise_word || '',
      // Spread in the full onboarding_data object so fields like goals,
      // experience_level, persona, lifestyle, height, weight, etc. are
      // restored from the server rather than falling back to localStorage.
      ...(profile.onboarding_data && typeof profile.onboarding_data === 'object'
        ? (profile.onboarding_data as Record<string, unknown>)
        : {}),
    };
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(merged));
  } catch {
    // Non-fatal — worst case, other pages briefly show stale local data.
  }
}

// Fetches the caller's own Supabase profile (creating it only if it truly
// doesn't exist yet — ensureUserProfile is a no-op for existing accounts)
// and keeps a live-editable copy in state. Use this instead of reading
// localStorage directly anywhere the app needs to *show* or *edit* profile
// fields — it's always backed by Supabase, not a locally-guessed value.
export function useMyProfile() {
  const { user, loading: userLoading } = useFirebaseUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (userLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    ensureUserProfile(user)
      .then(({ profile: p }) => {
        if (cancelled) return;
        setProfile(p);
        cacheProfileLocally(p);
        setLoading(false);
      })
      .catch((e) => {
        console.error('Failed to load profile from Supabase:', e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load profile.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  // Optimistic update: reflects instantly in local state + the legacy
  // localStorage cache, then persists to Supabase. If the save fails the
  // optimistic value is left in place (it'll just retry saving next edit) —
  // this app has no offline queue, and failing silently back to the old
  // value would just look like a glitch to the user.
  async function updateProfile(details: { displayName?: string; age?: number; profession?: string; promiseWord?: string; avatarUrl?: string }) {
    if (!user) return null;
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            ...(details.displayName ? { display_name: details.displayName } : {}),
            ...(details.age !== undefined ? { age: details.age } : {}),
            ...(details.profession ? { profession: details.profession } : {}),
            ...(details.promiseWord ? { promise_word: details.promiseWord } : {}),
            ...(details.avatarUrl ? { avatar_url: details.avatarUrl } : {}),
          }
        : prev
    );
    const updated = await saveProfileDetails(user, details);
    if (updated) {
      setProfile(updated);
      cacheProfileLocally(updated);
    }
    return updated;
  }

  return { profile, loading, error, updateProfile };
}
