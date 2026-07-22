/**
 * Route conflict detection — build-time warnings for ambiguous routes.
 *
 * Goal #234: Detect when two routes match the same URL pattern,
 * identify ambiguous dynamic params ([slug] vs [id]), and suggest
 * route group isolation.
 */

import type { ResolvedRoute } from 'pledgestack-shared';
import { compilePattern } from './match';

export interface RouteConflict {
  /** First conflicting route */
  route1: ResolvedRoute;
  /** Second conflicting route */
  route2: ResolvedRoute;
  /** The URL pattern that both match */
  conflictingPattern: string;
  /** Human-readable description of the conflict */
  message: string;
  /** Suggested fix */
  suggestion: string;
}

/**
 * Detects route conflicts by checking all pairs of routes for
 * overlapping URL patterns.
 *
 * Checks:
 * 1. Exact pattern duplicates (two routes with same pattern)
 * 2. Ambiguous dynamic segments ([slug] vs [id] at same position)
 * 3. Catch-all overlapping with dynamic segment
 * 4. Optional catch-all overlapping with static route
 */
export function detectRouteConflicts(routes: ResolvedRoute[]): RouteConflict[] {
  const conflicts: RouteConflict[] = [];
  const pageRoutes = routes.filter((r) => !r.isLayout && !r.isNotFound);

  for (let i = 0; i < pageRoutes.length; i++) {
    for (let j = i + 1; j < pageRoutes.length; j++) {
      const r1 = pageRoutes[i];
      const r2 = pageRoutes[j];

      // Skip if both are API routes at different paths
      if (r1.mode === 'api' && r2.mode === 'api' && r1.pattern !== r2.pattern) continue;

      const conflict = checkPairConflict(r1, r2);
      if (conflict) conflicts.push(conflict);
    }
  }

  return conflicts;
}

/**
 * Checks if two routes conflict.
 */
function checkPairConflict(r1: ResolvedRoute, r2: ResolvedRoute): RouteConflict | null {
  // Exact duplicate
  if (r1.pattern === r2.pattern) {
    return {
      route1: r1,
      route2: r2,
      conflictingPattern: r1.pattern,
      message: `Two routes have the exact same pattern: ${r1.pattern}`,
      suggestion: 'Use route groups to disambiguate, or remove one of the duplicate routes.',
    };
  }

  // Check if patterns overlap by testing regex matching
  const { regex: regex1 } = compilePattern(r1.pattern);
  const { regex: regex2 } = compilePattern(r2.pattern);

  // Generate sample URLs from r1's pattern and test against r2
  const samples1 = generateSampleUrls(r1.pattern);
  for (const sample of samples1) {
    if (regex2.test(sample)) {
      // Check if this is an ambiguous dynamic segment case
      const ambiguity = checkAmbiguousParams(r1.pattern, r2.pattern);
      if (ambiguity) {
        return {
          route1: r1,
          route2: r2,
          conflictingPattern: ambiguity.pattern,
          message: ambiguity.message,
          suggestion: ambiguity.suggestion,
        };
      }

      return {
        route1: r1,
        route2: r2,
        conflictingPattern: `${r1.pattern} ↔ ${r2.pattern}`,
        message: `Routes overlap: ${r1.pattern} and ${r2.pattern} both match URL ${sample}`,
        suggestion: 'Use more specific patterns or route groups to disambiguate.',
      };
    }
  }

  // Generate sample URLs from r2's pattern and test against r1
  const samples2 = generateSampleUrls(r2.pattern);
  for (const sample of samples2) {
    if (regex1.test(sample)) {
      const ambiguity = checkAmbiguousParams(r1.pattern, r2.pattern);
      if (ambiguity) {
        return {
          route1: r1,
          route2: r2,
          conflictingPattern: ambiguity.pattern,
          message: ambiguity.message,
          suggestion: ambiguity.suggestion,
        };
      }

      return {
        route1: r1,
        route2: r2,
        conflictingPattern: `${r1.pattern} ↔ ${r2.pattern}`,
        message: `Routes overlap: ${r1.pattern} and ${r2.pattern} both match URL ${sample}`,
        suggestion: 'Use more specific patterns or route groups to disambiguate.',
      };
    }
  }

  return null;
}

