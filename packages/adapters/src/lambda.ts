import { createEdgeHandler } from '@pledgestack/server';
import type { PledgeConfig } from '@pledgestack/shared';
import { createEdgeConfig, type EdgeBundleConfig } from './index';

export { createEdgeConfig, type EdgeBundleConfig };

/**
 * AWS Lambda adapter for PledgeStack.
 *
 * PledgePack generates a Node.js bundle for Lambda. This adapter provides
 * the Lambda handler that converts API Gateway events to Request/Response.
 *
 * Usage — PledgePack generates this as the Lambda entry:
 * ```typescript
 * import { createLambdaHandler } from '@pledgestack/adapters/lambda';
 *
 * export const handler = createLambdaHandler({ config });
 * ```
 */

export interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  queryStringParameters?: Record<string, string>;
  headers: Record<string, string>;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext?: {
    domainName?: string;
    stage?: string;
  };
}

export interface APIGatewayResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

export function createLambdaHandler(options: { config: PledgeConfig }) {
  const handler = createEdgeHandler({ config: options.config });

  return async function lambdaHandler(event: APIGatewayEvent): Promise<APIGatewayResult> {
    const domain = event.requestContext?.domainName ?? 'localhost';
    const stage = event.requestContext?.stage ?? 'production';
    const path = stage === '$default' ? event.path : `/${stage}${event.path}`;
    const url = new URL(path, `https://${domain}`);

    if (event.queryStringParameters) {
      for (const [key, value] of Object.entries(event.queryStringParameters)) {
        url.searchParams.set(key, value);
      }
    }

    const request = new Request(url.toString(), {
      method: event.httpMethod,
      headers: event.headers,
      body: event.body ?? undefined,
    });

    const response = await handler(request);
    const body = await response.text();

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      statusCode: response.status,
      headers,
      body,
    };
  };
}

/**
 * Generate SAM template for PledgeStack on Lambda.
 */
export function generateSAMTemplate(options?: {
  functionName?: string;
  runtime?: string;
  memorySize?: number;
  timeout?: number;
}): Record<string, unknown> {
  return {
    Resources: {
      PledgeFunction: {
        Type: 'AWS::Serverless::Function',
        Properties: {
          FunctionName: options?.functionName ?? 'pledgestack',
          Runtime: options?.runtime ?? 'nodejs20.x',
          MemorySize: options?.memorySize ?? 512,
          Timeout: options?.timeout ?? 10,
          Handler: 'index.handler',
          CodeUri: '.pledge/lambda/',
          Events: {
            Proxy: {
              Type: 'HttpApi',
              Properties: {
                Path: '/{proxy+}',
                Method: 'ANY',
              },
            },
          },
        },
      },
    },
  };
}

export function getLambdaEdgeConfig(): EdgeBundleConfig {
  return createEdgeConfig('lambda', { excludeNodeBuiltins: false });
}
