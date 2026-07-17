import { AsyncLocalStorage } from 'node:async_hooks';
import type { PledgeRequest } from 'pledgestack-shared';

/**
 * Request-scoped storage using AsyncLocalStorage.
 * This allows server utilities (cookies, headers) to access
 * the current request without explicit parameter passing.
 */

interface RequestContext extends PledgeRequest {
  /** Mutable response headers set by headers() mutation */
  _responseHeaders?: Record<string, string>;
  /** Mutable response cookies set by cookies() mutation */
  _responseCookies?: Record<string, string>;
  /** Deferred callbacks to run after response is sent */
  _afterCallbacks?: Array<() => Promise<void> | void>;
  /** Whether notFound() was called */
  _notFoundCalled?: boolean;
  /** Redirect destination if redirect() was called */
  _redirectDestination?: string;
  _redirectStatus?: number;
}

const requestStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Sets the current request context for server utilities.
 * Called by the request handler before rendering.
 */
export function setRequestContext(req: PledgeRequest): void {
  requestStorage.enterWith({ ...req });
}

/**
 * Clears the current request context.
 * Called after the request is complete.
 */
export function clearRequestContext(): void {
  // AsyncLocalStorage doesn't have explicit clear — it's scoped to the async context
}

/**
 * Gets the current request context (internal).
 */
function getRequest(): RequestContext {
  const req = requestStorage.getStore();
  if (!req) {
    throw new Error('Server utilities can only be called during request handling.');
  }
  return req;
}

/**
 * Reads or mutates cookies for the current request.
 *
 * Reading: returns a record of cookie name -> value.
 * Mutation: pass a setter function to set response cookies.
 *
 * Usage:
 *   const c = cookies(); // read request cookies
 *   cookies((c) => { c.set('session', 'abc', { httpOnly: true }) }); // set response cookie
 */
export function cookies(setter?: (jar: CookieJar) => void): Record<string, string> {
  const ctx = getRequest();
  if (setter) {
    if (!ctx._responseCookies) ctx._responseCookies = {};
    const jar = new CookieJar(ctx._responseCookies);
    setter(jar);
    return ctx._responseCookies;
  }
  return { ...ctx.cookies };
}

/**
 * Reads or mutates headers for the current request.
 *
 * Reading: returns a readonly record of header name -> value.
 * Mutation: pass a setter function to set response headers.
 *
 * Usage:
 *   const h = headers(); // read request headers
 *   headers((h) => { h.set('X-Custom', 'value') }); // set response header
 */
export function headers(setter?: (headerStore: HeaderStore) => void): Record<string, string> {
  const ctx = getRequest();
  if (setter) {
    if (!ctx._responseHeaders) ctx._responseHeaders = {};
    const store = new HeaderStore(ctx._responseHeaders);
    setter(store);
    return ctx._responseHeaders;
  }
  return { ...ctx.headers };
}

/**
 * Reads the current request's search params / query.
 */
export function searchParams(): Record<string, string> {
  return { ...getRequest().query };
}

/**
 * Gets the current request params (route parameters).
 */
export function params(): Record<string, string> {
  return { ...getRequest().params };
}

/**
 * Draft mode / preview mode utility.
 * Returns an object with isEnabled and enable/enable methods.
 */
export function draftMode(): {
  isEnabled: boolean;
  enable(): void;
  disable(): void;
} {
  const req = getRequest();
  const draftCookie = req.cookies['__pledge_draft'];
  let enabled = draftCookie === 'true';

  return {
    get isEnabled() {
      return enabled;
    },
    enable() {
      enabled = true;
    },
    disable() {
      enabled = false;
    },
  };
}

// ---------------------------------------------------------------------------
// CookieJar — mutable cookie store for cookies() mutation
// ---------------------------------------------------------------------------

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
}

export class CookieJar {
  constructor(private store: Record<string, string>) {}

