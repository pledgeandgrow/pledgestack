import type { PledgeConfig } from 'pledgestack-shared';
import type { PageModule, LayoutModule, RouteHandlerModule, MiddlewareModule, LoadingModule, ErrorModule, NotFoundModule, HeadModule } from 'pledgestack-core';
import type { ResolvedRoute } from 'pledgestack-shared';
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
export declare function createModuleLoader(config: PledgeConfig, isDev: boolean, pledgepackPort?: number): ModuleLoader;
//# sourceMappingURL=module-loader.d.ts.map