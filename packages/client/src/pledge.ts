import { createElement, type ComponentType, type ReactNode } from 'react';
import {
  PLEDGE_MARKER,
  PLEDGE_ID,
  PLEDGE_STRATEGY,
  PLEDGE_PROPS,
  PLEDGE_MEDIA,
  PLEDGE_ROOT_MARGIN,
  PLEDGE_THRESHOLD,
  type PledgeStrategy,
} from '@pledgestack/shared';

let pledgeCounter = 0;

const pledgeRegistry = new Map<string, { Component: ComponentType<Record<string, unknown>>; options: PledgeOptionsInternal }>();

interface PledgeOptionsInternal {
  strategy: PledgeStrategy;
  mediaQuery?: string;
  rootMargin?: string;
  threshold?: number;
  name?: string;
}

/**
 * Wraps a component as a Pledge — a component that is server-rendered
 * by default but hydrated on the client with the specified strategy.
 *
 * @example
 * const Counter = pledge(MyCounter, { strategy: 'visible' });
 * <Counter count={0} />
 *
 * Strategies:
 * - 'load'    — Hydrate immediately on page load
 * - 'visible' — Hydrate when visible (IntersectionObserver)
 * - 'idle'    — Hydrate on requestIdleCallback
 * - 'only'    — Skip SSR, render only on client
 * - 'media'   — Hydrate when media query matches
 */
export function pledge<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  options: { strategy: PledgeStrategy; mediaQuery?: string; rootMargin?: string; threshold?: number; name?: string },
): ComponentType<P> {
  const pledgeId = `pledge_${++pledgeCounter}`;
  const name = options.name ?? Component.displayName ?? Component.name ?? 'Anonymous';

  pledgeRegistry.set(pledgeId, { Component: Component as ComponentType<Record<string, unknown>>, options });

  const Wrapped: ComponentType<P> = (props: P) => {
    if (typeof window === 'undefined') {
      // Server-side: render the component and wrap with marker attributes
      const serializedProps = JSON.stringify(props);
      const attributes: Record<string, string> = {
        [PLEDGE_MARKER]: name,
        [PLEDGE_ID]: pledgeId,
        [PLEDGE_STRATEGY]: options.strategy,
        [PLEDGE_PROPS]: serializedProps,
      };

      if (options.mediaQuery) {
        attributes[PLEDGE_MEDIA] = options.mediaQuery;
      }
      if (options.rootMargin) {
        attributes[PLEDGE_ROOT_MARGIN] = options.rootMargin;
      }
      if (options.threshold !== undefined) {
        attributes[PLEDGE_THRESHOLD] = String(options.threshold);
      }

      if (options.strategy === 'only') {
        // Skip SSR — render a placeholder
        return createElement('div', attributes) as ReactNode;
      }

      // Render the component with marker attributes on the wrapper
      return createElement('div', attributes, createElement(Component, props)) as ReactNode;
    }

    // Client-side: just render the component (hydration runtime handles mounting)
    return createElement(Component, props);
  };

  Wrapped.displayName = `pledge(${name})`;
  return Wrapped;
}

/**
 * Returns the pledge registry (for client hydration runtime).
 */
export function getPledgeRegistry(): Map<string, { Component: ComponentType<Record<string, unknown>>; options: PledgeOptionsInternal }> {
  return pledgeRegistry;
}
