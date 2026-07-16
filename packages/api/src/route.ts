import type { PledgeRequest, PledgeResponse } from '@pledgestack/shared';

export type ApiRouteHandler = (
  req: PledgeRequest,
) => Promise<PledgeResponse> | PledgeResponse;

export interface ApiRouteOptions {
  /** Validate request before handler */
  validate?: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
  };
  /** Rate limit configuration */
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  /** Middleware to run before handler */
  middleware?: Array<(req: PledgeRequest) => Promise<PledgeResponse | null>>;
}

export function defineApiRoute(
  handler: ApiRouteHandler,
  _options?: ApiRouteOptions,
): ApiRouteHandler {
  return handler;
}
