import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { PledgeConfig, BundlerAdapter } from 'pledgestack-shared';
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
 * In dev mode, TSX/TS files are transformed by the configured bundler
 * (PledgePack by default, or Vite/Rollup/Turbopack via BundlerAdapter).
 * In production, modules are pre-bundled and loaded from the output directory.
 *
 * @param config PledgeStack configuration
 * @param isDev Whether we're in dev mode
 * @param pledgepackPort Port of the bundler's dev server (legacy, used when no adapter is provided)
 * @param adapter Optional BundlerAdapter — if provided, used for transforms instead of the legacy transformFile
 */
export function createModuleLoader(
  config: PledgeConfig,
  isDev: boolean,
  pledgepackPort?: number,
  adapter?: BundlerAdapter,
): ModuleLoader {
  const cache = new Map<string, LoadedModule>();
  const middlewareCache = new Map<string, MiddlewareModule>();

  async function resolveImportUrl(resolvedPath: string): Promise<string> {
    const ext = extname(resolvedPath);

    if (isDev && (ext === '.ts' || ext === '.tsx' || ext === '.jsx' || ext === '.psx' || ext === '.ps')) {
      if (adapter) {
        const result = await adapter.transformFile(resolvedPath, {
          isDev: true,
          devServerPort: pledgepackPort,
          cargoConfig: config.cargo,
        });
        return result.fileUrl;
      }
      return transformFile(resolvedPath, true, pledgepackPort, config.cargo);
    }

    return pathToFileURL(resolvedPath).href;
  }

  async function load(filePath: string): Promise<LoadedModule> {
    // Check cache first
    const cached = cache.get(filePath);
    if (cached) return cached;

    // Resolve the file path — in dev, import from source; in prod, from output
    const resolvedPath = isDev
      ? filePath
      : adapter
        ? adapter.resolveProductionPath(filePath, config)
        : resolveProductionPath(filePath, config);

    if (!existsSync(resolvedPath)) {
      throw new Error(`Module not found: ${resolvedPath}`);
    }

    const importUrl = await resolveImportUrl(resolvedPath);
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

        const importUrl = await resolveImportUrl(middlewarePath);

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
 * In production, modules are bundled by the configured bundler into the output directory.
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
