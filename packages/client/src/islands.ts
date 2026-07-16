import { useEffect, useRef, useState } from 'react';
import { createElement } from 'react';

export interface IslandOptions {
  /** Hydrate on interaction (default: 'visible') */
  strategy?: 'visible' | 'idle' | 'interaction' | 'media';
  /** Selector for interaction events (default: 'click') */
  on?: string;
  /** Media query for 'media' strategy */
  mediaQuery?: string;
  /** Placeholder while not hydrated */
  placeholder?: 'inherit' | 'empty' | 'height';
}

export function Island<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  options: IslandOptions = {},
) {
  const { strategy = 'visible', on = 'click', mediaQuery, placeholder = 'inherit' } = options;

  function IslandWrapper(props: T & { 'data-island'?: string }) {
    const [hydrated, setHydrated] = useState(false);
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
      if (hydrated) return;

      if (strategy === 'idle') {
        const idle = requestIdleCallback(() => setHydrated(true));
        return () => cancelIdleCallback(idle);
      }

      if (strategy === 'visible' && ref.current) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              setHydrated(true);
              observer.disconnect();
            }
          },
          { rootMargin: '100px' },
        );
        observer.observe(ref.current);
        return () => observer.disconnect();
      }

      if (strategy === 'interaction' && ref.current) {
        const handler = () => setHydrated(true);
        ref.current.addEventListener(on, handler, { once: true });
        return () => ref.current?.removeEventListener(on, handler);
      }

      if (strategy === 'media' && mediaQuery) {
        const mq = window.matchMedia(mediaQuery);
        if (mq.matches) {
          setHydrated(true);
        } else {
          const handler = (e: MediaQueryListEvent) => {
            if (e.matches) setHydrated(true);
          };
          mq.addEventListener('change', handler);
          return () => mq.removeEventListener('change', handler);
        }
      }
    }, [hydrated, strategy, on, mediaQuery]);

    if (hydrated) {
      return createElement(Component, props);
    }

    const placeholderStyle = placeholder === 'empty' ? { minHeight: '0' }
      : placeholder === 'height' ? { minHeight: '100px' }
      : {};

    return createElement('div', {
      ref,
      'data-island': 'pending',
      style: placeholderStyle,
    });
  }

  return IslandWrapper;
}

// Polyfill for requestIdleCallback
type IdleCallback = (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void;
function requestIdleCallback(cb: IdleCallback): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as unknown as { requestIdleCallback: (cb: IdleCallback) => number }).requestIdleCallback(cb);
  }
  return setTimeout(() => cb({ timeRemaining: () => 50, didTimeout: false }), 1) as unknown as number;
}

function cancelIdleCallback(id: number) {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
