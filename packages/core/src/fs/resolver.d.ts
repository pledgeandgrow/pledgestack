import type { ScannedFile } from './scanner';
import type { ResolvedRoute, PledgeConfig } from 'pledgestack-shared';
/**
 * Resolves scanned files into ResolvedRoute objects.
 * Groups convention files (loading, error, not-found, head) by directory
 * and attaches them to their associated page or route handler.
 *
 * Supports:
 * - Route groups (group) — logical grouping without URL impact
 * - Parallel routes @slot — independent route trees rendered in layout
 * - Intercepting routes (..)folder — route interception for modals
 */
export declare function resolveRoutes(files: ScannedFile[], config: PledgeConfig): ResolvedRoute[];
//# sourceMappingURL=resolver.d.ts.map