/**
 * Generates sample URLs from a route pattern for overlap testing.
 * Replaces :param with a test value and *param with a multi-segment path.
 */
function generateSampleUrls(pattern: string): string[] {
  const segments = pattern.split('/').filter(Boolean);
  const samples: string[] = [];

  // Generate a basic sample with all params filled
  const basic = segments.map((seg) => {
    if (seg.startsWith(':')) return 'test';
    if (seg.startsWith('*')) return 'a/b/c';
    return seg;
  }).join('/');
  samples.push(`/${basic}`);

  // For optional catch-all, also generate without the catch-all
  const withoutCatchAll = segments.filter((seg) => !seg.startsWith('*')).map((seg) => {
    if (seg.startsWith(':')) return 'test';
    return seg;
  }).join('/');
  if (withoutCatchAll !== basic) {
    samples.push(`/${withoutCatchAll}`);
  }

  return samples;
}

/**
 * Checks if two patterns have ambiguous dynamic params at the same position.
 * e.g. /blog/[slug] and /blog/[id] — both match /blog/anything
 */
function checkAmbiguousParams(
  pattern1: string,
  pattern2: string,
): { pattern: string; message: string; suggestion: string } | null {
  const segs1 = pattern1.split('/').filter(Boolean);
  const segs2 = pattern2.split('/').filter(Boolean);

  if (segs1.length !== segs2.length) return null;

  for (let i = 0; i < segs1.length; i++) {
    const s1 = segs1[i];
    const s2 = segs2[i];

    // Both dynamic but different param names
    if (s1.startsWith(':') && s2.startsWith(':') && s1 !== s2) {
      return {
        pattern: `/${segs1.join('/')}`,
        message: `Ambiguous dynamic params: "${s1.slice(1)}" vs "${s2.slice(1)}" at position ${i + 1} — both match any value`,
        suggestion: `Use a route group to isolate: e.g. (blog)/[slug] and (docs)/[id], or rename one param to match.`,
      };
    }

    // One dynamic, one catch-all at same position
    if (s1.startsWith(':') && s2.startsWith('*')) {
      return {
        pattern: `/${segs1.join('/')}`,
        message: `Dynamic param "${s1.slice(1)}" conflicts with catch-all "${s2.slice(1)}" at position ${i + 1}`,
        suggestion: 'The catch-all will shadow the dynamic param. Use a more specific prefix.',
      };
    }
    if (s1.startsWith('*') && s2.startsWith(':')) {
      return {
        pattern: `/${segs1.join('/')}`,
        message: `Catch-all "${s1.slice(1)}" conflicts with dynamic param "${s2.slice(1)}" at position ${i + 1}`,
        suggestion: 'The catch-all will shadow the dynamic param. Use a more specific prefix.',
      };
    }
  }

  return null;
}

/**
 * Formats route conflicts for terminal output.
 */
export function formatRouteConflicts(conflicts: RouteConflict[]): string {
  if (conflicts.length === 0) {
    return '\n  ✓ No route conflicts detected.\n';
  }

  const lines: string[] = [
    `\n  ⚠ ${conflicts.length} route conflict${conflicts.length > 1 ? 's' : ''} detected:\n`,
  ];

  for (const c of conflicts) {
    lines.push(`  • ${c.message}`);
    lines.push(`    Route 1: ${c.route1.pattern} (${c.route1.filePath})`);
    lines.push(`    Route 2: ${c.route2.pattern} (${c.route2.filePath})`);
    lines.push(`    Suggestion: ${c.suggestion}\n`);
  }

  return lines.join('\n');
}
