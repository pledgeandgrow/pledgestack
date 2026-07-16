import type { PledgePlugin, PledgeConfig, PluginRenderContext, PluginRouteContext, PluginServerContext } from './config';
/**
 * Plugin runner — orchestrates plugin hook execution across the framework lifecycle.
 *
 * Plugins are executed in order. Hooks that return a value (configResolved, renderEnd,
 * transformHtml, transformClientBundle) chain the output of one plugin into the input
 * of the next. Hooks that return void run in sequence.
 */
export declare class PluginRunner {
    private plugins;
    constructor(plugins?: PledgePlugin[]);
    /** Run configResolved hooks — each plugin can modify and pass forward */
    runConfigResolved(config: PledgeConfig): Promise<PledgeConfig>;
    /** Run buildStart hooks */
    runBuildStart(config: PledgeConfig): Promise<void>;
    /** Run buildEnd hooks */
    runBuildEnd(config: PledgeConfig): Promise<void>;
    /** Run configureServer hooks */
    runConfigureServer(server: PluginServerContext): Promise<void>;
    /** Run renderStart hooks */
    runRenderStart(ctx: PluginRenderContext): Promise<void>;
    /** Run renderEnd hooks — chains HTML through each plugin */
    runRenderEnd(ctx: PluginRenderContext, html: string): Promise<string>;
    /** Run routeMatch hooks — first plugin to set response wins */
    runRouteMatch(ctx: PluginRouteContext): Promise<PluginRouteContext | undefined>;
    /** Run transformHtml hooks — chains HTML through each plugin */
    runTransformHtml(html: string, ctx: PluginRenderContext): Promise<string>;
    /** Run transformClientBundle hooks — chains code through each plugin */
    runTransformClientBundle(code: string): Promise<string>;
    /** Run fetchIntercept hooks — first plugin to return a Response wins */
    runFetchIntercept(url: string, init: RequestInit): Promise<Response | null>;
    /** Get all registered plugins */
    getPlugins(): readonly PledgePlugin[];
}
/**
 * Helper to define a plugin with full type safety.
 */
export declare function definePlugin(plugin: PledgePlugin): PledgePlugin;
//# sourceMappingURL=plugin-runner.d.ts.map