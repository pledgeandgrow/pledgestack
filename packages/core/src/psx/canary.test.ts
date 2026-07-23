import { describe, it, expect, beforeEach } from 'vitest';
import { CanaryManager } from './canary';

describe('PSX Canary Deployment (#302)', () => {
  let manager: CanaryManager;

  beforeEach(() => {
    manager = new CanaryManager({
      moduleName: 'test',
      stableVersion: '1.0.0',
      canaryVersion: '2.0.0',
      initialPercentage: 10,
      incrementStep: 20,
      stageDurationSeconds: 1,
      minSampleSize: 5,
    });
  });

  describe('routing', () => {
    it('routes to stable or canary based on percentage', () => {
      const routes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        routes.add(manager.route());
      }
      // With 10% canary, both should appear
      expect(routes.has('stable')).toBe(true);
      expect(routes.has('canary')).toBe(true);
    });

    it('routes to stable when not running', () => {
      manager.rollback();
      expect(manager.route()).toBe('stable');
    });
  });

  describe('metrics', () => {
    it('records requests and tracks metrics', () => {
      manager.recordRequest('stable', true, 50);
      manager.recordRequest('canary', true, 60);
      const metrics = manager.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.canaryRequests).toBe(1);
      expect(metrics.stableRequests).toBe(1);
    });

    it('tracks errors', () => {
      manager.recordRequest('stable', true, 50);
      manager.recordRequest('canary', false, 60);
      const metrics = manager.getMetrics();
      expect(metrics.canaryErrors).toBe(1);
      expect(metrics.stableErrors).toBe(0);
    });

    it('calculates latency percentiles', () => {
      for (let i = 0; i < 20; i++) {
        manager.recordRequest('canary', true, i * 10);
      }
      const metrics = manager.getMetrics();
      expect(metrics.canaryLatencyP50).toBeGreaterThan(0);
      expect(metrics.canaryLatencyP95).toBeGreaterThan(metrics.canaryLatencyP50);
    });
  });

  describe('evaluate', () => {
    it('returns insufficient sample size when too few requests', () => {
      manager.recordRequest('canary', true, 50);
      const evaluation = manager.evaluate();
      expect(evaluation.shouldProceed).toBe(false);
      expect(evaluation.reason).toContain('Insufficient');
    });

    it('proceeds when canary is healthy', () => {
      for (let i = 0; i < 10; i++) {
        manager.recordRequest('stable', true, 50);
        manager.recordRequest('canary', true, 60);
      }
      const evaluation = manager.evaluate();
      expect(evaluation.shouldProceed).toBe(true);
    });

    it('rolls back when error rate exceeds threshold', () => {
      const m = new CanaryManager({
        moduleName: 'test',
        stableVersion: '1.0.0',
        canaryVersion: '2.0.0',
        errorRateThreshold: 10,
        minSampleSize: 5,
        autoRollback: true,
      });
      for (let i = 0; i < 10; i++) {
        m.recordRequest('stable', true, 50);
        m.recordRequest('canary', i >= 2, 60); // 80% error rate
      }
      const evaluation = m.evaluate();
      expect(evaluation.shouldRollback).toBe(true);
      expect(evaluation.reason).toContain('error rate');
    });
  });

  describe('promote', () => {
    it('sets percentage to 100 and status to promoted', () => {
      manager.promote();
      const state = manager.getState();
      expect(state.currentPercentage).toBe(100);
      expect(state.status).toBe('promoted');
    });
  });

  describe('rollback', () => {
    it('sets percentage to 0 and status to rolled-back', () => {
      manager.rollback();
      const state = manager.getState();
      expect(state.currentPercentage).toBe(0);
      expect(state.status).toBe('rolled-back');
    });
  });

  describe('setPercentage', () => {
    it('manually sets traffic percentage', () => {
      manager.setPercentage(50);
      expect(manager.getState().currentPercentage).toBe(50);
    });

    it('clamps to max percentage', () => {
      manager.setPercentage(150);
      expect(manager.getState().currentPercentage).toBe(100);
    });
  });

  describe('state tracking', () => {
    it('tracks history', () => {
      manager.setPercentage(30);
      const state = manager.getState();
      expect(state.history.length).toBeGreaterThan(0);
    });
  });
});
