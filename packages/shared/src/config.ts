import type { I18nConfig } from './types';

export type Runtime = 'node' | 'edge';

export type RenderMode = 'ssr' | 'ssg' | 'rsc' | 'api';

export type OutputMode = 'standalone' | 'export';

export interface PledgeConfig {
  /** Root directory of the project */
  rootDir: string;
  /** Directory containing the app routes (default: 'app') */
  appDir: string;
  /** Directory containing public assets (default: 'public') */
  publicDir: string;
  /** Output directory for builds (default: '.pledge') */
  outDir: string;
  /** Default runtime for routes (default: 'node') */
  defaultRuntime: Runtime;
  /** Whether to enable React Server Components (default: true) */
  rsc: boolean;
  /** Whether to enable Tailwind CSS (default: true) */
  tailwind: boolean;
  /** Output mode: 'standalone' for server, 'export' for static HTML (default: 'standalone') */
  output: OutputMode;
  /** i18n configuration */
  i18n?: I18nConfig;
  /** Custom middleware path */
  middlewarePath?: string;
  /** Plugins to extend the framework */
  plugins?: PledgePlugin[];
  /** PledgePack build/bundler configuration */
  pledgepack?: PledgePackConfig;
}

/**
 * PledgePack build/bundler configuration.
 *
 * These fields are passed to PledgePack's Rust binary via CLI flags
 * or a JSON config file. PledgeStack reads them from pledge.config.ts
 * and forwards them to `pledge build` / `pledge serve`.
 */
export interface PledgePackConfig {
  /** Target framework for transforms (default: 'react') */
  framework?: 'react';
  /** Generate source maps in production (default: false) */
  sourceMaps?: boolean;
  /** Environment variable prefix for client-side exposure (default: 'PUBLIC_') */
  envPrefix?: string;
  /** Enable gzip compression for static assets (default: true) */
  compressGzip?: boolean;
  /** Enable brotli compression for static assets (default: true) */
  compressBrotli?: boolean;
  /** Dev server configuration */
  devServer?: {
    /** Port for PledgePack dev server (default: 3001) */
    port?: number;
    /** Hostname for PledgePack dev server (default: 'localhost') */
    host?: string;
    /** Enable HMR WebSocket (default: true) */
    hmr?: boolean;
  };
  /** Production server configuration */
  server?: {
    /** Number of worker processes (default: CPU count) */
    workers?: number;
    /** Max request body size in bytes (default: 1MB) */
    maxBodySize?: number;
    /** Request timeout in seconds (default: 30) */
    timeout?: number;
  };
  /** Edge bundle configuration */
  edge?: {
    /** Target platform for edge bundle */
    target?: 'cloudflare' | 'vercel' | 'deno' | 'lambda' | 'netlify';
    /** Exclude Node.js built-in modules (default: true) */
    excludeNodeBuiltins?: boolean;
    /** Polyfills to include for Node.js APIs */
    polyfills?: string[];
  };
}

export interface PledgePlugin {
  name: string;
  /** Hook called during config resolution */
  configResolved?: (config: PledgeConfig) => PledgeConfig | void;
  /** Hook called during build start */
  buildStart?: (config: PledgeConfig) => void | Promise<void>;
  /** Hook called after build completes */
  buildEnd?: (config: PledgeConfig) => void | Promise<void>;
  /** Hook called during dev server setup */
  configureServer?: (server: PluginServerContext) => void | Promise<void>;
  /** Hook called before rendering a page */
  renderStart?: (ctx: PluginRenderContext) => void | Promise<void>;
  /** Hook called after rendering a page, before sending response */
  renderEnd?: (ctx: PluginRenderContext, html: string) => string | Promise<string>;
  /** Hook called when a route is matched, before handler execution */
  routeMatch?: (ctx: PluginRouteContext) => PluginRouteContext | void | Promise<PluginRouteContext | void>;
  /** Hook called on a fetch() call for caching/interception */
  fetchIntercept?: (url: string, init: RequestInit) => Response | null | Promise<Response | null>;
  /** Hook called to transform the HTML output */
  transformHtml?: (html: string, ctx: PluginRenderContext) => string | Promise<string>;
  /** Hook called to transform the client bundle */
  transformClientBundle?: (code: string) => string | Promise<string>;
}

export interface PluginServerContext {
  config: PledgeConfig;
  /** The HTTP server instance */
  httpServer: unknown;
  /** Reload the handler (invalidate module cache) */
  reload: () => void;
  /** The dev server port */
  port: number;
}

export interface PluginRenderContext {
  config: PledgeConfig;
  url: URL;
  pathname: string;
  params: Record<string, string>;
  status: number;
  headers: Record<string, string>;
}

export interface PluginRouteContext {
  config: PledgeConfig;
  pathname: string;
  method: string;
  params: Record<string, string>;
  /** Set to short-circuit the request */
  response?: { status: number; body: string };
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type UserConfig = DeepPartial<PledgeConfig> & {
  rootDir?: string;
};

export const DEFAULT_CONFIG: PledgeConfig = {
  rootDir: process.cwd(),
  appDir: 'app',
  publicDir: 'public',
  outDir: '.pledge',
  defaultRuntime: 'node',
  rsc: true,
  tailwind: true,
  output: 'standalone',
};

export function resolveConfig(userConfig: UserConfig): PledgeConfig {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  if (userConfig.plugins) {
    for (const plugin of userConfig.plugins) {
      if (plugin.configResolved) {
        const result = plugin.configResolved(config);
        if (result) Object.assign(config, result);
      }
    }
  }
  return config;
}

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
