import { type ReactNode } from 'react';
export interface ClientRouterContextValue {
    pathname: string;
    params: Record<string, string>;
    query: Record<string, string>;
    navigate: (to: string, options?: NavigateOptions) => void;
    refresh: () => void;
    back: () => void;
    forward: () => void;
    prefetch: (href: string, priority?: 'high' | 'low' | 'auto') => void;
}
interface NavigateOptions {
    scroll?: boolean;
    replace?: boolean;
    priority?: 'high' | 'low' | 'auto';
}
export declare function useRouter(): ClientRouterContextValue;
export declare function RouterProvider({ children }: {
    children: ReactNode;
}): import("react").FunctionComponentElement<import("react").ProviderProps<ClientRouterContextValue | null>>;
export declare function Link({ href, children, prefetch, scroll, replace, priority, ...props }: {
    href: string;
    children: ReactNode;
    prefetch?: boolean;
    scroll?: boolean;
    replace?: boolean;
    priority?: 'high' | 'low' | 'auto';
    [key: string]: unknown;
}): import("react").ReactElement<{
    href: string;
    onClick: (e: MouseEvent) => void;
    onMouseEnter: () => void;
    onFocus: () => void;
}, string | import("react").JSXElementConstructor<any>>;
export {};
//# sourceMappingURL=router.d.ts.map