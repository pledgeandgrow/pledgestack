import type { MiddlewareResult } from 'pledgestack-shared';

/**
 * PledgeResponse — NextResponse-style API for middleware and route handlers.
 *
 * Provides static factory methods for common response types:
 * - PledgeResponse.json() — JSON response
 * - PledgeResponse.redirect() — Redirect response
 * - PledgeResponse.rewrite() — Rewrite response
 * - PledgeResponse.next() — Continue to next handler
 * - PledgeResponse.stream() — Streaming response
 */

export class PledgeResponse {
  status: number;
  headers: Record<string, string>;
  body: string | ReadableStream<Uint8Array> | null;

  constructor(status: number, headers: Record<string, string>, body: string | ReadableStream<Uint8Array> | null) {
    this.status = status;
    this.headers = headers;
    this.body = body;
  }

  /** Create a JSON response */
  static json(data: unknown, status = 200): PledgeResponse {
    return new PledgeResponse(status, { 'Content-Type': 'application/json' }, JSON.stringify(data));
  }

  /** Create a redirect response */
  static redirect(destination: string, status = 307): PledgeResponse {
    return new PledgeResponse(status, { Location: destination }, null);
  }

  /** Create a permanent redirect (308) */
  static permanentRedirect(destination: string): PledgeResponse {
    return PledgeResponse.redirect(destination, 308);
  }

  /** Create a rewrite response (middleware only) */
  static rewrite(destination: string): MiddlewareResult {
    return { rewrite: destination };
  }

  /** Continue to the next handler (middleware only) */
  static next(headers?: Record<string, string>): MiddlewareResult {
    return { next: true, headers };
  }

  /** Create a streaming response */
  static stream(
    stream: ReadableStream<Uint8Array>,
    options?: { status?: number; headers?: Record<string, string> },
  ): PledgeResponse {
    return new PledgeResponse(
      options?.status ?? 200,
      {
        'Content-Type': options?.headers?.['Content-Type'] ?? 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        ...options?.headers,
      },
      stream,
    );
  }

  /** Create a text response */
  static text(text: string, status = 200): PledgeResponse {
    return new PledgeResponse(status, { 'Content-Type': 'text/plain; charset=utf-8' }, text);
  }

  /** Create an HTML response */
  static html(html: string, status = 200): PledgeResponse {
    return new PledgeResponse(status, { 'Content-Type': 'text/html; charset=utf-8' }, html);
  }

  /** Create a 204 No Content response */
  static noContent(): PledgeResponse {
    return new PledgeResponse(204, {}, null);
  }

  /** Create an error response */
  static error(message: string, status = 500): PledgeResponse {
    return new PledgeResponse(status, { 'Content-Type': 'application/json' }, JSON.stringify({ error: message }));
  }

  /** Convert to a Web Response */
  toWebResponse(): Response {
    return new Response(this.body, {
      status: this.status,
      headers: this.headers,
    });
  }
}

/**
 * Creates a streaming Response from an async generator.
 * Useful for route handlers that stream data.
 *
 * @example
 * export async function GET() {
 *   return PledgeResponse.stream(
 *     streamFromAsync(async function* () {
 *       yield 'data: hello\n\n';
 *       await delay(1000);
 *       yield 'data: world\n\n';
 *     })
 *   );
 * }
 */
export function streamFromAsync(
  generator: () => AsyncGenerator<string, void, unknown>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator()) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
