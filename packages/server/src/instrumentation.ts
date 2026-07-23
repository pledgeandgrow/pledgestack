/**
 * instrumentation.ts — Server lifecycle hooks for startup initialization.
 *
 * Supports a `register()` export from `instrumentation.ts` in the app root,
 * called once during server startup before any requests are handled.
 * Used for OpenTelemetry setup, DB pool initialization, feature flag bootstrap, etc.
 */

export interface InstrumentationContext {
  /** The resolved PledgeConfig */
  config: import('pledgestack-shared').PledgeConfig;
  /** The server instance (Node.js http.Server or edge adapter) */
  server: unknown;
  /** Whether the server is starting in dev or production mode */
  isDev: boolean;
}

export type RegisterFunction = (context: InstrumentationContext) => void | Promise<void>;

/**
 * Registry for instrumentation register() functions.
 * In practice, the framework loads `instrumentation.ts` from the app root
 * and calls its `register()` export. This module provides the type contract
 * and a programmatic registry for plugins and testing.
 */
const registerFunctions: Array<{ name: string; fn: RegisterFunction }> = [];

export function registerInstrumentation(name: string, fn: RegisterFunction): void {
  registerFunctions.push({ name, fn });
}

export async function runInstrumentation(context: InstrumentationContext): Promise<void> {
  for (const { name, fn } of registerFunctions) {
    try {
      await fn(context);
    } catch (err) {
      console.error(`[pledgestack] Instrumentation "${name}" failed:`, err);
      throw err;
    }
  }
}

export function clearInstrumentation(): void {
  registerFunctions.length = 0;
}

export function getRegisteredInstrumentations(): string[] {
  return registerFunctions.map((r) => r.name);
}

/**
 * Loads and executes the `register()` function from the app's `instrumentation.ts`.
 * Called by the server during startup.
 */
export async function loadInstrumentation(
  config: import('pledgestack-shared').PledgeConfig,
  server: unknown,
  isDev: boolean,
): Promise<void> {
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const { existsSync } = await import('node:fs');

  // In production, the file is compiled to .js; in dev, it's .ts
  const tsPath = join(config.rootDir, config.appDir, 'instrumentation.ts');
  const jsPath = join(config.rootDir, config.appDir, 'instrumentation.js');
  const instrumentationPath = isDev ? tsPath : (existsSync(jsPath) ? jsPath : tsPath);

  try {
    const mod = await import(pathToFileURL(instrumentationPath).href);
    if (typeof mod.register === 'function') {
      await mod.register({ config, server, isDev } as InstrumentationContext);
    }
  } catch {
    // instrumentation.ts is optional — silently skip if not found
  }
}
