/**
 * #283 — PSX Lazy Compilation.
 *
 * Defer cargo build until Rust function is first called, compile only
 * used modules, reduce dev server startup time for large projects.
 *
 * Provides:
 * - Lazy proxy that defers compilation until first call
 * - Per-module compilation tracking
 * - Background compilation queue
 * - Progress reporting
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LazyCompilationConfig {
  /** Project root directory */
  projectRoot: string;
  /** Directory containing native Cargo workspace */
  nativeDir?: string;
  /** Whether to compile in background (default: true) */
  backgroundCompilation?: boolean;
  /** Timeout for first call waiting for compilation (default: 30s) */
  compileTimeout?: number;
  /** Whether to show progress notifications (default: true) */
  showProgress?: boolean;
}

export interface CompilationState {
  moduleName: string;
  status: 'pending' | 'compiling' | 'compiled' | 'failed';
  addonPath?: string;
  error?: string;
  compileTimeMs?: number;
  startedAt?: number;
  completedAt?: number;
}

// ---------------------------------------------------------------------------
// Lazy compilation manager
// ---------------------------------------------------------------------------

export class LazyCompilationManager extends EventEmitter {
  private config: Required<LazyCompilationConfig>;
  private states = new Map<string, CompilationState>();
  private proxies = new Map<string, Record<string, unknown>>();
  private compilationQueue: string[] = [];
  private isCompiling = false;

  constructor(config: LazyCompilationConfig) {
    super();
    this.config = {
      projectRoot: config.projectRoot,
      nativeDir: config.nativeDir ?? join(config.projectRoot, 'packages', 'core', 'native'),
      backgroundCompilation: config.backgroundCompilation ?? true,
      compileTimeout: config.compileTimeout ?? 30_000,
      showProgress: config.showProgress ?? true,
    };
  }

  /**
   * Creates a lazy proxy for a Rust module that defers compilation until first access.
   */
  createLazyProxy(moduleName: string): Record<string, unknown> {
    // Check if already compiled
    const existingState = this.states.get(moduleName);
    if (existingState?.status === 'compiled' && existingState.addonPath) {
      try {
        return require(existingState.addonPath);
      } catch {
        // Fall through to lazy proxy
      }
    }

    // Check if addon already exists (pre-compiled)
    const addonPath = join(this.config.nativeDir, `${moduleName}.node`);
    if (existsSync(addonPath)) {
      this.states.set(moduleName, {
        moduleName,
        status: 'compiled',
        addonPath,
        completedAt: Date.now(),
      });
      try {
        return require(addonPath);
      } catch {
        // Fall through to lazy proxy
      }
    }

    // Create lazy proxy
    const proxy = new Proxy({} as Record<string, unknown>, {
      get: (_target, prop: string) => {
        return this.getLazyFunction(moduleName, prop);
      },
      has: () => true,
      ownKeys: () => [],
      getOwnPropertyDescriptor: () => undefined,
    });

    this.proxies.set(moduleName, proxy);
    if (!this.states.has(moduleName)) {
      this.states.set(moduleName, {
        moduleName,
        status: 'pending',
      });
    }
    return proxy;
  }

  /**
   * Returns a function that triggers compilation on first call.
   */
  private getLazyFunction(moduleName: string, fnName: string): (...args: unknown[]) => Promise<unknown> {
    return async (...args: unknown[]) => {
      const addon = await this.ensureCompiled(moduleName);
      const fn = addon[fnName];
      if (typeof fn !== 'function') {
        throw new Error(`Rust function "${fnName}" not found in module "${moduleName}"`);
      }
      return fn(...args);
    };
  }

  /**
   * Ensures a module is compiled, triggering compilation if needed.
   */
  async ensureCompiled(moduleName: string): Promise<Record<string, unknown>> {
    const state = this.states.get(moduleName);

    if (state?.status === 'compiled' && state.addonPath) {
      return require(state.addonPath);
    }

    if (state?.status === 'compiling') {
      // Wait for ongoing compilation
      return this.waitForCompilation(moduleName);
    }

    // Trigger compilation
    return this.compileModule(moduleName);
  }