  set(name: string, value: string, options: CookieOptions = {}): void {
    const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
    if (options.httpOnly) parts.push('HttpOnly');
    if (options.secure) parts.push('Secure');
    if (options.sameSite) parts.push(`SameSite=${options.sameSite.charAt(0).toUpperCase()}${options.sameSite.slice(1)}`);
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    this.store[name] = parts.join('; ');
  }

  delete(name: string, options: CookieOptions = {}): void {
    this.set(name, '', { ...options, maxAge: 0, expires: new Date(0) });
  }

  get(name: string): string | undefined {
    return this.store[name];
  }

  getAll(): Record<string, string> {
    return { ...this.store };
  }
}

// ---------------------------------------------------------------------------
// HeaderStore — mutable header store for headers() mutation
// ---------------------------------------------------------------------------

export class HeaderStore {
  constructor(private store: Record<string, string>) {}

  set(name: string, value: string): void {
    this.store[name] = value;
  }

  append(name: string, value: string): void {
    if (this.store[name]) {
      this.store[name] = `${this.store[name]}, ${value}`;
    } else {
      this.store[name] = value;
    }
  }

  delete(name: string): void {
    delete this.store[name];
  }

  get(name: string): string | undefined {
    return this.store[name];
  }

  getAll(): Record<string, string> {
    return { ...this.store };
  }
}

// ---------------------------------------------------------------------------
// redirect() — type-safe redirect from server components, route handlers, middleware
// ---------------------------------------------------------------------------

export class RedirectError extends Error {
  readonly destination: string;
  readonly status: number;

  constructor(destination: string, status: number = 307) {
    super(`Redirecting to ${destination}`);
    this.name = 'RedirectError';
    this.destination = destination;
    this.status = status;
  }
}

export function redirect(destination: string, status: number = 307): never {
  const ctx = getRequest();
  ctx._redirectDestination = destination;
  ctx._redirectStatus = status;
  throw new RedirectError(destination, status);
}

// ---------------------------------------------------------------------------
// notFound() — trigger 404 rendering from server components and route handlers
// ---------------------------------------------------------------------------

export class NotFoundError extends Error {
  constructor() {
    super('Not Found');
    this.name = 'NotFoundError';
  }
}

export function notFound(): never {
  const ctx = getRequest();
  ctx._notFoundCalled = true;
  throw new NotFoundError();
}

// ---------------------------------------------------------------------------
// after() — defer non-critical work until after response is sent to client
// ---------------------------------------------------------------------------

export function after(callback: () => Promise<void> | void): void {
  const ctx = getRequest();
  if (!ctx._afterCallbacks) ctx._afterCallbacks = [];
  ctx._afterCallbacks.push(callback);
}

export function getAfterCallbacks(): Array<() => Promise<void> | void> {
  const ctx = getRequest();
  return ctx._afterCallbacks ?? [];
}

// ---------------------------------------------------------------------------
// connection() — connection state in server components for streaming/edge
// ---------------------------------------------------------------------------

export interface ConnectionState {
  /** Whether the connection is still open */
  isOpen: boolean;
  /** Whether the response has started streaming */
  isStreaming: boolean;
  /** Wait for the connection to be ready (edge/streaming) */
  ready: () => Promise<void>;
}

export function connection(): ConnectionState {
  getRequest();
  let _open = true;
  let _streaming = false;

  return {
    get isOpen() {
      return _open;
    },
    get isStreaming() {
      return _streaming;
    },
    ready: async () => {
      _streaming = true;
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers for handler to check redirect/notFound state
// ---------------------------------------------------------------------------

export function getRedirectDestination(): { destination: string; status: number } | null {
  const ctx = requestStorage.getStore();
  if (!ctx) return null;
  if (ctx._redirectDestination) {
    return { destination: ctx._redirectDestination, status: ctx._redirectStatus ?? 307 };
  }
  return null;
}

export function wasNotFoundCalled(): boolean {
  const ctx = requestStorage.getStore();
  return ctx?._notFoundCalled ?? false;
}
