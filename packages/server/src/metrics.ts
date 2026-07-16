export interface MetricsCollector {
  increment(name: string, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  timing(name: string, valueMs: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  export(): string;
  json(): Record<string, unknown>;
}

export function createMetricsCollector(): MetricsCollector {
  const counters = new Map<string, number>();
  const gauges = new Map<string, number>();
  const timings = new Map<string, number[]>();
  const histograms = new Map<string, number[]>();

  function key(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagStr = Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(',');
    return `${name}{${tagStr}}`;
  }

  return {
    increment(name, tags) {
      const k = key(name, tags);
      counters.set(k, (counters.get(k) ?? 0) + 1);
    },

    gauge(name, value, tags) {
      gauges.set(key(name, tags), value);
    },

    timing(name, valueMs, tags) {
      const k = key(name, tags);
      const arr = timings.get(k) ?? [];
      arr.push(valueMs);
      if (arr.length > 1000) arr.shift();
      timings.set(k, arr);
    },

    histogram(name, value, tags) {
      const k = key(name, tags);
      const arr = histograms.get(k) ?? [];
      arr.push(value);
      if (arr.length > 1000) arr.shift();
      histograms.set(k, arr);
    },

    export() {
      const lines: string[] = [];

      for (const [k, v] of counters) {
        lines.push(`# TYPE ${k.split('{')[0]} counter`);
        lines.push(`${k} ${v}`);
      }
      for (const [k, v] of gauges) {
        lines.push(`# TYPE ${k.split('{')[0]} gauge`);
        lines.push(`${k} ${v}`);
      }
      for (const [k, arr] of timings) {
        const sum = arr.reduce((a, b) => a + b, 0);
        const avg = sum / arr.length;
        lines.push(`# TYPE ${k.split('{')[0]} summary`);
        lines.push(`${k}_sum ${sum}`);
        lines.push(`${k}_count ${arr.length}`);
        lines.push(`${k}_avg ${avg.toFixed(2)}`);
      }
      for (const [k, arr] of histograms) {
        const sum = arr.reduce((a, b) => a + b, 0);
        lines.push(`# TYPE ${k.split('{')[0]} histogram`);
        lines.push(`${k}_sum ${sum}`);
        lines.push(`${k}_count ${arr.length}`);
      }

      return lines.join('\n');
    },

    json() {
      const result: Record<string, unknown> = {
        counters: Object.fromEntries(counters),
        gauges: Object.fromEntries(gauges),
      };

      const timingStats: Record<string, unknown> = {};
      for (const [k, arr] of timings) {
        const sum = arr.reduce((a, b) => a + b, 0);
        timingStats[k] = { count: arr.length, sum, avg: sum / arr.length, min: Math.min(...arr), max: Math.max(...arr) };
      }
      result.timings = timingStats;

      return result;
    },
  };
}

export function createMetricsMiddleware(collector: MetricsCollector) {
  return {
    name: 'pledgestack-metrics',
    configureServer() {
      collector.increment('server.started');
    },
    requestStart(method: string, path: string) {
      collector.increment('http.requests_total', { method, path });
      return Date.now();
    },
    requestEnd(method: string, path: string, status: number, startTime: number) {
      collector.timing('http.request_duration_ms', Date.now() - startTime, { method, path, status: String(status) });
      collector.increment('http.responses_total', { method, path, status: String(status) });
    },
  };
}
