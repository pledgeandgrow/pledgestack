import { renderToPipeableStream } from 'react-dom/server';
import { createElement, type ReactNode } from 'react';
import { Writable } from 'node:stream';
import type { RouteMatch, ResolvedRoute, PledgeConfig } from 'pledgestack-shared';
import type { PageModule, LayoutModule } from '../router/types';
import { getLayoutChain } from '../router/router';
import type { RouteTree } from '../router/types';

export interface RSCPayload {
  /** The serialized RSC tree as a string */
  tree: string;
  /** Module map for client-side resolution: moduleId -> chunkPath */
  moduleMap: Record<string, string>;
  /** Client component references that need to be loaded on the client */
  clientReferences: ClientReference[];
}

export interface ClientReference {
  /** Module ID in the client bundle */
  moduleId: string;
  /** Export name (e.g. 'default') */
  exportName: string;
  /** Chunk path for lazy loading */
  chunkPath: string;
}

export interface RSCContext {
  config: PledgeConfig;
  match: RouteMatch;
  tree: RouteTree;
  modules: Map<string, PageModule | LayoutModule>;
  /** Client reference manifest mapping server modules to client chunks */
  clientManifest?: Record<string, string>;
}

/**
 * Renders a route match to an RSC payload using react-server-dom-webpack.
 * The payload is a stream that can be sent to the client for hydration.
 *
 * In production, this uses the React Server Components protocol to serialize
 * the React tree into a format that can be progressively streamed to the client.
 * Client components are identified via the client manifest and lazy-loaded.
 */
export async function renderRSC(ctx: RSCContext): Promise<RSCPayload> {
  const { match, tree, modules } = ctx;

  const pageModule = modules.get(match.route.filePath) as PageModule | undefined;
  if (!pageModule) {
    throw new Error(`Page module not found: ${match.route.filePath}`);
  }

  let element: ReactNode = createElement(pageModule.default, { ...match.params });

  const layouts = getLayoutChain(match, tree);
  for (const layout of layouts) {
    const layoutModule = modules.get(layout.filePath) as LayoutModule | undefined;
    if (layoutModule) {
      element = createElement(layoutModule.default, { children: element });
    }
  }

  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });

  return new Promise((resolve, reject) => {
    const { pipe } = renderToPipeableStream(createElement(() => element), {
      bootstrapModules: getBootstrapModules(ctx),
      onShellReady() {
        pipe(writable);
      },
      onAllReady() {
        const treeData = Buffer.concat(chunks).toString('utf-8');
        resolve({
          tree: treeData,
          moduleMap: ctx.clientManifest ?? {},
          clientReferences: extractClientReferences(ctx),
        });
      },
      onError(error) {
        reject(error);
      },
    });
    void pipe;
  });
}

/**
 * Renders an RSC payload to a full HTML document with streaming.
 * Used for the initial server render with RSC support.
 */
export async function renderRSCToHTML(ctx: RSCContext): Promise<string> {
  const { match, tree, modules } = ctx;

  const pageModule = modules.get(match.route.filePath) as PageModule | undefined;
  if (!pageModule) {
    throw new Error(`Page module not found: ${match.route.filePath}`);
  }

  let element: ReactNode = createElement(pageModule.default, { ...match.params });

  const layouts = getLayoutChain(match, tree);
  for (const layout of layouts) {
    const layoutModule = modules.get(layout.filePath) as LayoutModule | undefined;
    if (layoutModule) {
      element = createElement(layoutModule.default, { children: element });
    }
  }

  const chunks: string[] = [];
  const writable = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk.toString('utf-8'));
      callback();
    },
  });

  return new Promise((resolve, reject) => {
    const { pipe } = renderToPipeableStream(createElement(() => element), {
      bootstrapModules: getBootstrapModules(ctx),
      onShellReady() {
        pipe(writable);
      },
      onAllReady() {
        const content = chunks.join('');
        resolve(wrapRSCHtml(content, match.route, ctx));
      },
      onError(error) {
        reject(error);
      },
    });
    void pipe;
  });
}

/**
 * Gets the bootstrap module paths for client hydration.
 */
function getBootstrapModules(ctx: RSCContext): string[] {
  const mods: string[] = ['/__pledge__/client.js'];
  if (ctx.config.rsc) {
    mods.push('/__pledge__/rsc-client.js');
  }
  return mods;
}

/**
 * Extracts client component references from the module map.
 */
function extractClientReferences(ctx: RSCContext): ClientReference[] {
  const refs: ClientReference[] = [];
  if (ctx.clientManifest) {
    for (const [moduleId, chunkPath] of Object.entries(ctx.clientManifest)) {
      refs.push({ moduleId, exportName: 'default', chunkPath });
    }
  }
  return refs;
}

/**
 * Wraps RSC content in an HTML shell with serialized RSC data.
 */
function wrapRSCHtml(content: string, route: ResolvedRoute, ctx: RSCContext): string {
  const clientRefs = JSON.stringify(extractClientReferences(ctx));
  const serializedManifest = JSON.stringify(ctx.clientManifest ?? {});

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${route.metadata?.title ?? 'PledgeStack App'}</title>
  <link rel="stylesheet" href="/__pledge__/client.css" />
</head>
<body>
  <div id="__pledge_root__">${content}</div>
  <script id="__pledge_rsc_data__" type="application/json">${clientRefs}</script>
  <script id="__pledge_manifest__" type="application/json">${serializedManifest}</script>
  <script type="module" src="/__pledge__/client.js"></script>
  <script type="module" src="/__pledge__/rsc-client.js"></script>
</body>
</html>`;
}

/**
 * Deserializes an RSC payload on the client side.
 * Reconstructs the React tree from the serialized stream data.
 */
export async function hydrateRSC(payload: RSCPayload): Promise<ReactNode> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(payload.tree));
      controller.close();
    },
  });

  try {
    const mod = await import('react-server-dom-webpack/client') as { createFromReadableStream?: (s: ReadableStream<Uint8Array>) => Promise<ReactNode> };
    if (mod.createFromReadableStream) {
      return (mod as { createFromReadableStream: (s: ReadableStream<Uint8Array>) => Promise<ReactNode> }).createFromReadableStream(stream);
    }
  } catch {
    // Module not available in this environment
  }

  throw new Error('react-server-dom-webpack/client is not available. Ensure the client bundle includes RSC support.');
}
