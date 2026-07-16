import { type FileConvention } from 'pledgestack-shared';
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
export declare function scanAppDir(appDir: string): Promise<ScannedFile[]>;
/**
 * Watches the app directory for changes (dev mode).
 */
export declare function createWatcherPattern(): string;
//# sourceMappingURL=scanner.d.ts.map