import { useSyncExternalStore, useCallback, useRef } from 'react';

export interface StoreOptions<T> {
  initialState: T;
  name?: string;
}

export interface Store<T> {
  getState: () => T;
  setState: (updater: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  reset: () => void;
}

export function createStore<T>(options: StoreOptions<T>): Store<T> {
  let state = options.initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      state = typeof updater === 'function' ? (updater as (prev: T) => T)(state) : updater;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset: () => {
      state = options.initialState;
      listeners.forEach((l) => l());
    },
  };
}

export function useStore<T, S = T>(
  store: Store<T>,
  selector: (state: T) => S = (s) => s as unknown as S,
): [S, (updater: S | ((prev: S) => S)) => void] {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSnapshot = useCallback(() => selectorRef.current(store.getState()), [store]);
  const value = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback(
    (updater: S | ((prev: S) => S)) => {
      store.setState((prev) => {
        const current = selectorRef.current(prev);
        const next = typeof updater === 'function' ? (updater as (p: S) => S)(current) : updater;
        if (typeof prev === 'object' && prev !== null && !Array.isArray(prev)) {
          return { ...prev, ...next } as T;
        }
        return next as unknown as T;
      });
    },
    [store],
  );

  return [value, setValue];
}
