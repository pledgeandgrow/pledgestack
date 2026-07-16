import { createServer, type IncomingMessage, type ServerResponse, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { PledgeConfig } from '@pledgestack/shared';
import { createRequestHandler } from './handler';

export interface NodeServerOptions {
  config: PledgeConfig;
  port?: number;
  hostname?: string;
  isDev?: boolean;
  /** PledgePack dev server port for proxying module/asset/HMR requests */
  pledgepackPort?: number;
}

/**
 * Creates and starts a Node.js HTTP server for PledgeStack.
 *
 * In dev mode with pledgepackPort set:
 *   - Module/asset/HMR requests are proxied to PledgePack's Rust dev server
 *   - SSR, API routes, and middleware are handled by Node.js
 *   - HMR is handled by PledgePack's Rust server (WebSocket proxy)
 *
 * In production mode:
 *   - All requests handled by Node.js from pre-bundled output
 */
export function startNodeServer(options: NodeServerOptions) {
  const { config, port = 3000, hostname = 'localhost', isDev = false, pledgepackPort } = options;
  const { handler } = createRequestHandler({ config, isDev, pledgepackPort });

  const proxyTarget = pledgepackPort ? `http://${hostname}:${pledgepackPort}` : null;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? '/', `http://${hostname}:${port}`);

      if (proxyTarget && shouldProxyToPledgepack(url.pathname)) {
        proxyRequest(req, res, proxyTarget);
        return;
      }

      if (await tryServeStatic(req, res, config)) return;

      const response = await handler({ url, method: req.method ?? 'GET', headers: req.headers as Record<string, string> });

      res.writeHead(response.status, response.headers);
      if (response.body) {
        if (typeof response.body === 'string') {
          res.end(response.body);
        } else {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        }
      } else {
        res.end();
      }
    } catch (err) {
      console.error('[pledgestack] Request error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  if (proxyTarget) {
    server.on('upgrade', (req: IncomingMessage, socket: import('node:stream').Duplex, head: Buffer) => {
      if (req.url?.includes('/__pledge_hmr')) {
        proxyUpgrade(req, socket, head, proxyTarget);
      }
    });
  }

  server.listen(port, hostname, () => {
    console.log(`\n  PledgeStack ${isDev ? 'dev' : 'production'} server running at http://${hostname}:${port}\n`);
  });

  return server;
}

const MODULE_EXTENSIONS = /\.(js|ts|tsx|jsx|mjs|cjs|css|json|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|wasm)$/;

function shouldProxyToPledgepack(pathname: string): boolean {
  if (pathname.startsWith('/src/')) return true;
  if (pathname.startsWith('/app/')) return true;
  if (pathname.startsWith('/node_modules/')) return true;
  if (pathname.startsWith('/@fs/')) return true;
  if (pathname.startsWith('/@id/')) return true;
  if (pathname.startsWith('/__pledge_hmr')) return true;
  if (pathname.startsWith('/__pledge_router')) return true;
  if (pathname.startsWith('/__pledge_public/')) return true;
  if (pathname.startsWith('/__pledge_error')) return true;
  if (MODULE_EXTENSIONS.test(pathname)) return true;
  return false;
}

function proxyRequest(req: IncomingMessage, res: ServerResponse, target: string) {
  const proxyReq = httpRequest(target + req.url, {
    method: req.method,
    headers: req.headers,
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    console.error('[pledgestack] Proxy error:', err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway — PledgePack dev server unavailable');
  });
  req.pipe(proxyReq);
}

function proxyUpgrade(req: IncomingMessage, socket: import('node:stream').Duplex, _head: Buffer, target: string) {
  const targetUrl = new URL(target);
  const proxyReq = httpRequest({
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: req.url,
    method: 'GET',
    headers: {
      ...req.headers,
      host: targetUrl.host,
    },
  });
  proxyReq.on('upgrade', (proxyRes, proxySocket: import('node:net').Socket, proxyHead: Buffer) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      `Upgrade: websocket\r\n` +
      `Connection: Upgrade\r\n` +
      `Sec-WebSocket-Accept: ${proxyRes.headers['sec-websocket-accept'] ?? ''}\r\n` +
      (proxyRes.headers['sec-websocket-protocol']
        ? `Sec-WebSocket-Protocol: ${proxyRes.headers['sec-websocket-protocol']}\r\n`
        : '') +
      `\r\n`
    );
    if (proxyHead.length > 0) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on('error', (err) => {
    console.error('[pledgestack] WebSocket proxy error:', err);
    socket.destroy();
  });
  proxyReq.end();
}

/**
 * Attempts to serve a static file from the public directory.
 */
async function tryServeStatic(
  _req: IncomingMessage,
  res: ServerResponse,
  config: PledgeConfig,
): Promise<boolean> {
  const url = _req.url ?? '/';
  if (url === '/' || url.includes('/__pledge__/')) return false;

  const filePath = join(config.rootDir, config.publicDir, url);
  try {
    const content = await readFile(filePath);
    const ext = extname(filePath);
    const contentType = getContentType(ext);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };
  return types[ext] ?? 'application/octet-stream';
}
