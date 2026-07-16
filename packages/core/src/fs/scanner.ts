import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { FILE_CONVENTIONS, type FileConvention } from '@pledgestack/shared';

export interface ScannedFile {
  /** Absolute path to the file */
  absolutePath: string;
  /** Path relative to the app directory */
  relativePath: string;
  /** The file convention (page, layout, route, etc.) or null */
  convention: FileConvention | null;
  /** Segments derived from the path */
  segments: string[];
}

/**
 * Recursively scans the app directory and returns all files
 * with their resolved convention.
 */
export async function scanAppDir(appDir: string): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && isRouteFile(entry.name)) {
        const relativePath = relative(appDir, fullPath).split(sep).join('/');
        const convention = detectConvention(entry.name);
        const segments = relativePath.split('/').filter(Boolean);
        files.push({
          absolutePath: fullPath,
          relativePath,
          convention,
          segments,
        });
      }
    }
  }

  await walk(appDir);
  return files;
}

/**
 * Checks if a file is a route file (tsx, ts, jsx, js).
 */
function isRouteFile(filename: string): boolean {
  return /\.(tsx|ts|jsx|js)$/.test(filename);
}

/**
 * Detects the file convention from the filename.
 * e.g. "page.tsx" -> "page", "layout.tsx" -> "layout"
 */
function detectConvention(filename: string): FileConvention | null {
  const base = filename.replace(/\.(tsx|ts|jsx|js)$/, '');
  if (base in FILE_CONVENTIONS) {
    return base as FileConvention;
  }
  return null;
}

/**
 * Watches the app directory for changes (dev mode).
 */
export function createWatcherPattern(): string {
  return '**/*.{tsx,ts,jsx,js}';
}
