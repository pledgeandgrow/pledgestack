export type FetchCacheOption = 'force-cache' | 'no-store' | 'default' | 'isr';
export interface FetchOptions extends Omit<RequestInit, 'cache'> {
    /** Cache behavior: 'force-cache' (cache indefinitely), 'no-store' (bypass cache), 'isr' (cache with revalidation) */
    cache?: FetchCacheOption;
    /** Revalidation interval in seconds (only used with cache: 'isr') */
    revalidate?: number;
    /** Tags for on-demand revalidation */
    tags?: string[];
}
/**
 * Cached fetch implementation for server-side data fetching.
 * Supports 'force-cache', 'no-store', 'default', and 'isr' cache modes.
 */
export declare function cachedFetch(url: string | URL, options?: FetchOptions): Promise<Response>;
/**
 * Revalidates all cached responses associated with a tag.
 */
export declare function revalidateTag(tag: string): void;
/**
 * Revalidates a specific path's cached responses.
 */
export declare function revalidatePath(path: string): void;
/**
 * Clears the entire fetch cache.
 */
export declare function clearFetchCache(): void;
//# sourceMappingURL=fetch-cache.d.ts.map