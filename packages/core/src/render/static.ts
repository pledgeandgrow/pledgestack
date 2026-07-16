import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { PledgeConfig, ResolvedRoute } from '@pledgestack/shared';
import type { PageModule } from '../router/types';

export interface SSGContext {
  config: PledgeConfig;
  routes: ResolvedRoute[];
  modules: Map<string, PageModule>;
}

/**
 * Generates static HTML for all routes marked as static.
 * Calls generateStaticParams for dynamic routes.
 */
export async function generateStaticPages(ctx: SSGContext): Promise<Map<string, string>> {
  const output = new Map<string, string>();

  for (const route of ctx.routes) {
    if (route.mode === 'api' || route.mode === 'rsc' || route.isLayout || route.isNotFound) continue;

    const mod = ctx.modules.get(route.filePath);
    if (!mod) continue;

    // For dynamic routes, call generateStaticParams
    if (mod.generateStaticParams && route.pattern.includes(':')) {
      const paramsList = await mod.generateStaticParams();
      for (const params of paramsList) {
        const path = route.pattern.replace(/:(\w+)/g, (_, name) => params[name] ?? '');
        const html = renderToString(createElement(mod.default, params));
        output.set(path, `<!DOCTYPE html>\n${html}`);
      }
    } else {
      // Static route
      const html = renderToString(createElement(mod.default, {}));
      output.set(route.pattern, `<!DOCTYPE html>\n${html}`);
    }
  }

  return output;
}
