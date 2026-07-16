import { type ComponentType } from 'react';
import { type PledgeStrategy } from '@pledgestack/shared';
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
export declare function pledge<P extends Record<string, unknown>>(Component: ComponentType<P>, options: {
    strategy: PledgeStrategy;
    mediaQuery?: string;
    rootMargin?: string;
    threshold?: number;
    name?: string;
}): ComponentType<P>;
/**
 * Returns the pledge registry (for client hydration runtime).
 */
export declare function getPledgeRegistry(): Map<string, {
    Component: ComponentType<Record<string, unknown>>;
    options: PledgeOptionsInternal;
}>;
export {};
//# sourceMappingURL=pledge.d.ts.map