declare module 'react-server-dom-webpack/client' {
  export function createFromReadableStream(stream: ReadableStream<Uint8Array>): Promise<import('react').ReactNode>;
  export function createFromFetch(fetchPromise: Promise<Response>): Promise<import('react').ReactNode>;
}
