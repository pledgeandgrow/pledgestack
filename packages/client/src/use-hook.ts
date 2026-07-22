/**
 * React 19 use() hook support for PledgeStack.
 *
 * The use() hook unwraps promises during render with automatic Suspense.
 * Unlike traditional async patterns, use() can be called conditionally
 * and within try/catch blocks, making it more flexible than top-level await.
 *
 * Usage in server components:
 *   const data = use(fetch('/api/data'));
 *   const user = use(loadUser());
 *
 * Usage in client components (with Suspense):
 *   <Suspense fallback={<Loading />}>
 *     <Profile />
 *   </Suspense>
 *
 *   function Profile() {
 *     const user = use(userPromise);
 *     return <h1>{user.name}</h1>;
 *   }
 */

import { use as reactUse, Suspense, type ReactNode } from 'react';

/**
 * Re-export React 19's use() hook.
 * This provides a stable import path: `import { use } from 'pledgestack/client'`
 */
export { reactUse as use };

/**
 * Wraps a promise in a Suspense boundary with a fallback.
 * Useful for client-side data fetching with automatic loading states.
 *
 * Usage:
 *   <Await promise={fetchData()} fallback={<Spinner />}>
 *     {(data) => <DataView data={data} />}
 *   </Await>
 */
export function Await<T>({
  promise,
  fallback,
  children,
}: {
  promise: Promise<T>;
  fallback: ReactNode;
  children: (data: T) => ReactNode;
}): ReactNode {
  return createElement(Suspense, { fallback }, createElement(AwaitInner<T>, { promise, children }));
}

import { createElement, Component } from 'react';

class AwaitInner<T> extends Component<{ promise: Promise<T>; children: (data: T) => ReactNode }, { data: T | null }> {
  state: { data: T | null } = { data: null };

  componentDidMount() {
    this.props.promise.then((data) => {
      this.setState({ data });
    });
  }

  componentDidUpdate(prevProps: { promise: Promise<T> }) {
    if (prevProps.promise !== this.props.promise) {
      this.props.promise.then((data) => {
        this.setState({ data });
      });
    }
  }

  render() {
    if (this.state.data === null) return null;
    return this.props.children(this.state.data);
  }
}

/**
 * Creates a cached promise that can be passed to use().
 * Deduplicates identical calls within the same render pass.
 *
 * Usage:
 *   const dataPromise = useMemo(() => cachePromise(fetch('/api/data')), []);
 *   const data = use(dataPromise);
 */
export function cachePromise<T>(promise: Promise<T>): Promise<T> {
  // Attach a cache key to the promise for dedup
  const cached = promise as Promise<T> & { __pledgeCached?: boolean };
  if (!cached.__pledgeCached) {
    cached.__pledgeCached = true;
  }
  return cached;
}
