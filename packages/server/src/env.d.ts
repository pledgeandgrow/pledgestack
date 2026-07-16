/**
 * Loads .env, .env.local, .env.development, .env.production files.
 * Populates process.env with the values.
 * Variables with PLEDGE_PUBLIC_ prefix are exposed to the client.
 */
export declare function loadEnv(rootDir: string, mode?: string): void;
/**
 * Returns all public environment variables (PLEDGE_PUBLIC_ prefix).
 * These are safe to expose to the client.
 */
export declare function getPublicEnv(): Record<string, string>;
/**
 * Returns a script tag that injects public env vars into the client.
 */
export declare function getPublicEnvScript(): string;
/**
 * Gets a specific environment variable.
 */
export declare function env(key: string): string | undefined;
//# sourceMappingURL=env.d.ts.map