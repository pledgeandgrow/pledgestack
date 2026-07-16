import type { ReactNode } from 'react';
/**
 * Initializes client-side hydration.
 * Uses the Pledge System — only components wrapped with `pledge()` get hydrated.
 * Everything else is static HTML with zero client JS.
 *
 * Called automatically on page load.
 */
export declare function hydrate(element?: ReactNode): void;
/**
 * Client-side render (for client-only routes or fallback).
 */
export declare function render(element: ReactNode): void;
//# sourceMappingURL=hydrate.d.ts.map