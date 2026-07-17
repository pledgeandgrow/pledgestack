/**
 * Error boundary telemetry — client-side HOC for automatic error capture.
 *
 * Item 175 of the PledgeStack roadmap.
 * Wraps error.tsx boundary components to automatically report errors.
 */

import { useEffect, type ComponentType, type ReactNode } from 'react';
import { createElement } from 'react';

export interface ErrorTelemetryContext {
  route?: string;
  userId?: string;
  componentStack?: string;
  [key: string]: unknown;
}

export interface ErrorBoundaryTelemetryConfig {
  endpoint?: string;
  sanitizeStacks: boolean;
  sampleRate: number;
}

let config: ErrorBoundaryTelemetryConfig = {
  sanitizeStacks: true,
  sampleRate: 1.0,
};

export function configureErrorTelemetry(cfg: Partial<ErrorBoundaryTelemetryConfig>): void {
  config = { ...config, ...cfg };
}

function sanitizeStack(stack: string): string {
  return stack
    .replace(/\s+at\s+.+?\(?(.+?):\d+:\d+\)?/g, 'at $1')
    .replace(/file:\/\/.+/g, '[file]')
    .replace(/https?:\/\/.+/g, '[url]');
}

async function reportError(error: Error, context?: ErrorTelemetryContext): Promise<void> {
  if (Math.random() > config.sampleRate) return;

  const report: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: config.sanitizeStacks ? sanitizeStack(error.stack ?? '') : error.stack,
    timestamp: new Date().toISOString(),
    route: context?.route ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
  };

  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (!['route'].includes(key)) report[key] = value;
    }
  }

  if (config.endpoint) {
    try {
      await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch {
      // Silently fail
    }
  }
}

/**
 * Higher-order component that wraps an error boundary with telemetry.
 * Automatically reports errors on mount.
 */
export function withErrorTelemetry<P extends Record<string, unknown>>(
  ErrorComponent: ComponentType<P & { error: Error; reset: () => void }>,
): ComponentType<P & { error: Error; reset: () => void }> {
  function WrappedComponent(props: P & { error: Error; reset: () => void }) {
    useEffect(() => {
      reportError(props.error, {
        route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
    }, [props.error]);

    return createElement(ErrorComponent, props) as ReactNode;
  }

  WrappedComponent.displayName = `withErrorTelemetry(${ErrorComponent.displayName ?? ErrorComponent.name ?? 'ErrorComponent'})`;
  return WrappedComponent;
}
