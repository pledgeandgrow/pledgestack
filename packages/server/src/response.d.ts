import type { MiddlewareResult } from '@pledgestack/shared';
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
export declare class PledgeResponse {
    status: number;
    headers: Record<string, string>;
    body: string | ReadableStream<Uint8Array> | null;
    constructor(status: number, headers: Record<string, string>, body: string | ReadableStream<Uint8Array> | null);
    /** Create a JSON response */
    static json(data: unknown, status?: number): PledgeResponse;
    /** Create a redirect response */
    static redirect(destination: string, status?: number): PledgeResponse;
    /** Create a permanent redirect (308) */
    static permanentRedirect(destination: string): PledgeResponse;
    /** Create a rewrite response (middleware only) */
    static rewrite(destination: string): MiddlewareResult;
    /** Continue to the next handler (middleware only) */
    static next(headers?: Record<string, string>): MiddlewareResult;
    /** Create a streaming response */
    static stream(stream: ReadableStream<Uint8Array>, options?: {
        status?: number;
        headers?: Record<string, string>;
    }): PledgeResponse;
    /** Create a text response */
    static text(text: string, status?: number): PledgeResponse;
    /** Create an HTML response */
    static html(html: string, status?: number): PledgeResponse;
    /** Create a 204 No Content response */
    static noContent(): PledgeResponse;
    /** Create an error response */
    static error(message: string, status?: number): PledgeResponse;
    /** Convert to a Web Response */
    toWebResponse(): Response;
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
export declare function streamFromAsync(generator: () => AsyncGenerator<string, void, unknown>): ReadableStream<Uint8Array>;
//# sourceMappingURL=response.d.ts.map