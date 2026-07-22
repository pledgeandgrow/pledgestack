import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { PledgeConfig } from 'pledgestack-shared';
import type { PageModule, LayoutModule, RouteHandlerModule, MiddlewareModule, LoadingModule, ErrorModule, NotFoundModule, HeadModule } from 'pledgestack-core';
import type { ResolvedRoute } from 'pledgestack-shared';
import { transformFile } from './transform';

export type LoadedModule = PageModule | LayoutModule | RouteHandlerModule | MiddlewareModule | LoadingModule | ErrorModule | NotFoundModule | HeadModule;

export interface ModuleLoader {
  /** Load a single route module by file path */
  load(filePath: string): Promise<LoadedModule>;
  /** Load all modules for a set of resolved routes */
  loadAll(routes: ResolvedRoute[]): Promise<Map<string, LoadedModule>>;
  /** Invalidate a specific module (for HMR) */
  invalidate(filePath: string): void;
  /** Invalidate all loaded modules */
  invalidateAll(): void;
  /** Load middleware from the app directory */
  loadMiddleware(): Promise<MiddlewareModule | null>;
}

/**
 * Creates a module loader that dynamically imports route modules.
 *
 * In dev mode, TSX/TS files are transformed by PledgePack's Rust compiler (Oxc)
 * via the PledgePack dev server, replacing the previous esbuild-based approach.
 * In production, modules are pre-bundled by PledgePack and loaded from the output directory.
 */
export function createModuleLoader(config: PledgeConfig, isDev: boolean, pledgepackPort?: number): ModuleLoader {
  const cache = new Map<string, LoadedModule>();
  const middlewareCache = new Map<string, MiddlewareModule>();

  async function load(filePath: string): Promise<LoadedModule> {
    // Check cache first
    const cached = cache.get(filePath);
    if (cached) return cached;

    // Resolve the file path — in dev, import from source; in prod, from output
    const resolvedPath = isDev ? filePath : resolveProductionPath(filePath, config);

    if (!existsSync(resolvedPath)) {
      throw new Error(`Module not found: ${resolvedPath}`);
    }

    const ext = extname(resolvedPath);
    let importUrl: string;

    if (isDev && (ext === '.ts' || ext === '.tsx' || ext === '.jsx' || ext === '.psx' || ext === '.ps')) {
      importUrl = await transformFile(resolvedPath, true, pledgepackPort);
    } else {
      // Already JS — import directly
      importUrl = pathToFileURL(resolvedPath).href;
    }

    const mod = await import(importUrl);

    const loaded = mod as LoadedModule;
    cache.set(filePath, loaded);
    return loaded;
  }

  async function loadAll(routes: ResolvedRoute[]): Promise<Map<string, LoadedModule>> {
    const modules = new Map<string, LoadedModule>();

    const loadPromises = routes.map(async (route) => {
      try {
        const mod = await load(route.filePath);
        modules.set(route.filePath, mod);
      } catch (err) {
        console.error(`[pledgestack] Failed to load module ${route.filePath}:`, err);
      }
    });

    await Promise.all(loadPromises);
    return modules;
  }

  function invalidate(filePath: string): void {
    cache.delete(filePath);
    // Also invalidate middleware if it matches
    middlewareCache.delete(filePath);
  }

  function invalidateAll(): void {
    cache.clear();
    middlewareCache.clear();
  }

  async function loadMiddleware(): Promise<MiddlewareModule | null> {
    const middlewarePaths = [
      join(config.rootDir, config.appDir, 'middleware.ts'),
      join(config.rootDir, config.appDir, 'middleware.js'),
      join(config.rootDir, config.appDir, 'middleware.psx'),
      join(config.rootDir, config.appDir, 'middleware.ps'),
      join(config.rootDir, 'middleware.ts'),
      join(config.rootDir, 'middleware.js'),
      join(config.rootDir, 'middleware.psx'),
      join(config.rootDir, 'middleware.ps'),
    ];

    for (const middlewarePath of middlewarePaths) {
      if (existsSync(middlewarePath)) {
        const cached = middlewareCache.get(middlewarePath);
        if (cached) return cached;

        const ext = extname(middlewarePath);
        let importUrl: string;

        if (isDev && (ext === '.ts' || ext === '.tsx' || ext === '.jsx' || ext === '.psx' || ext === '.ps')) {
          importUrl = await transformFile(middlewarePath, true, pledgepackPort);
        } else {
          importUrl = pathToFileURL(middlewarePath).href;
        }

        try {
          const mod = await import(importUrl);
          const middleware = mod as MiddlewareModule;
          middlewareCache.set(middlewarePath, middleware);
          return middleware;
        } catch (err) {
          console.error(`[pledgestack] Failed to load middleware ${middlewarePath}:`, err);
          return null;
        }
      }
    }

    return null;
  }

  return { load, loadAll, invalidate, invalidateAll, loadMiddleware };
}

/**
 * Resolves a source file path to its production bundle path.
 * In production, modules are bundled by pledge (PledgePack) into the output directory.
 */
function resolveProductionPath(sourcePath: string, config: PledgeConfig): string {
  const ext = extname(sourcePath);
  const withoutExt = sourcePath.slice(0, -ext.length);
  const relativePath = withoutExt.replace(join(config.rootDir, config.appDir), '');
  const productionPath = join(config.rootDir, config.outDir, 'server', `${relativePath}.js`);

  if (existsSync(productionPath)) {
    return productionPath;
  }

  // Fallback to source if production bundle doesn't exist
  return sourcePath;
}
