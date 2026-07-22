/**
 * Thenable — a value that can be awaited but also accessed synchronously.
 * Used by cookies(), headers(), searchParams(), params() to support both
 * sync access (legacy) and `await` pattern (Next.js 15 style).
 */
export type Thenable<T> = T & {
  then(onfulfilled: (value: T) => T | PromiseLike<T>): Promise<T>;
};

/**
 * Wraps a plain value in a thenable so `await value()` works while
 * sync access still returns the value directly.
 */
export function makeThenable<T extends Record<string, unknown>>(value: T): Thenable<T> {
  (value as Thenable<T>).then = (onfulfilled: (value: T) => T | PromiseLike<T>) => {
    return Promise.resolve(value).then(onfulfilled);
  };
  return value as Thenable<T>;
}
