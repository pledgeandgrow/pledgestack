import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PledgeConfig } from 'pledgestack-shared';
import type { AcceptedPlugin } from 'postcss';

export interface TailwindOptions {
  config: PledgeConfig;
  /** Input CSS file path (relative to rootDir) */
  input?: string;
  /** Output CSS file path (relative to outDir) */
  output?: string;
}

/**
 * Processes CSS through the Tailwind CSS + PostCSS pipeline.
 * In production, this compiles Tailwind classes and runs PostCSS plugins.
 * In dev, it runs on-demand with watch mode support.
 *
 * This is a JavaScript implementation that uses the Tailwind CSS
 * and PostCSS APIs directly. In production, pledge (PledgePack) handles
 * this as part of the bundling pipeline.
 */
export async function processTailwind(options: TailwindOptions): Promise<string> {
  const { config, input = 'app/globals.css', output = '__pledge__/client.css' } = options;

  const inputPath = join(config.rootDir, input);
  const outputPath = join(config.rootDir, config.outDir, output);

  if (!existsSync(inputPath)) {
    console.warn(`[pledgestack] Tailwind input file not found: ${inputPath}`);
    return '';
  }

  const css = await readFile(inputPath, 'utf-8');

  // Try to use the Tailwind CSS v4+ API (if available)
  try {
    const tailwind = await import('@tailwindcss/postcss');
    const postcss = await import('postcss');

    const plugins: AcceptedPlugin[] = [
      tailwind.default() as AcceptedPlugin,
      // Autoprefixer for vendor prefixes
      ...(await tryLoadAutoprefixer()),
    ];

    const result = await postcss.default(plugins).process(css, {
      from: inputPath,
      to: outputPath,
    });

    await mkdir(join(outputPath, '..'), { recursive: true });
    await writeFile(outputPath, result.css);

    if (result.map) {
      await writeFile(`${outputPath}.map`, result.map.toString());
    }

    console.log(`  ✓ Tailwind: ${input} → ${output}`);
    return result.css;
  } catch {
    // Tailwind not installed — pass through CSS as-is
    console.warn('[pledgestack] Tailwind CSS not available, passing CSS through unchanged.');
    await mkdir(join(outputPath, '..'), { recursive: true });
    await writeFile(outputPath, css);
    return css;
  }
}

/**
 * Attempts to load autoprefixer from the project's dependencies.
 */
async function tryLoadAutoprefixer(): Promise<AcceptedPlugin[]> {
  try {
    const autoprefixer = await import('autoprefixer');
    return [autoprefixer.default as AcceptedPlugin];
  } catch {
    return [];
  }
}

/**
 * Generates a default Tailwind config if one doesn't exist.
 */
export async function ensureTailwindConfig(rootDir: string): Promise<void> {
  const configPath = join(rootDir, 'tailwind.config.ts');

  if (existsSync(configPath)) return;

  const defaultConfig = `import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
`;

  await writeFile(configPath, defaultConfig);
  console.log('  ✓ Created default tailwind.config.ts');
}
