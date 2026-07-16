import { type ComponentType } from 'react';
/**
 * Registers a component for pledge hydration.
 */
export declare function registerPledgeComponent(id: string, Component: ComponentType): void;
/**
 * Initializes the pledge hydration runtime.
 * Scans the DOM and hydrates all pledged components.
 */
export declare function initPledgeHydration(): void;
/**
 * Re-hydrates all pledges on the page.
 * Called after page transitions to hydrate new content.
 */
export declare function rehydratePledges(): void;
//# sourceMappingURL=hydrate-pledges.d.ts.map