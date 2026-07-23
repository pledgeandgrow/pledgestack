/**
 * #275 — Edge Middleware in Rust.
 *
 * .ps middleware files compiled to WASM for edge runtime,
 * native-speed request processing at edge, no Node.js cold start.
 *
 * Provides:
 * - WASM middleware compilation config
 * - Middleware chain executor
 * - Request/response transformation
 * - Auth, CORS, rate limiting middleware templates
 */

import { EventEmitter } from 'node:events';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EdgeRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  cf?: {
    country?: string;
    city?: string;
    timezone?: string;
    colo?: string;
  };
}

export interface EdgeResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export type EdgeMiddlewareResult = EdgeResponse | null;

export interface Middleware {
  name: string;
  handle(req: EdgeRequest, next: (req: EdgeRequest) => Promise<EdgeResponse>): Promise<EdgeMiddlewareResult>;
}

export interface WasmMiddlewareConfig {
  /** Module name */
  moduleName: string;
  /** Middleware functions to export */
  middlewares: Array<{ name: string; isAsync: boolean }>;
  /** Whether to enable SIMD (default: true) */
  enableSimd?: boolean;
  /** Optimize for size (default: true) */
  optimizeForSize?: boolean;
}

export interface WasmMiddlewareBuildResult {
  moduleName: string;
  wasmPath: string;
  jsPath: string;
  exports: string[];
  buildTimeMs: number;
}

// ---------------------------------------------------------------------------
// Middleware Chain Executor
// ---------------------------------------------------------------------------

/**
 * Executes a chain of middleware in order, with each middleware
 * able to short-circuit or pass to the next.
 */
export class MiddlewareChain extends EventEmitter {
  private middlewares: Middleware[] = [];

  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  async run(req: EdgeRequest): Promise<EdgeResponse> {
    let index = 0;

    const next = async (req: EdgeRequest): Promise<EdgeResponse> => {
      if (index >= this.middlewares.length) {
        return { status: 404, headers: {}, body: 'Not Found' };
      }

      const middleware = this.middlewares[index++];
      this.emit('middleware-start', { name: middleware.name, url: req.url });

      let nextCalled = false;
      let nextResult: EdgeResponse | null = null;

      const wrappedNext = async (req: EdgeRequest): Promise<EdgeResponse> => {
        nextCalled = true;
        const result = await next(req);
        nextResult = result;
        return result;
      };

      const result = await middleware.handle(req, wrappedNext);

      if (result) {
        this.emit('middleware-shortcircuit', { name: middleware.name, status: result.status });
        return result;
      }

      // If middleware returned null, it should have called next.
      // Return the response from next if it was called.
      if (nextCalled && nextResult) {
        return nextResult;
      }

      // Middleware neither returned a response nor called next
      return { status: 404, headers: {}, body: 'Not Found' };
    };

    const response = await next(req);
    this.emit('complete', { status: response.status, url: req.url });
    return response;
  }

  clear(): void {
    this.middlewares = [];
  }

  list(): string[] {
    return this.middlewares.map(m => m.name);
  }
}

// ---------------------------------------------------------------------------
// Built-in Middleware Templates
// ---------------------------------------------------------------------------

/**
 * CORS middleware for edge.
 */
export function createCorsMiddleware(options: {
  origin?: string;
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}): Middleware {
  const origin = options.origin ?? '*';
  const methods = options.methods ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  const headers = options.headers ?? ['Content-Type', 'Authorization'];
  const credentials = options.credentials ?? false;

  return {
    name: 'cors',
    async handle(req, next) {
      if (req.method === 'OPTIONS') {
        return {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': methods.join(', '),
            'Access-Control-Allow-Headers': headers.join(', '),
            'Access-Control-Allow-Credentials': String(credentials),
          },
          body: '',
        };
      }

      const response = await next(req);
      response.headers['Access-Control-Allow-Origin'] = origin;
      response.headers['Access-Control-Allow-Credentials'] = String(credentials);
      return response;
    },
  };
}

/**
 * Rate limiting middleware using in-memory counter.
 */
export function createRateLimitMiddleware(options: {
  maxRequests: number;
  windowMs: number;
}): Middleware {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return {
    name: 'rate-limit',
    async handle(req, next) {
      const key = req.headers['x-forwarded-for'] ?? req.url;
      const now = Date.now();

      let entry = requests.get(key);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + options.windowMs };
        requests.set(key, entry);
      }

      entry.count++;

      if (entry.count > options.maxRequests) {
        return {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          },
          body: JSON.stringify({ error: 'Rate limit exceeded' }),
        };
      }

      return next(req);
    },
  };
}

