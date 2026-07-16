import { useState, useEffect, useCallback } from 'react';

export interface UrlStateOptions {
  /** Replace history entry instead of pushing (default: false) */
  replace?: boolean;
}

export function useUrlState<T>(
  key: string,
  defaultValue: T,
  options: UrlStateOptions = {},
): [T, (value: T | ((prev: T) => T)) => void] {
  const { replace = false } = options;

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return defaultValue;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }, [key, defaultValue]);

  const [state, setState] = useState<T>(readValue);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          params.set(key, JSON.stringify(next));
          const url = `${window.location.pathname}?${params.toString()}`;
          if (replace) {
            window.history.replaceState({}, '', url);
          } else {
            window.history.pushState({}, '', url);
          }
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        return next;
      });
    },
    [key, replace],
  );

  useEffect(() => {
    const onPop = () => setState(readValue());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [readValue]);

  return [state, setValue];
}
