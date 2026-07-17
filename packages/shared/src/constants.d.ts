/** File conventions for the app directory */
export declare const FILE_CONVENTIONS: {
    readonly page: "page";
    readonly layout: "layout";
    readonly loading: "loading";
    readonly error: "error";
    readonly 'not-found': "not-found";
    readonly 'global-error': "global-error";
    readonly template: "template";
    readonly route: "route";
    readonly middleware: "middleware";
    readonly head: "head";
};
export type FileConvention = keyof typeof FILE_CONVENTIONS;
/** Dynamic segment pattern: [param] */
export declare const DYNAMIC_SEGMENT_PATTERN: RegExp;
/** Catch-all segment pattern: [...param] */
export declare const CATCH_ALL_PATTERN: RegExp;
/** Optional catch-all pattern: [[...param]] */
export declare const OPTIONAL_CATCH_ALL_PATTERN: RegExp;
/** Route group pattern: (group) */
export declare const ROUTE_GROUP_PATTERN: RegExp;
/** Parallel route slot pattern: @slot */
export declare const PARALLEL_ROUTE_PATTERN: RegExp;
/** Intercepting route patterns: (..), (...), (....) */
export declare const INTERCEPT_ROUTE_PATTERN: RegExp;
/** Intercepting route with segment: (..)folder */
export declare const INTERCEPT_ROUTE_SEGMENT_PATTERN: RegExp;
/** Default port for dev server */
export declare const DEFAULT_DEV_PORT = 3000;
/** Default port for production server */
export declare const DEFAULT_PROD_PORT = 3000;
/** Framework version */
export declare const PLEDGE_VERSION = "0.0.1";
//# sourceMappingURL=constants.d.ts.map