import { useEffect, useCallback, useRef, useState } from 'react';

export interface PrefetchOptions {
  /** Prefetch on hover (default: true) */
  onHover?: boolean;
  /** Prefetch on viewport intersection (default: true) */
  onVisible?: boolean;
  /** Prefetch when link is near viewport (default: false) */
  onNear?: boolean;
  /** Distance for 'onNear' in pixels (default: 200) */
  nearDistance?: number;
  /** Max concurrent prefetches (default: 5) */
  maxConcurrent?: number;
  /** Cache prefetched data (default: true) */
  cache?: boolean;
}

const prefetchCache = new Set<string>();
let activePrefetches = 0;

export function usePrefetch(href: string, options: PrefetchOptions = {}) {
  const {
    onHover = true,
    onVisible = true,
    onNear = false,
    nearDistance = 200,
    maxConcurrent = 5,
  } = options;

  const ref = useRef<HTMLAnchorElement>(null);
  const [prefetched, setPrefetched] = useState(false);

  const doPrefetch = useCallback(() => {
    if (prefetchCache.has(href) || activePrefetches >= maxConcurrent) return;

    prefetchCache.add(href);
    activePrefetches++;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    link.onload = () => {
      activePrefetches--;
      setPrefetched(true);
    };
    link.onerror = () => {
      activePrefetches--;
      prefetchCache.delete(href);
    };

    document.head.appendChild(link);
  }, [href, maxConcurrent]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (onVisible) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            doPrefetch();
            observer.disconnect();
          }
        },
        { rootMargin: onNear ? `${nearDistance}px` : '0px' },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }

    if (onHover) {
      const handler = () => doPrefetch();
      el.addEventListener('mouseenter', handler, { once: true });
      el.addEventListener('focus', handler, { once: true });
      return () => {
        el.removeEventListener('mouseenter', handler);
        el.removeEventListener('focus', handler);
      };
    }
  }, [onHover, onVisible, onNear, nearDistance, doPrefetch]);

  return { ref, prefetched };
}

export function prefetchRoute(href: string): void {
  if (prefetchCache.has(href)) return;
  prefetchCache.add(href);

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = 'document';
  document.head.appendChild(link);
}

export function isPrefetched(href: string): boolean {
  return prefetchCache.has(href);
}

export function clearPrefetchCache(): void {
  prefetchCache.clear();
}
