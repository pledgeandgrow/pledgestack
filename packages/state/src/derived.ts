import { useMemo, useRef } from 'react';

export interface DerivedOptions<T> {
  /** Equality check function (default: Object.is) */
  isEqual?: (a: T, b: T) => boolean;
  /** Maximum cache size (default: 1) */
  cacheSize?: number;
}

export function useDerived<T, Args extends unknown[]>(
  compute: (...args: Args) => T,
  deps: Args,
  options: DerivedOptions<T> = {},
): T {
  const { isEqual = Object.is, cacheSize = 1 } = options;
  const cacheRef = useRef<Array<{ deps: Args; value: T }>>([]);

  return useMemo(() => {
    for (const entry of cacheRef.current) {
      if (entry.deps.length === deps.length && entry.deps.every((d, i) => isEqual(d as T, deps[i] as T))) {
        return entry.value;
      }
    }

    const value = compute(...deps);

    cacheRef.current.unshift({ deps: [...deps] as Args, value });
    if (cacheRef.current.length > cacheSize) {
      cacheRef.current.length = cacheSize;
    }

    return value;
  }, [compute, deps, isEqual, cacheSize]);
}
