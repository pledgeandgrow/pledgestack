/**
 * React Fast Refresh wiring for PledgeStack dev mode.
 * Uses react-refresh/runtime to preserve state during HMR.
 */
/**
 * Initializes Fast Refresh by dynamically importing react-refresh/runtime.
 * Call this once at startup in dev mode.
 */
export declare function initFastRefresh(): Promise<void>;
/**
 * Injects the Fast Refresh preamble into the page.
 * This must be called before the first React render.
 */
export declare function injectFastRefresh(): void;
/**
 * Registers a component for Fast Refresh.
 * Call this in every component module to enable HMR.
 */
export declare function registerForFastRefresh(type: unknown, id: string): void;
/**
 * Signs that a module has been evaluated.
 * Called at the end of each module to trigger Fast Refresh.
 */
export declare function signModuleForRefresh(): void;
//# sourceMappingURL=fast-refresh.d.ts.map