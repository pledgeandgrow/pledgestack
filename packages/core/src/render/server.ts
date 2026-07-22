import { renderToString } from 'react-dom/server';
import { createElement, Suspense, Component, type ReactNode, type ComponentType } from 'react';
import type { RouteMatch, ResolvedRoute, PledgeConfig, Viewport } from 'pledgestack-shared';
import { MANIFEST_SCRIPT_ID, type PledgeManifest } from 'pledgestack-shared';
import type { PageModule, LayoutModule, LoadingModule, ErrorModule, NotFoundModule, HeadModule, HeadMetadata, TemplateModule } from '../router/types';
import { getLayoutChain } from '../router/router';
import type { RouteTree } from '../router/types';

export interface SSRContext {
  config: PledgeConfig;
  match: RouteMatch;
  tree: RouteTree;
  modules: Map<string, PageModule | LayoutModule | LoadingModule | ErrorModule | NotFoundModule | HeadModule | TemplateModule>;
  /** Search params for the current request (Next.js 15 style page prop) */
  searchParams?: Record<string, string>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ fallback: ComponentType<{ error: Error; reset: () => void; children?: ReactNode }>; children?: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return createElement(this.props.fallback, { error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}

/**
 * Renders a route match to an HTML string using SSR.
 * Wraps the page in its layout chain with loading and error boundaries.
 */
export async function renderSSR(ctx: SSRContext): Promise<string> {
  const { match, tree, modules } = ctx;

  const pageModule = modules.get(match.route.filePath) as PageModule | undefined;
  if (!pageModule) {
    throw new Error(`Page module not found: ${match.route.filePath}`);
  }

  // Resolve metadata (from generateMetadata or static metadata export)
  const metadata = await resolveMetadata(pageModule, match.params);

  // Build the element tree: page wrapped in loading/error boundaries, then layouts
  // Pass params and searchParams as props (Next.js 15 style)
  const searchParamsRecord = ctx.searchParams ?? {};
  let element: ReactNode = createElement(pageModule.default, {
    params: match.params,
    searchParams: searchParamsRecord,
  });

  // Wrap page in error boundary if error.tsx exists for this route
  if (match.route.errorFilePath) {
    const errorModule = modules.get(match.route.errorFilePath) as ErrorModule | undefined;
    if (errorModule) {
      element = createElement(ErrorBoundary, { fallback: errorModule.default }, element);
    }
  }

  // Wrap page in suspense boundary if loading.tsx exists for this route
  if (match.route.loadingFilePath) {
    const loadingModule = modules.get(match.route.loadingFilePath) as LoadingModule | undefined;
    if (loadingModule) {
      element = createElement(Suspense, { fallback: createElement(loadingModule.default, {}) }, element);
    }
  }

  // Wrap in template.tsx if it exists for this route (re-mounts on navigation)
  if (match.route.templateFilePath) {
    const templateModule = modules.get(match.route.templateFilePath) as TemplateModule | undefined;
    if (templateModule) {
      element = createElement(templateModule.default, { children: element });
    }
  }

  // Wrap in layout chain
  const layouts = getLayoutChain(match, tree);
  for (const layout of layouts) {
    const layoutModule = modules.get(layout.filePath) as LayoutModule | undefined;
    if (layoutModule) {
      // Wrap each layout level in its own error/loading boundary if they have them
      let layoutContent: ReactNode = createElement(layoutModule.default, { children: element });

      if (layout.errorFilePath) {
        const layoutErrorModule = modules.get(layout.errorFilePath) as ErrorModule | undefined;
        if (layoutErrorModule) {
          layoutContent = createElement(ErrorBoundary, { fallback: layoutErrorModule.default }, layoutContent);
        }
      }

      if (layout.loadingFilePath) {
        const layoutLoadingModule = modules.get(layout.loadingFilePath) as LoadingModule | undefined;
        if (layoutLoadingModule) {
          layoutContent = createElement(Suspense, { fallback: createElement(layoutLoadingModule.default, {}) }, layoutContent);
        }
      }

      // Wrap layout in template.tsx if it exists for this layout segment
      if (layout.templateFilePath) {
        const layoutTemplateModule = modules.get(layout.templateFilePath) as TemplateModule | undefined;
        if (layoutTemplateModule) {
          layoutContent = createElement(layoutTemplateModule.default, { children: layoutContent });
        }
      }

      element = layoutContent;
    }
  }

  // Resolve viewport (static export or generateViewport)
  const viewport = await resolveViewport(pageModule);

  // Resolve head: head.tsx component or generateMetadata
  const headHtml = await resolveHead(match.route, modules, metadata);

  const html = renderToString(createElement(() => element as ReactNode));
  return wrapHtml(html, match.route, metadata, headHtml, viewport);
}

/**
 * Renders the not-found page for a given route segment.
 */
export async function renderNotFound(ctx: SSRContext): Promise<string> {
  const { match, tree, modules } = ctx;

  // Find the closest not-found.tsx in the layout chain
  const layouts = getLayoutChain(match, tree);
  let notFoundModule: NotFoundModule | undefined;
  let notFoundRoute: ResolvedRoute | undefined;

  // Check the matched route first, then walk up the layout chain
  if (match.route.notFoundFilePath) {
    notFoundModule = modules.get(match.route.notFoundFilePath) as NotFoundModule | undefined;
    notFoundRoute = match.route;
  }

  if (!notFoundModule) {
    for (const layout of layouts) {
      if (layout.notFoundFilePath) {
        notFoundModule = modules.get(layout.notFoundFilePath) as NotFoundModule | undefined;
        notFoundRoute = layout;
        break;
      }
    }
  }

  let element: ReactNode;

  if (notFoundModule) {
    element = createElement(notFoundModule.default, {});

    // Wrap in layout chain
    for (const layout of layouts) {
      const layoutModule = modules.get(layout.filePath) as LayoutModule | undefined;
      if (layoutModule) {
        element = createElement(layoutModule.default, { children: element });
      }
    }
  } else {
    element = createElement('div', null, '404 - Page Not Found');
  }

  const html = renderToString(createElement(() => element as ReactNode));
  return wrapHtml(html, notFoundRoute ?? match.route, { title: 'Not Found' });
}

/**
 * Resolves metadata from generateMetadata() or static metadata export.
 */
async function resolveMetadata(pageModule: PageModule, params: Record<string, string>): Promise<HeadMetadata> {
  if (pageModule.generateMetadata) {
    try {
      return await pageModule.generateMetadata(params);
    } catch {
      // Fall through to static metadata
    }
  }

  if (pageModule.metadata) {
    return pageModule.metadata as HeadMetadata;
  }

  return {};
}

/**
 * Resolves head content from head.tsx component or falls back to metadata tags.
 */
async function resolveHead(
  route: ResolvedRoute,
  modules: Map<string, PageModule | LayoutModule | LoadingModule | ErrorModule | NotFoundModule | HeadModule | TemplateModule>,
  metadata: HeadMetadata,
): Promise<string | undefined> {
  if (route.headFilePath) {
    const headModule = modules.get(route.headFilePath) as HeadModule | undefined;
    if (headModule) {
      try {
        const headElement = createElement(headModule.default, {});
        const headContent = renderToString(headElement);
        return headContent;
      } catch {
        // Fall through to metadata-based head
      }
    }
  }
  return renderHeadTags(metadata, route);
}

/**
 * Wraps rendered content in an HTML shell with head metadata.
 */
function wrapHtml(content: string, route: ResolvedRoute, metadata: HeadMetadata, headHtml?: string, viewport?: Viewport): string {
  const headTags = headHtml ?? renderHeadTags(metadata, route);
  const viewportTags = renderViewportTags(viewport);

  // Inject pledge manifest (empty for now — will be populated by the pledge system)
  const manifest: PledgeManifest = { pledges: [] };
  const manifestScript = `<script id="${MANIFEST_SCRIPT_ID}" type="application/json">${JSON.stringify(manifest)}</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${viewportTags || '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'}
  ${headTags}
  <link rel="stylesheet" href="/__pledge__/client.css" />
</head>
<body>
  <div id="__pledge_root__">${content}</div>
  ${manifestScript}
  <script type="module" src="/__pledge__/client.js"></script>
</body>
</html>`;
}

/**
 * Renders head metadata to HTML tags.
 */
function renderHeadTags(metadata: HeadMetadata, route: ResolvedRoute): string {
  const tags: string[] = [];

  const title = metadata.title ?? route.metadata?.title ?? 'PledgeStack App';
  tags.push(`<title>${escapeHtml(title)}</title>`);

  if (metadata.description) {
    tags.push(`<meta name="description" content="${escapeHtml(metadata.description)}" />`);
  }

  if (metadata.keywords && metadata.keywords.length > 0) {
    tags.push(`<meta name="keywords" content="${escapeHtml(metadata.keywords.join(', '))}" />`);
  }

  if (metadata.robots) {
    tags.push(`<meta name="robots" content="${escapeHtml(metadata.robots)}" />`);
  }

  if (metadata.openGraph) {
    const og = metadata.openGraph;
    if (og.title) tags.push(`<meta property="og:title" content="${escapeHtml(og.title)}" />`);
    if (og.description) tags.push(`<meta property="og:description" content="${escapeHtml(og.description)}" />`);
    if (og.url) tags.push(`<meta property="og:url" content="${escapeHtml(og.url)}" />`);
    if (og.type) tags.push(`<meta property="og:type" content="${escapeHtml(og.type)}" />`);
    if (og.images) {
      for (const img of og.images) {
        tags.push(`<meta property="og:image" content="${escapeHtml(img)}" />`);
      }
    }
  }

  if (metadata.twitter) {
    const tw = metadata.twitter;
    if (tw.card) tags.push(`<meta name="twitter:card" content="${escapeHtml(tw.card)}" />`);
    if (tw.title) tags.push(`<meta name="twitter:title" content="${escapeHtml(tw.title)}" />`);
    if (tw.description) tags.push(`<meta name="twitter:description" content="${escapeHtml(tw.description)}" />`);
    if (tw.images) {
      for (const img of tw.images) {
        tags.push(`<meta name="twitter:image" content="${escapeHtml(img)}" />`);
      }
    }
  }

  if (metadata.alternates?.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(metadata.alternates.canonical)}" />`);
  }

  if (metadata.icons?.icon) {
    tags.push(`<link rel="icon" href="${escapeHtml(metadata.icons.icon)}" />`);
  }
  if (metadata.icons?.apple) {
    tags.push(`<link rel="apple-touch-icon" href="${escapeHtml(metadata.icons.apple)}" />`);
  }
  if (metadata.icons?.favicon) {
    tags.push(`<link rel="shortcut icon" href="${escapeHtml(metadata.icons.favicon)}" />`);
  }

  if (metadata.other) {
    for (const [name, content] of Object.entries(metadata.other)) {
      tags.push(`<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}" />`);
    }
  }

  return tags.join('\n  ');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Resolves viewport from generateViewport() or static viewport export.
 */
async function resolveViewport(pageModule: PageModule): Promise<Viewport | undefined> {
  if (pageModule.generateViewport) {
    try {
      return await pageModule.generateViewport();
    } catch {
      // Fall through to static viewport
    }
  }
  if (pageModule.viewport) {
    return pageModule.viewport;
  }
  return undefined;
}

/**
 * Renders viewport meta tags from a Viewport object.
 */
function renderViewportTags(viewport: Viewport | undefined): string {
  if (!viewport) return '';
  const tags: string[] = [];
  const parts: string[] = [];
  if (viewport.width !== undefined) parts.push(`width=${viewport.width}`);
  if (viewport.initialScale !== undefined) parts.push(`initial-scale=${viewport.initialScale}`);
  if (viewport.maximumScale !== undefined) parts.push(`maximum-scale=${viewport.maximumScale}`);
  if (viewport.userScalable !== undefined) parts.push(`user-scalable=${viewport.userScalable ? 'yes' : 'no'}`);
  if (viewport.viewportFit) parts.push(`viewport-fit=${viewport.viewportFit}`);
  if (parts.length > 0) tags.push(`<meta name="viewport" content="${parts.join(', ')}" />`);
  if (viewport.themeColor) tags.push(`<meta name="theme-color" content="${escapeHtml(viewport.themeColor)}" />`);
  if (viewport.colorScheme) tags.push(`<meta name="color-scheme" content="${escapeHtml(viewport.colorScheme)}" />`);
  return tags.join('\n  ');
}
