import type { PledgeConfig, ResolvedRoute } from 'pledgestack-shared';
import type { PageModule } from '../router/types';
export interface SSGContext {
    config: PledgeConfig;
    routes: ResolvedRoute[];
    modules: Map<string, PageModule>;
}
/**
 * Generates static HTML for all routes marked as static.
 * Calls generateStaticParams for dynamic routes.
 */
export declare function generateStaticPages(ctx: SSGContext): Promise<Map<string, string>>;
//# sourceMappingURL=static.d.ts.map