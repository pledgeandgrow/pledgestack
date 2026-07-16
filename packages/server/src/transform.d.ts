/**
 * Transforms a TypeScript/TSX file to JavaScript using esbuild.
 * Writes the output to a temp cache directory and returns the file URL for import().
 * In dev mode, the cache is busted on each call to pick up changes.
 */
export declare function transformFile(sourcePath: string, isDev: boolean): Promise<string>;
/**
 * Clears the transform cache directory.
 */
export declare function clearTransformCache(dir: string): Promise<void>;
//# sourceMappingURL=transform.d.ts.map