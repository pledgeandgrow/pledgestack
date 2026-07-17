declare module 'react-server-dom-webpack/client' {
  import type { ReactNode } from 'react';
  export function createFromReadableStream(stream: ReadableStream<Uint8Array>): Promise<ReactNode>;
  export function createFromFetch(promise: Promise<Response>): Promise<ReactNode>;
}
