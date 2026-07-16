export const DEFAULT_CONFIG = {
    rootDir: process.cwd(),
    appDir: 'app',
    publicDir: 'public',
    outDir: '.pledge',
    defaultRuntime: 'node',
    rsc: true,
    tailwind: true,
    output: 'standalone',
};
export function resolveConfig(userConfig) {
    const config = { ...DEFAULT_CONFIG, ...userConfig };
    if (userConfig.plugins) {
        for (const plugin of userConfig.plugins) {
            if (plugin.configResolved) {
                const result = plugin.configResolved(config);
                if (result)
                    Object.assign(config, result);
            }
        }
    }
    return config;
}
export function defineConfig(config) {
    return config;
}
//# sourceMappingURL=config.js.map