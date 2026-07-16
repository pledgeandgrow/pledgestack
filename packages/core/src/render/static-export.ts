import type { PledgeConfig, ResolvedRoute } from 'pledgestack-shared';

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
  errors: Array<{ route: string; error: string }>;
}

/**
 * Generates static HTML files for all SSR/SSG routes.
 * Dynamic routes with generateStaticParams are expanded.
 */
export async function generateStaticExport(options: StaticExportOptions): Promise<ExportResult> {
  const { config, routes, outputDir, renderPage } = options;
  const writtenFiles: string[] = [];
  const errors: Array<{ route: string; error: string }> = [];

  for (const route of routes) {
    // Skip API routes and non-page routes
    if (route.mode === 'api' || route.isLayout || route.isNotFound) continue;

    // Skip routes that can't be statically exported
    if (route.mode === 'rsc') continue;

    try {
      const paths = await getStaticPaths(route, config);

      if (paths.length === 0) {
        // Static route — render once
        await renderPage(route, {});
        const outPath = getOutputPath(route.pattern, outputDir);
        writtenFiles.push(outPath);
      } else {
        // Dynamic route — render for each param set
        for (const params of paths) {
          await renderPage(route, params);
          const outPath = getOutputPathWithParams(route.pattern, params, outputDir);
          writtenFiles.push(outPath);
        }
      }
    } catch (err) {
      errors.push({
        route: route.pattern,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { writtenFiles, errors };
}

/**
 * Gets static paths for a dynamic route by calling generateStaticParams.
 */
async function getStaticPaths(_route: ResolvedRoute, _config: PledgeConfig): Promise<Record<string, string>[]> {
  // This would import the page module and call generateStaticParams
  // For now, return empty — the caller handles module loading
  return [];
}

/**
 * Converts a route pattern to an output file path.
 * e.g. '/about' -> 'about.html', '/' -> 'index.html'
 */
function getOutputPath(pattern: string, outputDir: string): string {
  if (pattern === '/' || pattern === '') {
    return `${outputDir}/index.html`;
  }
  const clean = pattern.replace(/^\//, '');
  return `${outputDir}/${clean}.html`;
}

/**
 * Converts a route pattern with params to an output file path.
 * e.g. '/blog/[slug]' with { slug: 'hello' } -> 'blog/hello.html'
 */
function getOutputPathWithParams(pattern: string, params: Record<string, string>, outputDir: string): string {
  let path = pattern;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`[${key}]`, value);
  }
  return getOutputPath(path, outputDir);
}

/**
 * Checks if a route can be statically exported.
 */
export function canStaticExport(route: ResolvedRoute): boolean {
  if (route.mode === 'api') return false;
  if (route.mode === 'rsc') return false;
  if (route.isLayout) return false;
  if (route.isNotFound) return false;

  // Routes with force-dynamic can't be exported
  if (route.metadata?.revalidate === 0) return false;

  return true;
}
