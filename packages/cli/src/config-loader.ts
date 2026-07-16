import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { PledgeConfig, UserConfig } from 'pledgestack-shared';
import { resolveConfig, DEFAULT_CONFIG } from 'pledgestack-shared';

/**
 * Loads the pledge.config.ts or pledge.config.js from the project root.
 * Uses jiti for TypeScript config support at runtime.
 * Falls back to default config if no file is found.
 */
export async function loadConfig(rootDir?: string): Promise<PledgeConfig> {
  const root = rootDir ?? process.cwd();
  const configPaths = [
    join(root, 'pledgestack.config.ts'),
    join(root, 'pledgestack.config.js'),
    join(root, 'pledge.config.ts'),
    join(root, 'pledge.config.js'),
    join(root, 'pledge.config.mjs'),
  ];

  for (const configPath of configPaths) {
    if (!existsSync(configPath)) continue;

    try {
      let userConfig: UserConfig;

      if (configPath.endsWith('.ts')) {
        const { createJiti } = await import('jiti');
        const jiti = createJiti(import.meta.url);
        const mod = await jiti.import(configPath);
        userConfig = (mod as { default?: UserConfig }).default ?? (mod as UserConfig);
      } else {
        const mod = await import(configPath);
        userConfig = mod.default ?? mod;
      }

      return resolveConfig({ ...userConfig, rootDir: root });
    } catch {
      continue;
    }
  }

  return { ...DEFAULT_CONFIG, rootDir: root };
}
