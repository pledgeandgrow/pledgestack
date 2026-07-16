import type { PledgeRequest } from '@pledgestack/shared';
/**
 * Sets the current request context for server utilities.
 * Called by the request handler before rendering.
 */
export declare function setRequestContext(req: PledgeRequest): void;
/**
 * Clears the current request context.
 * Called after the request is complete.
 */
export declare function clearRequestContext(): void;
/**
 * Reads cookies from the current request.
 * Returns a readonly record of cookie name -> value.
 */
export declare function cookies(): Record<string, string>;
/**
 * Reads headers from the current request.
 * Returns a readonly record of header name -> value.
 */
export declare function headers(): Record<string, string>;
/**
 * Reads the current request's search params / query.
 */
export declare function searchParams(): Record<string, string>;
/**
 * Gets the current request params (route parameters).
 */
export declare function params(): Record<string, string>;
/**
 * Draft mode / preview mode utility.
 * Returns an object with isEnabled and enable/enable methods.
 */
export declare function draftMode(): {
    isEnabled: boolean;
    enable(): void;
    disable(): void;
};
//# sourceMappingURL=server-utils.d.ts.map