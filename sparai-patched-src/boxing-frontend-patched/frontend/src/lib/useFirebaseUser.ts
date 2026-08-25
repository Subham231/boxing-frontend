'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { watchAuthState } from './firebase-auth';

export function useFirebaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = watchAuthState((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}
