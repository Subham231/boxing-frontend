'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onIdTokenChanged } from 'firebase/auth';
import { watchAuthState } from './firebase-auth';
import { firebaseAuth } from './firebase';

export function useFirebaseUser() {
  const [user, setUser] = useState<User | null>(() => firebaseAuth.currentUser);
  const [loading, setLoading] = useState<boolean>(() => !firebaseAuth.currentUser);

  useEffect(() => {
    // Watch auth state changes
    const unsubAuth = watchAuthState((u) => {
      setUser(u);
      setLoading(false);
    });

    // Also watch token changes so auto-refreshed tokens update smoothly without null dropouts
    const unsubToken = onIdTokenChanged(firebaseAuth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  return { user, loading };
}
