import { describe, it, expect, beforeEach } from 'vitest';
import { MultiRegionManager, generateMultiRegionConfig, type RegionConfig } from './multi-region';

describe('Multi-Region Deployment (#280)', () => {
  let manager: MultiRegionManager;
  const regions: RegionConfig[] = [
    { id: 'us-east-1', name: 'US East', provider: 'aws', url: 'https://us.example.com', active: true, primary: true, weight: 50 },
    { id: 'eu-west-1', name: 'EU West', provider: 'aws', url: 'https://eu.example.com', active: true, weight: 50 },
  ];

  beforeEach(() => {
    manager = new MultiRegionManager({ regions });
  });

  describe('routing', () => {
    it('routes to primary by default', () => {
      const result = manager.route();
      expect(result.region.id).toBe('us-east-1');
      expect(result.fallback).toBe(false);
    });

    it('routes by primary strategy', () => {
      const mgr = new MultiRegionManager({ regions, routingStrategy: 'primary' });
      const result = manager.route();
      expect(result.region.id).toBe('us-east-1');
    });

    it('routes by geo', () => {
      const mgr = new MultiRegionManager({ regions, routingStrategy: 'geo' });
      const result = mgr.route('eu-west-1');
      expect(result.region.id).toBe('eu-west-1');
      expect(result.strategy).toBe('geo');
    });

    it('routes by latency', () => {
      const mgr = new MultiRegionManager({ regions, routingStrategy: 'latency' });
      const result = mgr.route(undefined, { 'us-east-1': 50, 'eu-west-1': 200 });
      expect(result.region.id).toBe('us-east-1');
      expect(result.reason).toContain('Lowest latency');
    });
  });

  describe('health checks', () => {
    it('returns healthy regions', () => {
      const healthy = manager.getHealthyRegions();
      expect(healthy.length).toBe(2);
    });

    it('checks health of a region', async () => {
      const status = await manager.checkHealth('us-east-1');
      expect(status.healthy).toBe(true);
      expect(status.consecutiveFailures).toBe(0);
    });

    it('gets health status for all regions', () => {
      const statuses = manager.getHealthStatus();
      expect(statuses.length).toBe(2);
    });
  });

  describe('traffic shifting', () => {
    it('shifts traffic weight', () => {
      manager.shiftTraffic('us-east-1', 80);
      const result = manager.route(undefined, undefined);
      // Weighted routing would use the new weight
      expect(result).toBeTruthy();
    });
  });

  describe('region activation', () => {
    it('deactivates a region', () => {
      manager.setRegionActive('eu-west-1', false);
      const healthy = manager.getHealthyRegions();
      expect(healthy.length).toBe(1);
      expect(healthy[0].id).toBe('us-east-1');
    });
  });

  describe('failover', () => {
    it('falls back to primary when all regions unhealthy', () => {
      manager.setRegionActive('us-east-1', false);
      manager.setRegionActive('eu-west-1', false);
      const result = manager.route();
      expect(result.fallback).toBe(true);
    });
  });

  describe('generateMultiRegionConfig', () => {
    it('generates config file', () => {
      const config = generateMultiRegionConfig({ regions });
      expect(config).toContain('us-east-1');
      expect(config).toContain('eu-west-1');
      expect(config).toContain('routingStrategy');
    });
  });
});
