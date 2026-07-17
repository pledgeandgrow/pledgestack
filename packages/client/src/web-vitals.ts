/**
 * Web Vitals monitoring — automatic CLS, LCP, FID, INP, TTFB reporting.
 *
 * Provides:
 * - Automatic collection of Core Web Vitals
 * - Route-level performance attribution
 * - Reporting to analytics endpoints
 * - Custom metric thresholds
 */

export interface WebVitalMetric {
  name: 'CLS' | 'LCP' | 'FID' | 'INP' | 'TTFB' | 'FCP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  entries: PerformanceEntry[];
  route?: string;
  timestamp: number;
}

export interface WebVitalsConfig {
  /** Reporting callback */
  onMetric?: (metric: WebVitalMetric) => void;
  /** Reporting endpoint URL */
  endpoint?: string;
  /** Whether to report immediately (default: true) */
  reportImmediate?: boolean;
  /** Batch reporting interval in seconds (default: 5) */
  batchInterval?: number;
  /** Route identifier for attribution */
  getRoute?: () => string;
}

const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
};

function getRating(name: WebVitalMetric['name'], value: number): WebVitalMetric['rating'] {
  const thresholds = THRESHOLDS[name];
  if (!thresholds) return 'good';
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Collect a Web Vital metric.
 */
export function collectMetric(
  name: WebVitalMetric['name'],
  value: number,
  entries: PerformanceEntry[] = [],
  route?: string,
): WebVitalMetric {
  return {
    name,
    value,
    rating: getRating(name, value),
    delta: value,
    id: generateId(),
    entries,
    route,
    timestamp: Date.now(),
  };
}

/**
 * Web Vitals monitor — collects and reports Core Web Vitals.
 *
 * Usage:
 * ```typescript
 * const monitor = new WebVitalsMonitor({
 *   endpoint: '/api/vitals',
 *   getRoute: () => window.location.pathname,
 * });
 * monitor.start();
 * ```
 */
export class WebVitalsMonitor {
  private config: WebVitalsConfig;
  private batch: WebVitalMetric[] = [];
  private batchTimer?: ReturnType<typeof setInterval>;
  private started = false;

  constructor(config: WebVitalsConfig = {}) {
    this.config = {
      reportImmediate: true,
      batchInterval: 5,
      ...config,
    };
  }

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    this.observeCLS();
    this.observeLCP();
    this.observeFCP();
    this.observeTTFB();
    this.observeINP();

    if (!this.config.reportImmediate && this.config.batchInterval) {
      this.batchTimer = setInterval(() => this.flush(), this.config.batchInterval * 1000);
    }

    window.addEventListener('pagehide', () => this.flush());
  }

  stop(): void {
    if (this.batchTimer) clearInterval(this.batchTimer);
    this.batchTimer = undefined;
    this.started = false;
  }

  report(metric: WebVitalMetric): void {
    if (this.config.reportImmediate) {
      this.sendMetric(metric);
    } else {
      this.batch.push(metric);
    }
    this.config.onMetric?.(metric);
  }

  flush(): void {
    if (this.batch.length === 0) return;
    this.sendBatch(this.batch);
    this.batch = [];
  }

  private observeCLS(): void {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      const route = this.config.getRoute?.();
      this.report(collectMetric('CLS', clsValue, [], route));
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  }

  private observeLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      const route = this.config.getRoute?.();
      this.report(collectMetric('LCP', lastEntry.startTime, entries, route));
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  }

  private observeFCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      if (entry) {
        const route = this.config.getRoute?.();
        this.report(collectMetric('FCP', entry.startTime, [entry], route));
      }
    });
    observer.observe({ type: 'paint', buffered: true });
  }

  private observeTTFB(): void {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      const route = this.config.getRoute?.();
      this.report(collectMetric('TTFB', ttfb, [navEntry], route));
    }
  }

  private observeINP(): void {
    let maxDuration = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = (entry as any).duration || 0;
        if (duration > maxDuration) maxDuration = duration;
      }
      const route = this.config.getRoute?.();
      this.report(collectMetric('INP', maxDuration, [], route));
    });
    observer.observe({ type: 'interaction', buffered: true });
  }

  private sendMetric(metric: WebVitalMetric): void {
    if (this.config.endpoint && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(this.config.endpoint, JSON.stringify(metric));
    } else if (this.config.endpoint && typeof fetch !== 'undefined') {
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
        keepalive: true,
      }).catch(() => {});
    }
  }

  private sendBatch(metrics: WebVitalMetric[]): void {
    if (this.config.endpoint && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(this.config.endpoint, JSON.stringify({ metrics }));
    } else if (this.config.endpoint && typeof fetch !== 'undefined') {
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics }),
        keepalive: true,
      }).catch(() => {});
    }
  }
}

/**
 * Get current Web Vitals thresholds.
 */
export function getThresholds(): Record<WebVitalMetric['name'], { good: number; poor: number }> {
  return { ...THRESHOLDS };
}
