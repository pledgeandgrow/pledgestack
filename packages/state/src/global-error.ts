import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { createElement } from 'react';

export interface GlobalErrorState {
  error: Error | null;
  errorInfo: { componentStack?: string } | null;
}

export function useGlobalError(): [
  GlobalErrorState,
  (error: Error, errorInfo?: { componentStack?: string }) => void,
  () => void,
] {
  const [state, setState] = useState<GlobalErrorState>({
    error: null,
    errorInfo: null,
  });

  const setError = useCallback(
    (error: Error, errorInfo?: { componentStack?: string }) => {
      setState({ error, errorInfo: errorInfo ?? null });
    },
    [],
  );

  const clearError = useCallback(() => {
    setState({ error: null, errorInfo: null });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: ErrorEvent) => {
      setState({ error: new Error(event.message), errorInfo: { componentStack: event.filename } });
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  return [state, setError, clearError];
}

export function GlobalErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
}): ReactNode {
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => setError(null), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: ErrorEvent) => {
      setError(new Error(event.message));
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  if (error) {
    return createElement('div', null, fallback(error, reset));
  }

  return createElement('div', null, children);
}
