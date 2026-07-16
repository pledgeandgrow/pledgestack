import type { RouteMatch, PledgeConfig } from '@pledgestack/shared';
import type { PageModule, LayoutModule, LoadingModule, ErrorModule, NotFoundModule, HeadModule, TemplateModule } from '../router/types';
import type { RouteTree } from '../router/types';
export interface StreamSSRContext {
    config: PledgeConfig;
    match: RouteMatch;
    tree: RouteTree;
    modules: Map<string, PageModule | LayoutModule | LoadingModule | ErrorModule | NotFoundModule | HeadModule | TemplateModule>;
}
/**
 * Renders a route match to a streaming HTML response.
 * Uses renderToPipeableStream for Suspense boundary streaming.
 * Sends the shell HTML immediately, then streams deferred content as it resolves.
 */
export declare function renderSSRStream(ctx: StreamSSRContext): Promise<string>;
//# sourceMappingURL=stream.d.ts.map