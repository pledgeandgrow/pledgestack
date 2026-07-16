import { useState, useEffect, useCallback, useRef } from 'react';

export interface PersistenceOptions<T> {
  /** Storage key */
  key: string;
  /** Default value when nothing is stored */
  defaultValue: T;
  /** Storage type (default: 'localStorage') */
  storage?: 'localStorage' | 'sessionStorage';
  /** Serialize function (default: JSON.stringify) */
  serialize?: (value: T) => string;
  /** Deserialize function (default: JSON.parse) */
  deserialize?: (raw: string) => T;
  /** Hydrate from storage on mount (default: true) */
  hydrate?: boolean;
}

export function usePersistentState<T>(options: PersistenceOptions<T>): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    key,
    defaultValue,
    storage: storageType = 'localStorage',
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    hydrate = true,
  } = options;

  const storageRef = useRef<Storage | null>(null);

  if (typeof window !== 'undefined') {
    storageRef.current = storageType === 'localStorage' ? window.localStorage : window.sessionStorage;
  }

  const [state, setState] = useState<T>(defaultValue);

  useEffect(() => {
    if (!hydrate || typeof window === 'undefined') return;
    try {
      const raw = storageRef.current?.getItem(key);
      if (raw !== null && raw !== undefined) {
        setState(deserialize(raw));
      }
    } catch {
      /* ignore */
    }
  }, [key, hydrate, deserialize]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        if (typeof window !== 'undefined' && storageRef.current) {
          try {
            storageRef.current.setItem(key, serialize(next));
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    },
    [key, serialize],
  );

  const clear = useCallback(() => {
    if (typeof window !== 'undefined' && storageRef.current) {
      try {
        storageRef.current.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    setState(defaultValue);
  }, [key, defaultValue]);

  return [state, setValue, clear];
}

export function useSessionState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  return usePersistentState<T>({ key, defaultValue, storage: 'sessionStorage' });
}
