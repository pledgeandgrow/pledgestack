import type { RouteMatch, PledgeConfig } from '@pledgestack/shared';
import type { PageModule, LayoutModule, LoadingModule, ErrorModule, NotFoundModule, HeadModule, TemplateModule } from '../router/types';
import type { RouteTree } from '../router/types';
export interface SSRContext {
    config: PledgeConfig;
    match: RouteMatch;
    tree: RouteTree;
    modules: Map<string, PageModule | LayoutModule | LoadingModule | ErrorModule | NotFoundModule | HeadModule | TemplateModule>;
}
/**
 * Renders a route match to an HTML string using SSR.
 * Wraps the page in its layout chain with loading and error boundaries.
 */
export declare function renderSSR(ctx: SSRContext): Promise<string>;
/**
 * Renders the not-found page for a given route segment.
 */
export declare function renderNotFound(ctx: SSRContext): Promise<string>;
//# sourceMappingURL=server.d.ts.map