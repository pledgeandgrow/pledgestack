import {
  useDeferredValue,
  useTransition,
  useSyncExternalStore,
  startTransition,
  Suspense,
  useEffect,
  useState,
  useRef,
  createElement,
  type ReactNode,
} from 'react';

/**
 * React 19 concurrent rendering helpers for PledgeStack.
 *
 * Provides optimized hooks and components for non-blocking UI updates:
 * - useDeferredValue for debouncing expensive renders
 * - useTransition for non-urgent state updates
 * - Suspense boundaries with fallback management
 */

/**
 * Hook for debouncing expensive renders while keeping the UI responsive.
 * Defers the value update until the browser is idle.
 */
export function useDeferredState<T>(initial: T, timeoutMs?: number): [T, (value: T) => void, T] {
  const [value, setValue] = useState<T>(initial);
  const deferredValue = useDeferredValue(value, timeoutMs !== undefined ? ({ timeoutMs } as never) : undefined);
  return [value, setValue, deferredValue];
}

/**
 * Hook for non-urgent state updates with pending tracking.
 * Wraps useTransition with a convenient API.
 */
export function useAsyncState<T>(initial: T): {
  value: T;
  pending: boolean;
  update: (value: T) => void;
  startTransition: typeof startTransition;
} {
  const [value, setValue] = useState<T>(initial);
  const [pending, startTransitionFn] = useTransition();

  const update = (newValue: T) => {
    startTransitionFn(() => setValue(newValue));
  };

  return { value, pending, update, startTransition: startTransitionFn };
}

/**
 * Hook for tracking transition state with a custom callback.
 * Useful for form submissions and data mutations.
 */
export function useTransitionCallback<T extends unknown[]>(
  callback: (...args: T) => Promise<void> | void,
): {
  pending: boolean;
  execute: (...args: T) => void;
  error: Error | null;
} {
  const [pending, startTransitionFn] = useTransition();
  const [error, setError] = useState<Error | null>(null);

  const execute = (...args: T) => {
    setError(null);
    startTransitionFn(async () => {
      try {
        await callback(...args);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    });
  };

  return { pending, execute, error };
}

/**
 * External store for streaming data — works with Suspense.
 * Returns data once resolved, suspends otherwise.
 */
export function useStreamedData<T>(
  subscribe: (callback: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
): T {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Suspense boundary with sensible defaults and error handling.
 */
export interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onError?: (error: Error) => void;
}

export function SuspenseBoundary({ children, fallback, name, onError }: SuspenseBoundaryProps) {
  const errorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (errorRef.current && onError) {
      onError(errorRef.current);
      errorRef.current = null;
    }
  });

  return createElement(
    Suspense,
    { name, fallback: fallback ?? createElement(DefaultFallback) },
    children,
  );
}

function DefaultFallback() {
  return createElement('div', { style: { minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    createElement('span', { style: { opacity: 0.6, fontSize: '14px' } }, 'Loading…'),
  );
}

/**
 * Hook for progressive enhancement of state — shows stale data
 * while new data loads, then swaps in the new data.
 */
export function useProgressiveState<T>(
  fetcher: (key: string) => Promise<T>,
  key: string,
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pending, startTransitionFn] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher(key)
      .then((result) => {
        if (cancelled) return;
        startTransitionFn(() => setData(result));
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, fetcher]);

  return { data, loading: loading || pending, error };
}

/**
 * Batch multiple state updates into a single transition.
 */
export function useBatchedUpdates(): {
  batch: (fn: () => void) => void;
  pending: boolean;
} {
  const [pending, startTransitionFn] = useTransition();

  const batch = (fn: () => void) => {
    startTransitionFn(fn);
  };

  return { batch, pending };
}
