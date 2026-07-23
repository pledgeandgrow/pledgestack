import { describe, it, expect } from 'vitest';
import { generateGrafanaDashboard, generateAlertRules, generatePrometheusMetrics } from './monitoring-dashboard';

describe('PSX Monitoring Dashboard (#298)', () => {
  describe('generateGrafanaDashboard', () => {
    it('generates dashboard JSON with panels', () => {
      const json = generateGrafanaDashboard({
        title: 'PledgeStack PSX',
        datasource: 'Prometheus',
      });
      const dashboard = JSON.parse(json);
      expect(dashboard.title).toBe('PledgeStack PSX');
      expect(dashboard.panels.length).toBeGreaterThan(0);
    });

    it('includes NAPI panels by default', () => {
      const json = generateGrafanaDashboard({
        title: 'Test',
        datasource: 'Prometheus',
      });
      const dashboard = JSON.parse(json);
      const titles = dashboard.panels.map((p: { title: string }) => p.title);
      expect(titles.some((t: string) => t.includes('NAPI'))).toBe(true);
    });

    it('includes cache panels by default', () => {
      const json = generateGrafanaDashboard({
        title: 'Test',
        datasource: 'Prometheus',
      });
      const dashboard = JSON.parse(json);
      const titles = dashboard.panels.map((p: { title: string }) => p.title);
      expect(titles.some((t: string) => t.includes('Cache'))).toBe(true);
    });

    it('includes Rust panels by default', () => {
      const json = generateGrafanaDashboard({
        title: 'Test',
        datasource: 'Prometheus',
      });
      const dashboard = JSON.parse(json);
      const titles = dashboard.panels.map((p: { title: string }) => p.title);
      expect(titles.some((t: string) => t.includes('Cargo') || t.includes('Rust') || t.includes('Addon'))).toBe(true);
    });

    it('includes alert rules', () => {
      const json = generateGrafanaDashboard({
        title: 'Test',
        datasource: 'Prometheus',
      });
      const dashboard = JSON.parse(json);
      expect(dashboard.alerts.length).toBeGreaterThan(0);
    });

    it('can disable Rust panels', () => {
      const json = generateGrafanaDashboard({
        title: 'Test',
        datasource: 'Prometheus',
        includeRustPanels: false,
      });
      const dashboard = JSON.parse(json);
      const titles = dashboard.panels.map((p: { title: string }) => p.title);
      expect(titles.some((t: string) => t.includes('Cargo'))).toBe(false);
    });
  });

  describe('generateAlertRules', () => {
    it('generates alert rules', () => {
      const rules = generateAlertRules() as Array<{ name: string; message: string }>;
      expect(rules.length).toBeGreaterThan(0);
      const names = rules.map(r => r.name);
      expect(names).toContain('HighErrorRate');
      expect(names).toContain('HighNapiLatency');
      expect(names).toContain('LowCacheHitRate');
    });
  });

  describe('generatePrometheusMetrics', () => {
    it('generates metrics in Prometheus format', () => {
      const metrics = generatePrometheusMetrics({
        requestCount: 1000,
        errorCount: 10,
        napiCalls: {
          get_users: { count: 500, durationMs: 50 },
        },
        memoryUsage: { mod1: 1024 * 1024 },
        cacheHits: 800,
        cacheMisses: 200,
      });
      expect(metrics).toContain('http_requests_total 1000');
      expect(metrics).toContain('http_errors_total 10');
      expect(metrics).toContain('napi_calls_total{function="get_users"} 500');
      expect(metrics).toContain('psx_memory_net_bytes{module="mod1"}');
      expect(metrics).toContain('cache_hits_total 800');
      expect(metrics).toContain('cache_misses_total 200');
    });

    it('includes help and type comments', () => {
      const metrics = generatePrometheusMetrics({});
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });
  });
});