/**
 * Auth middleware that checks for Bearer token.
 */
export function createAuthMiddleware(options: {
  validateToken: (token: string) => boolean | Promise<boolean>;
}): Middleware {
  return {
    name: 'auth',
    async handle(req, next) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          status: 401,
          headers: { 'WWW-Authenticate': 'Bearer' },
          body: JSON.stringify({ error: 'Missing or invalid authorization header' }),
        };
      }

      const token = authHeader.slice(7);
      const valid = await options.validateToken(token);
      if (!valid) {
        return {
          status: 403,
          headers: {} as Record<string, string>,
          body: JSON.stringify({ error: 'Invalid token' }),
        };
      }

      return next(req);
    },
  };
}

/**
 * Geo-redirect middleware that redirects based on country.
 */
export function createGeoRedirectMiddleware(options: {
  redirects: Record<string, string>;
  defaultUrl?: string;
}): Middleware {
  return {
    name: 'geo-redirect',
    async handle(req, next) {
      const country = req.cf?.country;
      if (country && options.redirects[country]) {
        return {
          status: 302,
          headers: { Location: options.redirects[country] },
          body: '',
        };
      }
      if (options.defaultUrl) {
        return {
          status: 302,
          headers: { Location: options.defaultUrl },
          body: '',
        };
      }
      return next(req);
    },
  };
}

// ---------------------------------------------------------------------------
// WASM Middleware Code Generation
// ---------------------------------------------------------------------------

/**
 * Generates the Rust source for WASM edge middleware.
 */
export function generateWasmMiddlewareSource(config: WasmMiddlewareConfig): string {

  const fnBodies = config.middlewares.map(m => {
    if (m.isAsync) {
      return `#[wasm_bindgen]
pub async fn ${m.name}(req_json: String) -> String {
    // Parse request, process, return response JSON
    let _req: serde_json::Value = serde_json::from_str(&req_json).unwrap();
    let response = serde_json::json!({
        "status": 200,
        "headers": {},
        "body": ""
    });
    serde_json::to_string(&response).unwrap()
}`;
    }
    return `#[wasm_bindgen]
pub fn ${m.name}(req_json: String) -> String {
    let _req: serde_json::Value = serde_json::from_str(&req_json).unwrap();
    let response = serde_json::json!({
        "status": 200,
        "headers": {},
        "body": ""
    });
    serde_json::to_string(&response).unwrap()
}`;
  }).join('\n\n');

  return `// Auto-generated WASM edge middleware: ${config.moduleName}
use wasm_bindgen::prelude::*;
use serde_json;

${fnBodies}
`;
}

/**
 * Generates the Cargo.toml for WASM middleware.
 */
export function generateWasmMiddlewareCargo(config: WasmMiddlewareConfig): string {
  const optFlag = config.optimizeForSize !== false ? 'z' : '3';

  return `[package]
name = "pledge-middleware-${config.moduleName}"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
opt-level = "${optFlag}"
lto = true
codegen-units = 1
panic = "abort"
strip = true
`;
}

/**
 * Generates the JS wrapper for WASM middleware.
 */
export function generateWasmMiddlewareWrapper(config: WasmMiddlewareConfig): string {
  const exports = config.middlewares.map(m => m.name);

  return `// Auto-generated WASM middleware wrapper: ${config.moduleName}
import { ${exports.join(', ')} } from './${config.moduleName}_bg.js';

export const middleware = {
${exports.map(name => `  ${name},`).join('\n')}
};

export async function runMiddlewareChain(
  req: { method: string; url: string; headers: Record<string, string> },
  chain: string[],
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  let currentReq = req;
  for (const name of chain) {
    const fn = middleware[name];
    if (!fn) throw new Error(\`Middleware "\${name}" not found\`);
    const result = typeof fn === 'function'
      ? await fn(JSON.stringify(currentReq))
      : JSON.stringify({ status: 500, headers: {}, body: 'Invalid middleware' });
    let response: { status: number; headers: Record<string, string>; body: string };
    try {
      response = JSON.parse(result);
    } catch {
      response = { status: 500, headers: {}, body: 'Middleware returned invalid JSON' };
    }
    if (response.status !== 200 || response.body !== '') {
      return response;
    }
  }
  return { status: 200, headers: {}, body: '' };
}
`;
}
