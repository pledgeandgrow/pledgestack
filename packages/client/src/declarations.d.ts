declare module 'react-refresh/runtime' {
  export function performReactRefresh(): void;
  export function register(type: unknown, id: string): void;
  export function sign(type: unknown, id: string): unknown;
  export function collectCustomHooksForSignature(type: unknown): void;
  export function createSignatureFunctionForTransform(): () => void;
}
