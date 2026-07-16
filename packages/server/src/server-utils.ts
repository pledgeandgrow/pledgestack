import { AsyncLocalStorage } from 'node:async_hooks';
import type { PledgeRequest } from 'pledgestack-shared';

/**
 * Request-scoped storage using AsyncLocalStorage.
 * This allows server utilities (cookies, headers) to access
 * the current request without explicit parameter passing.
 */

const requestStorage = new AsyncLocalStorage<PledgeRequest>();

/**
 * Sets the current request context for server utilities.
 * Called by the request handler before rendering.
 */
export function setRequestContext(req: PledgeRequest): void {
  requestStorage.enterWith(req);
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
function getRequest(): PledgeRequest {
  const req = requestStorage.getStore();
  if (!req) {
    throw new Error('Server utilities can only be called during request handling.');
  }
  return req;
}

/**
 * Reads cookies from the current request.
 * Returns a readonly record of cookie name -> value.
 */
export function cookies(): Record<string, string> {
  return { ...getRequest().cookies };
}

/**
 * Reads headers from the current request.
 * Returns a readonly record of header name -> value.
 */
export function headers(): Record<string, string> {
  return { ...getRequest().headers };
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
