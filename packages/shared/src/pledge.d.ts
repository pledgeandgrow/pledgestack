/**
 * Pledge System — Pledge architecture types.
 *
 * Components are server-rendered by default (zero client JS).
 * Use `pledge()` to opt a component into client-side hydration.
 * Use `serverAction()` for type-safe server function calls.
 */
export type PledgeStrategy = 'load' | 'visible' | 'idle' | 'only' | 'media';
export interface PledgeOptions {
    strategy: PledgeStrategy;
    /** Media query for 'media' strategy */
    mediaQuery?: string;
    /** IntersectionObserver root margin for 'visible' strategy */
    rootMargin?: string;
    /** IntersectionObserver threshold for 'visible' strategy */
    threshold?: number;
    /** Optional name for debugging */
    name?: string;
}
export interface PledgeManifestEntry {
    /** Unique pledge ID */
    id: string;
    /** Component module path (for client-side lookup) */
    componentPath: string;
    /** Export name (default or named) */
    exportName: string;
    /** Hydration strategy */
    strategy: PledgeStrategy;
    /** Serialized props */
    props: string;
    /** Media query for 'media' strategy */
    mediaQuery?: string;
    /** IntersectionObserver root margin */
    rootMargin?: string;
    /** IntersectionObserver threshold */
    threshold?: number;
}
export interface PledgeManifest {
    pledges: PledgeManifestEntry[];
}
export interface ServerActionMeta {
    /** Unique action ID */
    id: string;
    /** Function name for debugging */
    name: string;
}
/**
 * Marker attributes injected into DOM for pledge hydration.
 */
export declare const PLEDGE_MARKER = "data-pledge-component";
export declare const PLEDGE_ID = "data-pledge-id";
export declare const PLEDGE_STRATEGY = "data-pledge-strategy";
export declare const PLEDGE_PROPS = "data-pledge-props";
export declare const PLEDGE_MEDIA = "data-pledge-media";
export declare const PLEDGE_ROOT_MARGIN = "data-pledge-root-margin";
export declare const PLEDGE_THRESHOLD = "data-pledge-threshold";
export declare const MANIFEST_SCRIPT_ID = "__pledge_manifest__";
export declare const ACTION_ENDPOINT = "/__pledge__/action";
//# sourceMappingURL=pledge.d.ts.map