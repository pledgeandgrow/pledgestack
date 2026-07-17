/**
 * Transforms a TypeScript/TSX file to JavaScript using PledgePack's Rust compiler (Oxc).
 *
 * In dev mode, fetches the transformed module from PledgePack's dev server (axum + Oxc),
 * which handles JSX→JS, TS type stripping, CSS transforms, and CJS interop.
 * The transformed JS is written to a temp cache file and returned as a file URL for import().
 *
 * This replaces the previous esbuild-based transformation with PledgePack's native Rust pipeline.
 */
export declare function transformFile(sourcePath: string, isDev: boolean, pledgepackPort?: number): Promise<string>;
/**
 * Clears the transform cache directory.
 */
export declare function clearTransformCache(dir: string): Promise<void>;
//# sourceMappingURL=transform.d.ts.map