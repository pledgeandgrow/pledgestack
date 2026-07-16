import type { PledgePlugin, PledgeConfig, PluginRenderContext, PluginRouteContext, PluginServerContext } from './config';

/**
 * Plugin runner — orchestrates plugin hook execution across the framework lifecycle.
 *
 * Plugins are executed in order. Hooks that return a value (configResolved, renderEnd,
 * transformHtml, transformClientBundle) chain the output of one plugin into the input
 * of the next. Hooks that return void run in sequence.
 */
export class PluginRunner {
  private plugins: PledgePlugin[];

  constructor(plugins: PledgePlugin[] = []) {
    this.plugins = plugins;
  }

  /** Run configResolved hooks — each plugin can modify and pass forward */
  async runConfigResolved(config: PledgeConfig): Promise<PledgeConfig> {
    let result = config;
    for (const plugin of this.plugins) {
      if (plugin.configResolved) {
        const returned = await plugin.configResolved(result);
        if (returned) result = returned;
      }
    }
    return result;
  }

  /** Run buildStart hooks */
  async runBuildStart(config: PledgeConfig): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.buildStart) await plugin.buildStart(config);
    }
  }

  /** Run buildEnd hooks */
  async runBuildEnd(config: PledgeConfig): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.buildEnd) await plugin.buildEnd(config);
    }
  }

  /** Run configureServer hooks */
  async runConfigureServer(server: PluginServerContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.configureServer) await plugin.configureServer(server);
    }
  }

  /** Run renderStart hooks */
  async runRenderStart(ctx: PluginRenderContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.renderStart) await plugin.renderStart(ctx);
    }
  }

  /** Run renderEnd hooks — chains HTML through each plugin */
  async runRenderEnd(ctx: PluginRenderContext, html: string): Promise<string> {
    let result = html;
    for (const plugin of this.plugins) {
      if (plugin.renderEnd) {
        result = await plugin.renderEnd(ctx, result);
      }
    }
    return result;
  }

  /** Run routeMatch hooks — first plugin to set response wins */
  async runRouteMatch(ctx: PluginRouteContext): Promise<PluginRouteContext | undefined> {
    let result: PluginRouteContext | undefined = ctx;
    for (const plugin of this.plugins) {
      if (plugin.routeMatch && result) {
        const returned = await plugin.routeMatch(result);
        if (returned) result = returned;
        if (result?.response) return result;
      }
    }
    return result;
  }

  /** Run transformHtml hooks — chains HTML through each plugin */
  async runTransformHtml(html: string, ctx: PluginRenderContext): Promise<string> {
    let result = html;
    for (const plugin of this.plugins) {
      if (plugin.transformHtml) {
        result = await plugin.transformHtml(result, ctx);
      }
    }
    return result;
  }

  /** Run transformClientBundle hooks — chains code through each plugin */
  async runTransformClientBundle(code: string): Promise<string> {
    let result = code;
    for (const plugin of this.plugins) {
      if (plugin.transformClientBundle) {
        result = await plugin.transformClientBundle(result);
      }
    }
    return result;
  }

  /** Run fetchIntercept hooks — first plugin to return a Response wins */
  async runFetchIntercept(url: string, init: RequestInit): Promise<Response | null> {
    for (const plugin of this.plugins) {
      if (plugin.fetchIntercept) {
        const result = await plugin.fetchIntercept(url, init);
        if (result) return result;
      }
    }
    return null;
  }

  /** Get all registered plugins */
  getPlugins(): readonly PledgePlugin[] {
    return this.plugins;
  }
}

/**
 * Helper to define a plugin with full type safety.
 */
export function definePlugin(plugin: PledgePlugin): PledgePlugin {
  return plugin;
}
