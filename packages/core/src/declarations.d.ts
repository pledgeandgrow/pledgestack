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

// Optional peer dependencies for PSX integration fallbacks.
// These are installed by users via `pledge add <crate>` and are
// not required at build time — the fallbacks use dynamic imports.

declare module 'pg' {
  export class Pool {
    constructor(config?: { connectionString?: string; max?: number });
    query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
    end(): Promise<void>;
  }
}

declare module 'mysql2/promise' {
  export function createPool(config: { uri?: string; connectionLimit?: number }): {
    execute(sql: string, params?: unknown[]): Promise<[unknown[], unknown]>;
    end(): Promise<void>;
  };
}

declare module 'ioredis' {
  export default class Redis {
    constructor(url?: string);
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<unknown>;
    setEx(key: string, ttl: number, value: string): Promise<unknown>;
    expire(key: string, ttl: number): Promise<unknown>;
    del(key: string): Promise<unknown>;
    quit(): Promise<void>;
    disconnect(): void;
  }
}

declare module 'argon2' {
  export function hash(password: string): Promise<string>;
  export function verify(hash: string, password: string): Promise<boolean>;
}

declare module 'bcryptjs' {
  export function hash(password: string, rounds: number): Promise<string>;
  export function compare(password: string, hash: string): Promise<boolean>;
}

declare module 'jsonwebtoken' {
  export function sign(payload: unknown, secret: string, options?: { expiresIn?: number | string }): string;
  export function verify(token: string, secret: string): unknown;
}

declare module 'xlsx' {
  export function read(data: Buffer, opts?: { type?: string }): { SheetNames: string[]; Sheets: Record<string, unknown> };
  export function write(workbook: unknown, opts?: { type?: string; bookType?: string }): Buffer;
  export const utils: {
    book_new(): unknown;
    book_append_sheet(wb: unknown, sheet: unknown, name: string): void;
    aoa_to_sheet(rows: unknown[][]): unknown;
    sheet_to_json(sheet: unknown, opts?: { header?: number }): unknown[][];
  };
}

declare module 'sharp' {
  interface SharpInstance {
    resize(width?: number, height?: number): SharpInstance;
    rotate(angle?: number): SharpInstance;
    jpeg(opts?: { quality?: number }): SharpInstance;
    png(): SharpInstance;
    webp(opts?: { quality?: number }): SharpInstance;
    avif(opts?: { quality?: number }): SharpInstance;
    metadata(): Promise<{ width?: number; height?: number; format?: string }>;
    toBuffer(): Promise<Buffer>;
  }
  function sharp(input: Buffer): SharpInstance;
  export default sharp;
}

declare module 'puppeteer' {
  interface Page {
    setContent(html: string): Promise<void>;
    pdf(options?: { format?: string; margin?: Record<string, string> }): Promise<Uint8Array>;
    close(): Promise<void>;
  }
  interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }
  const puppeteer: {
    launch(options?: { headless?: boolean }): Promise<Browser>;
  };
  export default puppeteer;
}

declare module 'nodemailer' {
  interface Transporter {
    sendMail(options: {
      from?: string;
      to: string;
      subject: string;
      text?: string;
      html?: string;
      attachments?: { filename: string; content: Buffer }[];
    }): Promise<unknown>;
  }
  function createTransport(options: {
    host: string;
    port?: number;
    secure?: boolean;
    auth?: { user: string; pass?: string };
  }): Transporter;
  export = { createTransport };
}
