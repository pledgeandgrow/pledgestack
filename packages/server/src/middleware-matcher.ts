/**
 * Middleware matcher — Path-based middleware activation.
 *
 * Supports `export const matcher = [...]` in middleware.ts to control
 * which routes trigger middleware execution. Patterns can be:
 * - Exact paths: '/about'
 * - Path patterns: '/blog/:slug'
 * - Glob patterns: '/api/*'
 * - Regex-like: '/((?!api|_next).*)'  (negative lookahead)
 */

export type MatcherPattern = string | { regex: string };

export interface MatcherConfig {
  /** Patterns to match — middleware runs only on matching paths */
  matcher: MatcherPattern[];
}

/**
 * Compiles a matcher pattern into a RegExp.
 *
 * Supported syntax:
 * - `/about` → exact match
 * - `/blog/:slug` → `/blog/[^/]+`
 * - `/api/*` → `/api/.*`
 * - `{ regex: '/((?!api).*)' }` → raw regex
 */
function compilePattern(pattern: MatcherPattern): RegExp {
  if (typeof pattern !== 'string') {
    return new RegExp(pattern.regex);
  }

  // Check if it looks like a regex (starts with / and contains regex chars)
  if (pattern.startsWith('/') && /[\(\)\?\!\|\[\]\{\}\+\*\\\^]/.test(pattern.slice(1))) {
    // Treat as regex — strip leading and trailing /
    const body = pattern.slice(1);
    const lastSlash = body.lastIndexOf('/');
    if (lastSlash !== -1) {
      const flags = body.slice(lastSlash + 1);
      const source = body.slice(0, lastSlash);
      return new RegExp(source, flags);
    }
    // No closing slash — treat as regex source directly
    return new RegExp(body);
  }

  // Convert path pattern to regex
  let regex = pattern
    .replace(/:[a-zA-Z0-9_]+/g, '[^/]+')     // :param → [^/]+
    .replace(/\*/g, '.*')                      // * → .*
    .replace(/\?/g, '[^/]?');                   // ? → [^/]?

  // Escape special regex chars that aren't our replacements
  regex = regex.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // Restore .* and [^/]+ that were escaped
  regex = regex.replace(/\\\.\*/g, '.*').replace(/\\\[\\^\/\\\]\\+/g, '[^/]+');

  return new RegExp(`^${regex}$`);
}

/**
 * Creates a matcher function from a matcher config.
 * Returns a function that tests whether a path should trigger middleware.
 */
export function createMatcher(matcher: MatcherPattern[]): (pathname: string) => boolean {
  const regexes = matcher.map(compilePattern);

  return function shouldRunMiddleware(pathname: string): boolean {
    return regexes.some((regex) => regex.test(pathname));
  };
}

/**
 * Parses the `matcher` export from a middleware module.
 * Returns null if no matcher is defined (middleware runs on all routes).
 */
export function parseMatcher(mod: Record<string, unknown>): ((pathname: string) => boolean) | null {
  if (!mod.matcher || !Array.isArray(mod.matcher)) return null;
  return createMatcher(mod.matcher as MatcherPattern[]);
}
