import { hydrateRoot, createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { initPledgeHydration } from './hydrate-pledges';

/**
 * Initializes client-side hydration.
 * Uses the Pledge System — only components wrapped with `pledge()` get hydrated.
 * Everything else is static HTML with zero client JS.
 *
 * Called automatically on page load.
 */
export function hydrate(element?: ReactNode): void {
  // Initialize pledge-based hydration (scans DOM for pledge markers)
  initPledgeHydration();

  // If a full React tree is provided (legacy/fallback), hydrate the root
  if (element) {
    const root = document.getElementById('__pledge_root__');
    if (!root) {
      console.error('[pledgestack] Root element #__pledge_root__ not found');
      return;
    }
    hydrateRoot(root, createElement(() => element));
  }
}

/**
 * Client-side render (for client-only routes or fallback).
 */
export function render(element: ReactNode): void {
  const root = document.getElementById('__pledge_root__');
  if (!root) {
    console.error('[pledgestack] Root element #__pledge_root__ not found');
    return;
  }

  const reactRoot = createRoot(root);
  reactRoot.render(createElement(() => element));
}
