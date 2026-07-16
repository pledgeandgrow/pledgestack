import { hydrateRoot, createRoot } from 'react-dom/client';
import { createElement, type ComponentType } from 'react';
import {
  PLEDGE_MARKER,
  PLEDGE_ID,
  PLEDGE_STRATEGY,
  PLEDGE_PROPS,
  PLEDGE_MEDIA,
  PLEDGE_ROOT_MARGIN,
  PLEDGE_THRESHOLD,
  MANIFEST_SCRIPT_ID,
  type PledgeManifest,
  type PledgeManifestEntry,
} from '@pledgestack/shared';

/**
 * Client-side pledge hydration runtime.
 *
 * Scans the DOM for elements with `data-pledge-component` attributes
 * and hydrates them according to their strategy:
 *
 * - 'load'    — hydrate immediately
 * - 'visible' — hydrate when scrolled into view (IntersectionObserver)
 * - 'idle'    — hydrate on requestIdleCallback
 * - 'only'    — render from scratch (no SSR content)
 * - 'media'   — hydrate when media query matches
 */

const hydratedPledges = new Set<string>();

/**
 * Component registry — maps pledge IDs to component constructors.
 * Populated by the pledge() HOC and by dynamically imported modules.
 */
const componentRegistry = new Map<string, ComponentType>();

/**
 * Registers a component for pledge hydration.
 */
export function registerPledgeComponent(id: string, Component: ComponentType): void {
  componentRegistry.set(id, Component);
}

/**
 * Initializes the pledge hydration runtime.
 * Scans the DOM and hydrates all pledged components.
 */
export function initPledgeHydration(): void {
  if (typeof window === 'undefined') return;

  // Load manifest from script tag
  const manifest = loadManifest();
  if (manifest) {
    for (const entry of manifest.pledges) {
      hydratePledge(entry);
    }
  }

  // Also scan DOM directly for pledge markers (fallback)
  scanDomForPledges();
}

/**
 * Loads the pledge manifest from the script tag injected by SSR.
 */
function loadManifest(): PledgeManifest | null {
  const script = document.getElementById(MANIFEST_SCRIPT_ID);
  if (!script?.textContent) return null;

  try {
    return JSON.parse(script.textContent) as PledgeManifest;
  } catch {
    return null;
  }
}

/**
 * Scans the DOM for elements with pledge markers.
 * Used as fallback when manifest is not available.
 */
function scanDomForPledges(): void {
  const elements = document.querySelectorAll(`[${PLEDGE_MARKER}]`);
  for (const el of elements) {
    if (!(el instanceof HTMLElement)) continue;

    const id = el.getAttribute(PLEDGE_ID);
    if (!id || hydratedPledges.has(id)) continue;

    const entry: PledgeManifestEntry = {
      id,
      componentPath: '',
      exportName: 'default',
      strategy: el.getAttribute(PLEDGE_STRATEGY) as PledgeManifestEntry['strategy'],
      props: el.getAttribute(PLEDGE_PROPS) ?? '{}',
      mediaQuery: el.getAttribute(PLEDGE_MEDIA) ?? undefined,
      rootMargin: el.getAttribute(PLEDGE_ROOT_MARGIN) ?? undefined,
      threshold: el.getAttribute(PLEDGE_THRESHOLD)
        ? Number(el.getAttribute(PLEDGE_THRESHOLD))
        : undefined,
    };

    hydratePledge(entry);
  }
}

/**
 * Hydrates a single pledge based on its strategy.
 */
function hydratePledge(entry: PledgeManifestEntry): void {
  if (hydratedPledges.has(entry.id)) return;

  const element = document.querySelector(`[${PLEDGE_ID}="${entry.id}"]`);
  if (!(element instanceof HTMLElement)) return;

  const Component = componentRegistry.get(entry.id);
  if (!Component) {
    // Component not yet registered — will be hydrated when registered
    return;
  }

  const props = JSON.parse(entry.props) as Record<string, unknown>;

  const doHydrate = () => {
    if (hydratedPledges.has(entry.id)) return;
    hydratedPledges.add(entry.id);

    if (entry.strategy === 'only') {
      // No SSR content — create fresh root
      element.innerHTML = '';
      const root = createRoot(element);
      root.render(createElement(Component, props));
    } else {
      // Hydrate existing SSR content
      hydrateRoot(element, createElement(Component, props));
    }
  };

  switch (entry.strategy) {
    case 'load':
      doHydrate();
      break;

    case 'idle':
      if ('requestIdleCallback' in window) {
        (window as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(doHydrate);
      } else {
        setTimeout(doHydrate, 1);
      }
      break;

    case 'visible': {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const obsEntry of entries) {
            if (obsEntry.isIntersecting) {
              doHydrate();
              observer.disconnect();
            }
          }
        },
        {
          rootMargin: entry.rootMargin ?? '0px',
          threshold: entry.threshold ?? 0,
        },
      );
      observer.observe(element);
      break;
    }

    case 'media': {
      if (!entry.mediaQuery) {
        doHydrate();
        break;
      }
      const mql = window.matchMedia(entry.mediaQuery);
      if (mql.matches) {
        doHydrate();
      } else {
        const handler = () => {
          if (mql.matches) {
            doHydrate();
            mql.removeEventListener('change', handler);
          }
        };
        mql.addEventListener('change', handler);
      }
      break;
    }

    case 'only':
      doHydrate();
      break;

    default:
      doHydrate();
  }
}

/**
 * Re-hydrates all pledges on the page.
 * Called after page transitions to hydrate new content.
 */
export function rehydratePledges(): void {
  hydratedPledges.clear();
  scanDomForPledges();
}
