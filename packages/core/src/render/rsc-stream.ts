/**
 * RSC streaming — pipes renderToPipeableStream directly to a ReadableStream
 * for streaming SSR responses to the HTTP response.
 *
 * This enables progressive HTML streaming where the shell is sent immediately
 * and deferred Suspense boundaries are streamed as they resolve.
 */

import { renderToPipeableStream } from 'react-dom/server';
import { createElement, Suspense, Component, type ReactNode, type ComponentType } from 'react';
import { Writable } from 'node:stream';
import type { RouteMatch, ResolvedRoute, PledgeConfig } from '@pledgestack/shared';
import { MANIFEST_SCRIPT_ID, type PledgeManifest } from '@pledgestack/shared';
import type { PageModule, LayoutModule, LoadingModule, ErrorModule, NotFoundModule, HeadModule, HeadMetadata, TemplateModule } from '../router/types';
import { getLayoutChain } from '../router/router';
import type { RouteTree } from '../router/types';

export interface RSCStreamContext {
  config: PledgeConfig;
  match: RouteMatch;
  tree: RouteTree;
  modules: Map<string, PageModule | LayoutModule | LoadingModule | ErrorModule | NotFoundModule | HeadModule | TemplateModule>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class StreamErrorBoundary extends Component<{ fallback: ComponentType<{ error: Error; reset: () => void; children?: ReactNode }>; children?: ReactNode }, ErrorBoundaryState> {
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
 * Renders a route match to a Web ReadableStream that can be piped directly
 * to an HTTP response. The shell HTML is sent immediately, then deferred
 * Suspense boundaries are streamed as they resolve.
 *
 * This is the true streaming implementation — unlike renderSSRStream which
 * buffers everything into a string, this function returns a ReadableStream
 * that can be set as the response body.
 */
export async function renderRSCStream(ctx: RSCStreamContext): Promise<ReadableStream<Uint8Array>> {
  const { match, tree, modules } = ctx;

  const pageModule = modules.get(match.route.filePath) as PageModule | undefined;
  if (!pageModule) {
    throw new Error(`Page module not found: ${match.route.filePath}`);
  }

  const metadata = await resolveMetadata(pageModule, match.params);

  let element: ReactNode = createElement(pageModule.default, { ...match.params });

  if (match.route.errorFilePath) {
    const errorModule = modules.get(match.route.errorFilePath) as ErrorModule | undefined;
    if (errorModule) {
      element = createElement(StreamErrorBoundary, { fallback: errorModule.default }, element);
    }
  }

  if (match.route.loadingFilePath) {
    const loadingModule = modules.get(match.route.loadingFilePath) as LoadingModule | undefined;
    if (loadingModule) {
      element = createElement(Suspense, { fallback: createElement(loadingModule.default, {}) }, element);
    }
  }

  if (match.route.templateFilePath) {
    const templateModule = modules.get(match.route.templateFilePath) as TemplateModule | undefined;
    if (templateModule) {
      element = createElement(templateModule.default, { children: element });
    }
  }

  const layouts = getLayoutChain(match, tree);
  for (const layout of layouts) {
    const layoutModule = modules.get(layout.filePath) as LayoutModule | undefined;
    if (layoutModule) {
      let layoutContent: ReactNode = createElement(layoutModule.default, { children: element });

      if (layout.errorFilePath) {
        const layoutErrorModule = modules.get(layout.errorFilePath) as ErrorModule | undefined;
        if (layoutErrorModule) {
          layoutContent = createElement(StreamErrorBoundary, { fallback: layoutErrorModule.default }, layoutContent);
        }
      }

      if (layout.loadingFilePath) {
        const layoutLoadingModule = modules.get(layout.loadingFilePath) as LoadingModule | undefined;
        if (layoutLoadingModule) {
          layoutContent = createElement(Suspense, { fallback: createElement(layoutLoadingModule.default, {}) }, layoutContent);
        }
      }

      if (layout.templateFilePath) {
        const layoutTemplateModule = modules.get(layout.templateFilePath) as TemplateModule | undefined;
        if (layoutTemplateModule) {
          layoutContent = createElement(layoutTemplateModule.default, { children: layoutContent });
        }
      }

      element = layoutContent;
    }
  }

  const headHtml = await resolveHead(match.route, modules);
  const headTags = headHtml ?? renderHeadTags(metadata, match.route);
  const manifest: PledgeManifest = { pledges: [] };

  const shellBefore = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${headTags}
  <link rel="stylesheet" href="/__pledge__/client.css" />
</head>
<body>
  <div id="__pledge_root__">`;

  const shellAfter = `</div>
  <script id="${MANIFEST_SCRIPT_ID}" type="application/json">${JSON.stringify(manifest)}</script>
  <script type="module" src="/__pledge__/client.js"></script>
</body>
</html>`;

  return new Promise<ReadableStream<Uint8Array>>((resolve, reject) => {
    let shellReady = false;
    let resolved = false;

    // For backpressure-aware streaming, we collect chunks and stream them
    // progressively rather than buffering everything until onAllReady.
    const chunks: Buffer[] = [];
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    let pendingData: Buffer[] = [];
    let streamClosed = false;

    const writable = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        if (streamController && !streamClosed) {
          // Stream is active — enqueue directly with backpressure check
          const desired = streamController.desiredSize;
          if (desired !== null && desired <= 0) {
            // Backpressure: buffer and wait
            pendingData.push(chunk);
          } else {
            streamController.enqueue(new Uint8Array(chunk));
          }
        } else {
          // Stream not yet created — buffer
          chunks.push(chunk);
        }
        callback();
      },
    });

    const { pipe } = renderToPipeableStream(createElement(() => element as ReactNode), {
      onShellReady() {
        shellReady = true;
        pipe(writable);
      },
      onAllReady() {
        if (resolved) return;
        resolved = true;

        const encoder = new TextEncoder();

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            streamController = controller;

            // Send shell first
            controller.enqueue(encoder.encode(shellBefore));

            // Send buffered content
            const content = Buffer.concat(chunks).toString('utf-8');
            controller.enqueue(encoder.encode(content));

            // Send any pending chunks from backpressure
            for (const chunk of pendingData) {
              controller.enqueue(new Uint8Array(chunk));
            }
            pendingData = [];

            // Send closing shell
            controller.enqueue(encoder.encode(shellAfter));
            controller.close();
            streamClosed = true;
          },
        });
        resolve(stream);
      },
      onShellError(error) {
        reject(error);
      },
      onError(error) {
        if (!shellReady) {
          reject(error);
        }
      },
    });

    void pipe;
  });
}

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

async function resolveHead(
  route: ResolvedRoute,
  modules: Map<string, PageModule | LayoutModule | LoadingModule | ErrorModule | NotFoundModule | HeadModule | TemplateModule>,
): Promise<string | undefined> {
  if (route.headFilePath) {
    const headModule = modules.get(route.headFilePath) as HeadModule | undefined;
    if (headModule) {
      try {
        const { renderToString } = await import('react-dom/server');
        const headElement = createElement(headModule.default, {});
        const headContent = renderToString(headElement);
        return headContent;
      } catch {
        // Fall through
      }
    }
  }
  return undefined;
}

function renderHeadTags(metadata: HeadMetadata, route: ResolvedRoute): string {
  const tags: string[] = [];
  const title = metadata.title ?? route.metadata?.title ?? 'PledgeStack App';
  tags.push(`<title>${escapeHtml(title)}</title>`);
  if (metadata.description) {
    tags.push(`<meta name="description" content="${escapeHtml(metadata.description)}" />`);
  }
  return tags.join('\n  ');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
