/**
 * Plugin runner — orchestrates plugin hook execution across the framework lifecycle.
 *
 * Plugins are executed in order. Hooks that return a value (configResolved, renderEnd,
 * transformHtml, transformClientBundle) chain the output of one plugin into the input
 * of the next. Hooks that return void run in sequence.
 */
export class PluginRunner {
    plugins;
    constructor(plugins = []) {
        this.plugins = plugins;
    }
    /** Run configResolved hooks — each plugin can modify and pass forward */
    async runConfigResolved(config) {
        let result = config;
        for (const plugin of this.plugins) {
            if (plugin.configResolved) {
                const returned = await plugin.configResolved(result);
                if (returned)
                    result = returned;
            }
        }
        return result;
    }
    /** Run buildStart hooks */
    async runBuildStart(config) {
        for (const plugin of this.plugins) {
            if (plugin.buildStart)
                await plugin.buildStart(config);
        }
    }
    /** Run buildEnd hooks */
    async runBuildEnd(config) {
        for (const plugin of this.plugins) {
            if (plugin.buildEnd)
                await plugin.buildEnd(config);
        }
    }
    /** Run configureServer hooks */
    async runConfigureServer(server) {
        for (const plugin of this.plugins) {
            if (plugin.configureServer)
                await plugin.configureServer(server);
        }
    }
    /** Run renderStart hooks */
    async runRenderStart(ctx) {
        for (const plugin of this.plugins) {
            if (plugin.renderStart)
                await plugin.renderStart(ctx);
        }
    }
    /** Run renderEnd hooks — chains HTML through each plugin */
    async runRenderEnd(ctx, html) {
        let result = html;
        for (const plugin of this.plugins) {
            if (plugin.renderEnd) {
                result = await plugin.renderEnd(ctx, result);
            }
        }
        return result;
    }
    /** Run routeMatch hooks — first plugin to set response wins */
    async runRouteMatch(ctx) {
        let result = ctx;
        for (const plugin of this.plugins) {
            if (plugin.routeMatch && result) {
                const returned = await plugin.routeMatch(result);
                if (returned)
                    result = returned;
                if (result?.response)
                    return result;
            }
        }
        return result;
    }
    /** Run transformHtml hooks — chains HTML through each plugin */
    async runTransformHtml(html, ctx) {
        let result = html;
        for (const plugin of this.plugins) {
            if (plugin.transformHtml) {
                result = await plugin.transformHtml(result, ctx);
            }
        }
        return result;
    }
    /** Run transformClientBundle hooks — chains code through each plugin */
    async runTransformClientBundle(code) {
        let result = code;
        for (const plugin of this.plugins) {
            if (plugin.transformClientBundle) {
                result = await plugin.transformClientBundle(result);
            }
        }
        return result;
    }
    /** Run fetchIntercept hooks — first plugin to return a Response wins */
    async runFetchIntercept(url, init) {
        for (const plugin of this.plugins) {
            if (plugin.fetchIntercept) {
                const result = await plugin.fetchIntercept(url, init);
                if (result)
                    return result;
            }
        }
        return null;
    }
    /** Get all registered plugins */
    getPlugins() {
        return this.plugins;
    }
}
/**
 * Helper to define a plugin with full type safety.
 */
export function definePlugin(plugin) {
    return plugin;
}
//# sourceMappingURL=plugin-runner.js.map