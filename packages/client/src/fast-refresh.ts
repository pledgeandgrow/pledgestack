/**
 * React Fast Refresh wiring for PledgeStack dev mode.
 * Uses react-refresh/runtime to preserve state during HMR.
 */

type RefreshRuntime = {
  injectIntoGlobalHook: (hook: object) => void;
  register: (type: unknown, id: string) => void;
  sign: () => void;
};

let refreshRuntime: RefreshRuntime | null = null;

/**
 * Initializes Fast Refresh by dynamically importing react-refresh/runtime.
 * Call this once at startup in dev mode.
 */
export async function initFastRefresh(): Promise<void> {
  try {
    const mod = await import('react-refresh/runtime');
    refreshRuntime = mod as unknown as RefreshRuntime;
  } catch {
    // react-refresh not installed — Fast Refresh disabled
  }
}

/**
 * Injects the Fast Refresh preamble into the page.
 * This must be called before the first React render.
 */
export function injectFastRefresh(): void {
  if (!refreshRuntime) return;
  refreshRuntime.injectIntoGlobalHook(window);
}

/**
 * Registers a component for Fast Refresh.
 * Call this in every component module to enable HMR.
 */
export function registerForFastRefresh(
  type: unknown,
  id: string,
): void {
  if (!refreshRuntime) return;
  refreshRuntime.register(type, id);
}

/**
 * Signs that a module has been evaluated.
 * Called at the end of each module to trigger Fast Refresh.
 */
export function signModuleForRefresh(): void {
  if (!refreshRuntime) return;
  refreshRuntime.sign();
}
