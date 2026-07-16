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
    response?: {
        status: number;
        body: string;
    };
}
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type UserConfig = DeepPartial<PledgeConfig> & {
    rootDir?: string;
};
export declare const DEFAULT_CONFIG: PledgeConfig;
export declare function resolveConfig(userConfig: UserConfig): PledgeConfig;
export declare function defineConfig(config: UserConfig): UserConfig;
//# sourceMappingURL=config.d.ts.map