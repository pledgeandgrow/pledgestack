export interface HMRWatcherOptions {
    /** Directory to watch for changes */
    watchDir: string;
    /** Callback when a file changes */
    onChange: (filePath: string) => void;
    /** Debounce interval in ms (default: 100) */
    debounceMs?: number;
}
export interface HMRWatcher {
    start: () => void;
    stop: () => void;
}
/**
 * Creates a file watcher for HMR in development mode.
 * Watches the app directory for changes to route files, layouts,
 * middleware, and other source files, triggering handler invalidation.
 */
export declare function createHMRWatcher(options: HMRWatcherOptions): HMRWatcher;
//# sourceMappingURL=hmr.d.ts.map