import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PledgeConfig } from '@pledgestack/shared';

/**
 * Serves PledgeStack virtual modules at /__pledge__/* paths.
 *
 * - /__pledge__/client.css → served from .pledge/__pledge__/client.css
 * - /__pledge__/client.js → generated ESM hydration module
 * - /__pledge__/rsc-client.js → generated RSC client module
 *
 * In dev mode, import paths point to PledgePack's dev server for on-the-fly
 * transformation of react/react-dom from node_modules.
 */
export async function tryServePledgeVirtual(
  req: IncomingMessage,
  res: ServerResponse,
  config: PledgeConfig,
  isDev: boolean,
  pledgepackPort?: number,
): Promise<boolean> {
  const url = req.url ?? '/';
  if (!url.startsWith('/__pledge__/')) return false;

  const pathname = url.split('?')[0];

  if (pathname === '/__pledge__/client.css') {
    return serveClientCss(res, config);
  }

  if (pathname === '/__pledge__/client.js') {
    return serveClientJs(res, config, isDev, pledgepackPort);
  }

  if (pathname === '/__pledge__/rsc-client.js') {
    return serveRscClientJs(res, config, isDev, pledgepackPort);
  }

  if (pathname === '/__pledge__/action') {
    return false;
  }

  return false;
}

async function serveClientCss(
  res: ServerResponse,
  config: PledgeConfig,
): Promise<boolean> {
  const cssPath = join(config.rootDir, config.outDir, '__pledge__', 'client.css');
  try {
    const content = await readFile(cssPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
    res.end(content);
    return true;
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
    res.end('/* PledgeStack — no client CSS */');
    return true;
  }
}

function serveClientJs(
  res: ServerResponse,
  config: PledgeConfig,
  isDev: boolean,
  pledgepackPort?: number,
): boolean {
  const rscEnabled = config.rsc;
  const reactImport = isDev
    ? '/node_modules/react/index.js'
    : '/node_modules/react/index.js';
  const reactDomClientImport = isDev
    ? '/node_modules/react-dom/client.js'
    : '/node_modules/react-dom/client.js';

  const code = `// PledgeStack client hydration (auto-generated)
import { hydrateRoot } from '${reactDomClientImport}';
import { createElement } from '${reactImport}';

const root = document.getElementById('__pledge_root__');
if (root) {
  // SSR content is already in the DOM — set up client-side navigation
  ${rscEnabled ? `// RSC mode: hydration handled by rsc-client.js` : ``}
  // Intercept same-origin link clicks for client-side navigation
  document.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!link) return;
    if (link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('//')) return;
    e.preventDefault();
    window.location.href = link.href;
  });
}
`;

  res.writeHead(200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(code);
  return true;
}

function serveRscClientJs(
  res: ServerResponse,
  config: PledgeConfig,
  isDev: boolean,
  pledgepackPort?: number,
): boolean {
  const reactImport = '/node_modules/react/index.js';
  const reactDomClientImport = '/node_modules/react-dom/client.js';

  const code = `// PledgeStack RSC client (auto-generated)
import { hydrateRoot } from '${reactDomClientImport}';
import { createElement } from '${reactImport}';

// RSC hydration: read the serialized RSC payload and hydrate
const rscData = document.getElementById('__pledge_rsc_data__');
const manifest = document.getElementById('__pledge_manifest__');
const root = document.getElementById('__pledge_root__');

if (root && rscData) {
  try {
    const payload = JSON.parse(rscData.textContent || '[]');
    // The SSR content is already in the DOM
    // In a full implementation, this would reconstruct the React tree
    // from the RSC payload and hydrate it
  } catch (e) {
    console.error('[pledgestack] RSC hydration error:', e);
  }
}
`;

  res.writeHead(200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(code);
  return true;
}
