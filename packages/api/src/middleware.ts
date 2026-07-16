import type { PledgeRequest, PledgeResponse } from '@pledgestack/shared';

export type ApiMiddleware = (
  req: PledgeRequest,
) => Promise<PledgeResponse | null>;

export function createApiMiddleware(
  handler: ApiMiddleware,
): ApiMiddleware {
  return handler;
}

export function composeMiddleware(
  ...middlewares: ApiMiddleware[]
): ApiMiddleware {
  return async (req: PledgeRequest) => {
    for (const mw of middlewares) {
      const result = await mw(req);
      if (result) return result;
    }
    return null;
  };
}
