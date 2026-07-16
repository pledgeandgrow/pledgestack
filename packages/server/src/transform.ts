import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname, basename, extname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const TRANSFORM_CACHE = new Map<string, string>();

const PLEDGEPACK_DEFAULT_PORT = 3001;

/**
 * Transforms a TypeScript/TSX file to JavaScript using PledgePack's Rust compiler (Oxc).
 *
 * In dev mode, fetches the transformed module from PledgePack's dev server (axum + Oxc),
 * which handles JSX→JS, TS type stripping, CSS transforms, and CJS interop.
 * The transformed JS is written to a temp cache file and returned as a file URL for import().
 *
 * This replaces the previous esbuild-based transformation with PledgePack's native Rust pipeline.
 */
export async function transformFile(
  sourcePath: string,
  isDev: boolean,
  pledgepackPort?: number,
): Promise<string> {
  const ext = extname(sourcePath);

  if (ext !== '.ts' && ext !== '.tsx' && ext !== '.jsx' && ext !== '.mjs') {
    return pathToFileURL(sourcePath).href;
  }

  const cacheKey = isDev ? `${sourcePath}:${Date.now()}` : sourcePath;
  const cached = TRANSFORM_CACHE.get(cacheKey);
  if (cached) return cached;

  const port = pledgepackPort ?? PLEDGEPACK_DEFAULT_PORT;

  let transformedCode: string;

  if (isDev && port > 0) {
    transformedCode = await fetchFromPledgepack(sourcePath, port);
  } else {
    transformedCode = await transformLocally(sourcePath, ext);
  }

  const hash = createHash('sha256').update(sourcePath).digest('hex').slice(0, 12);
  const cacheDir = join(dirname(sourcePath), '.pledge-cache');
  const outFileName = basename(sourcePath, ext) + `.${hash}.js`;
  const outPath = join(cacheDir, outFileName);

  await mkdir(cacheDir, { recursive: true });

  if (isDev) {
    const devOutPath = join(cacheDir, basename(sourcePath, ext) + `.${Date.now()}.js`);
    await writeFile(devOutPath, transformedCode, 'utf-8');
    const fileUrl = pathToFileURL(devOutPath).href;
    TRANSFORM_CACHE.set(cacheKey, fileUrl);
    return fileUrl;
  }

  await writeFile(outPath, transformedCode, 'utf-8');
  const fileUrl = pathToFileURL(outPath).href;
  TRANSFORM_CACHE.set(cacheKey, fileUrl);
  return fileUrl;
}

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
async function fetchFromPledgepack(sourcePath: string, port: number): Promise<string> {
  const cwd = process.cwd();
  const relPath = relative(cwd, sourcePath).replace(/\\/g, '/');

  const url = `http://localhost:${port}/${relPath}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PledgePack transform failed for ${relPath}: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Fallback local transform using Node.js built-in APIs.
 * Used when PledgePack dev server is not available (e.g., production build without pledgepackPort).
 */
async function transformLocally(sourcePath: string, ext: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
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
 * Clears the transform cache directory.
 */
export async function clearTransformCache(dir: string): Promise<void> {
  const cacheDir = join(dir, '.pledge-cache');
  try {
    await rm(cacheDir, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
  TRANSFORM_CACHE.clear();
}
