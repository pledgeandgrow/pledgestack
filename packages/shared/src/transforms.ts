import { join, dirname, basename, extname, relative } from 'node:path';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export const PLEDGEPACK_DEFAULT_PORT = 3001;

/**
 * Fetches the Oxc-transformed module from PledgePack's Rust dev server.
 *
 * PledgePack's dev server (axum) handles:
 *   - TSX/TS → JS via Oxc (Rust-based, faster than esbuild)
 *   - JSX automatic runtime (react)
 *   - CSS transforms via Lightning CSS
 *   - CJS → ESM interop for node_modules
 *   - Import rewriting for bare specifiers
 */
export async function fetchFromPledgepack(sourcePath: string, port: number, rootDir?: string): Promise<string> {
  const projectRoot = rootDir ?? process.cwd();
  const relPath = relative(projectRoot, sourcePath).replace(/\\/g, '/');

  const url = `http://localhost:${port}/${relPath}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PledgePack transform failed for ${relPath}: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Fallback local transform using esbuild.
 * Used when PledgePack dev server is not available (e.g., production build without pledgepackPort).
 */
export async function transformLocally(sourcePath: string, ext: string): Promise<string> {
  const sourceCode = await readFile(sourcePath, 'utf-8');

  if (ext === '.mjs') {
    return sourceCode;
  }

  const { transform } = await import('esbuild');
  const loader = ext === '.tsx' ? 'tsx' : ext === '.jsx' ? 'jsx' : 'ts';
  const result = await transform(sourceCode, {
    loader,
    target: 'es2022',
    format: 'esm',
    sourcemap: 'inline',
    jsx: 'automatic',
    jsxImportSource: 'react',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });
  return result.code;
}

/**
 * Transforms TSX code locally using esbuild (for PSX files when PledgePack is unavailable).
 */
export async function transformTsxLocally(tsxCode: string, isDev: boolean): Promise<string> {
  const { transform } = await import('esbuild');
  const result = await transform(tsxCode, {
    loader: 'tsx',
    target: 'es2022',
    format: 'esm',
    sourcemap: 'inline',
    jsx: 'automatic',
    jsxImportSource: 'react',
    define: {
      'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
    },
  });
  return result.code;
}

/**
 * Generates a fallback JS stub when Rust compilation is not available.
 * Throws clear errors when rust.* functions are called.
 */
export function generateRustFallback(moduleName: string): string {
  return `/**
 * Fallback stub for ${moduleName}.psx — Rust addon not compiled.
 * Install Rust toolchain (cargo) to enable native Rust execution.
 */
const notCompiled = (name) => () => {
  throw new Error(
    '[PledgeStack] rust.${name}() is not available — Rust addon not compiled.\\n' +
    'Install Rust toolchain: https://rustup.rs\\n' +
    'Then restart the dev server.'
  );
};

export const rust = new Proxy({}, {
  get: (_, prop) => notCompiled(String(prop)),
});
`;
}

/**
 * Clears the transform cache directory.
 */
export async function clearTransformCacheDir(dir: string): Promise<void> {
  const cacheDir = join(dir, '.pledge-cache');
  try {
    await rm(cacheDir, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

/**
 * Writes transformed code to the cache directory and returns a file:// URL.
 */
export async function writeTransformedCode(
  sourcePath: string,
  transformedCode: string,
  isDev: boolean,
  cache?: Map<string, string>,
): Promise<string> {
  const ext = extname(sourcePath);
  const hash = createHash('sha256').update(sourcePath).digest('hex').slice(0, 12);
  const cacheDir = join(dirname(sourcePath), '.pledge-cache');
  await mkdir(cacheDir, { recursive: true });

  if (isDev) {
    const devOutPath = join(cacheDir, basename(sourcePath, ext) + `.${Date.now()}.js`);
    await writeFile(devOutPath, transformedCode, 'utf-8');
    const fileUrl = pathToFileURL(devOutPath).href;
    if (cache) cache.set(`${sourcePath}:${Date.now()}`, fileUrl);
    return fileUrl;
  }

  const outFileName = basename(sourcePath, ext) + `.${hash}.js`;
  const outPath = join(cacheDir, outFileName);
  await writeFile(outPath, transformedCode, 'utf-8');
  const fileUrl = pathToFileURL(outPath).href;
  if (cache) cache.set(sourcePath, fileUrl);
  return fileUrl;
}
