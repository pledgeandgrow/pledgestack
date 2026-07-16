import type { PledgeConfig, ResolvedRoute } from '@pledgestack/shared';
/**
 * Static export generator — pre-renders all routes to static HTML files.
 * Used when `config.output === 'export'`.
 */
interface StaticExportOptions {
    config: PledgeConfig;
    routes: ResolvedRoute[];
    outputDir: string;
    renderPage: (route: ResolvedRoute, params: Record<string, string>) => Promise<string>;
}
interface ExportResult {
    writtenFiles: string[];
    errors: Array<{
        route: string;
        error: string;
    }>;
}
/**
 * Generates static HTML files for all SSR/SSG routes.
 * Dynamic routes with generateStaticParams are expanded.
 */
export declare function generateStaticExport(options: StaticExportOptions): Promise<ExportResult>;
/**
 * Checks if a route can be statically exported.
 */
export declare function canStaticExport(route: ResolvedRoute): boolean;
export {};
//# sourceMappingURL=static-export.d.ts.map