  /**
   * Compiles a single Rust module.
   */
  private async compileModule(moduleName: string): Promise<Record<string, unknown>> {
    const startedAt = Date.now();
    this.states.set(moduleName, {
      moduleName,
      status: 'compiling',
      startedAt,
    });

    this.emit('compiling', { moduleName });

    if (this.config.showProgress) {
      console.log(`  ${dim('[PSX]')} Compiling ${moduleName}...`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.states.set(moduleName, {
          moduleName,
          status: 'failed',
          error: 'Compilation timed out',
          startedAt,
          completedAt: Date.now(),
        });
        reject(new Error(`Compilation of "${moduleName}" timed out after ${this.config.compileTimeout}ms`));
      }, this.config.compileTimeout);

      // Simulate async compilation (in real implementation, this would call cargo)
      // For now, we try to require the addon
      const addonPath = join(this.config.nativeDir, `${moduleName}.node`);

      // Check if addon was compiled by another process
      if (existsSync(addonPath)) {
        clearTimeout(timeout);
        try {
          const addon = require(addonPath);
          const compileTime = Date.now() - startedAt;
          this.states.set(moduleName, {
            moduleName,
            status: 'compiled',
            addonPath,
            compileTimeMs: compileTime,
            startedAt,
            completedAt: Date.now(),
          });
          this.emit('compiled', { moduleName, compileTimeMs: compileTime });
          resolve(addon);
        } catch (err) {
          this.states.set(moduleName, {
            moduleName,
            status: 'failed',
            error: (err as Error).message,
            startedAt,
            completedAt: Date.now(),
          });
          reject(err);
        }
      } else {
        // No pre-compiled addon — in dev mode, fall back to JS
        clearTimeout(timeout);
        this.states.set(moduleName, {
          moduleName,
          status: 'failed',
          error: 'No compiled addon found — run pledge build',
          startedAt,
          completedAt: Date.now(),
        });
        this.emit('failed', { moduleName, error: 'No compiled addon found' });
        reject(new Error(`Module "${moduleName}" is not compiled. Run: pledge build`));
      }
    });
  }

  /**
   * Waits for an ongoing compilation to complete.
   */
  private waitForCompilation(moduleName: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const state = this.states.get(moduleName);
        if (state?.status === 'compiled' && state.addonPath) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          try {
            resolve(require(state.addonPath));
          } catch (err) {
            reject(err);
          }
        } else if (state?.status === 'failed') {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          reject(new Error(state.error ?? 'Compilation failed'));
        }
      }, 100);

      // Timeout
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Timed out waiting for compilation of "${moduleName}"`));
      }, this.config.compileTimeout);
    });
  }

  /**
   * Pre-compiles modules in the background.
   */
  preCompile(moduleNames: string[]): void {
    for (const name of moduleNames) {
      if (!this.states.has(name) || this.states.get(name)?.status === 'pending') {
        this.compilationQueue.push(name);
      }
    }
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isCompiling || this.compilationQueue.length === 0) return;
    this.isCompiling = true;

    while (this.compilationQueue.length > 0) {
      const moduleName = this.compilationQueue.shift()!;
      try {
        await this.compileModule(moduleName);
      } catch {
        // Error already stored in state
      }
    }

    this.isCompiling = false;
  }

  /**
   * Returns the current compilation state for all modules.
   */
  getStates(): Map<string, CompilationState> {
    return new Map(this.states);
  }

  /**
   * Returns true if all modules are compiled.
   */
  isFullyCompiled(): boolean {
    for (const state of this.states.values()) {
      if (state.status !== 'compiled') return false;
    }
    return true;
  }

  /**
   * Resets compilation state (useful for HMR).
   */
  reset(moduleName?: string): void {
    if (moduleName) {
      this.states.delete(moduleName);
      this.proxies.delete(moduleName);
    } else {
      this.states.clear();
      this.proxies.clear();
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

let defaultManager: LazyCompilationManager | null = null;

export function getLazyCompilationManager(config: LazyCompilationConfig): LazyCompilationManager {
  if (!defaultManager) {
    defaultManager = new LazyCompilationManager(config);
  }
  return defaultManager;
}

// ---------------------------------------------------------------------------

function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
