/**
 * Pledge System — Pledge architecture types.
 *
 * Components are server-rendered by default (zero client JS).
 * Use `pledge()` to opt a component into client-side hydration.
 * Use `serverAction()` for type-safe server function calls.
 */
/**
 * Marker attributes injected into DOM for pledge hydration.
 */
export const PLEDGE_MARKER = 'data-pledge-component';
export const PLEDGE_ID = 'data-pledge-id';
export const PLEDGE_STRATEGY = 'data-pledge-strategy';
export const PLEDGE_PROPS = 'data-pledge-props';
export const PLEDGE_MEDIA = 'data-pledge-media';
export const PLEDGE_ROOT_MARGIN = 'data-pledge-root-margin';
export const PLEDGE_THRESHOLD = 'data-pledge-threshold';
export const MANIFEST_SCRIPT_ID = '__pledge_manifest__';
export const ACTION_ENDPOINT = '/__pledge__/action';
//# sourceMappingURL=pledge.js.map