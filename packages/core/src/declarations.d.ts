declare module 'react-server-dom-webpack/client' {
  import type { ReactNode } from 'react';
  export function createFromReadableStream(stream: ReadableStream<Uint8Array>): Promise<ReactNode>;
  export function createFromFetch(promise: Promise<Response>): Promise<ReactNode>;
}

declare module 'react-server-dom-webpack/server' {
  import type { ReactNode } from 'react';
  export function renderToReadableStream(element: ReactNode): ReadableStream<Uint8Array>;
}

declare module 'redis' {
  export function createClient(options?: { url?: string }): {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    publish(channel: string, message: string): Promise<number>;
    subscribe(channel: string, callback: (message: string) => void): Promise<void>;
    unsubscribe(channel: string): Promise<void>;
  };
}

declare module 'better-sqlite3' {
  interface Database {
    run(sql: string): void;
    prepare(sql: string): { get(...params: unknown[]): unknown; all(...params: unknown[]): unknown[] };
    close(): void;
  }
  const Database: { new (path: string): Database };
  export default Database;
}

declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config?: { region?: string; credentials?: unknown });
    send(command: unknown): Promise<unknown>;
  }
  export class GetObjectCommand { constructor(input: unknown); }
  export class PutObjectCommand { constructor(input: unknown); }
  export class DeleteObjectCommand { constructor(input: unknown); }
  export class HeadObjectCommand { constructor(input: unknown); }
  export class ListObjectsV2Command { constructor(input: unknown); }
  export class DeleteObjectsCommand { constructor(input: unknown); }
}
