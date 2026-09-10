import { useEffect, useState } from 'react';

/**
 * Returns a debounced value that only updates after the specified delay.
 * Useful for throttling rapid state updates (e.g., UI metrics) to reduce re‑renders.
 */
export function useDebounce<T>(value: T, delay: number = 100): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}
