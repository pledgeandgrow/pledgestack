import type { PledgeRequest } from 'pledgestack-shared';
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
 * Reads or mutates cookies for the current request.
 *
 * Reading: returns a record of cookie name -> value.
 * Mutation: pass a setter function to set response cookies.
 *
 * Usage:
 *   const c = cookies(); // read request cookies
 *   cookies((c) => { c.set('session', 'abc', { httpOnly: true }) }); // set response cookie
 */
export declare function cookies(setter?: (jar: CookieJar) => void): Record<string, string>;
/**
 * Reads or mutates headers for the current request.
 *
 * Reading: returns a readonly record of header name -> value.
 * Mutation: pass a setter function to set response headers.
 *
 * Usage:
 *   const h = headers(); // read request headers
 *   headers((h) => { h.set('X-Custom', 'value') }); // set response header
 */
export declare function headers(setter?: (headerStore: HeaderStore) => void): Record<string, string>;
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
export interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    expires?: Date;
    path?: string;
    domain?: string;
}
export declare class CookieJar {
    private store;
    constructor(store: Record<string, string>);
    set(name: string, value: string, options?: CookieOptions): void;
    delete(name: string, options?: CookieOptions): void;
    get(name: string): string | undefined;
    getAll(): Record<string, string>;
}
export declare class HeaderStore {
    private store;
    constructor(store: Record<string, string>);
    set(name: string, value: string): void;
    append(name: string, value: string): void;
    delete(name: string): void;
    get(name: string): string | undefined;
    getAll(): Record<string, string>;
}
export declare class RedirectError extends Error {
    readonly destination: string;
    readonly status: number;
    constructor(destination: string, status?: number);
}
export declare function redirect(destination: string, status?: number): never;
export declare class NotFoundError extends Error {
    constructor();
}
export declare function notFound(): never;
export declare function after(callback: () => Promise<void> | void): void;
export declare function getAfterCallbacks(): Array<() => Promise<void> | void>;
export interface ConnectionState {
    /** Whether the connection is still open */
    isOpen: boolean;
    /** Whether the response has started streaming */
    isStreaming: boolean;
    /** Wait for the connection to be ready (edge/streaming) */
    ready: () => Promise<void>;
}
export declare function connection(): ConnectionState;
export declare function getRedirectDestination(): {
    destination: string;
    status: number;
} | null;
export declare function wasNotFoundCalled(): boolean;
//# sourceMappingURL=server-utils.d.ts.map