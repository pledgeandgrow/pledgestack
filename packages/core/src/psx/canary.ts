/**
 * #302 — PSX Canary Deployment.
 *
 * Traffic routing for canary releases, percentage-based rollout,
 * automatic rollback on error spike, health metrics collection.
 *
 * Provides:
 * - Canary traffic routing (percentage-based)
 * - Health metric collection during canary
 * - Automatic rollback on error spike
 * - Progressive rollout stages
 * - Canary termination/promotion
 */

import { EventEmitter } from 'node:events';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanaryConfig {
  /** Module name being canaried */
  moduleName: string;
  /** Stable version */
  stableVersion: string;
  /** Canary version */
  canaryVersion: string;
  /** Initial traffic percentage for canary (default: 5) */
  initialPercentage?: number;
  /** Maximum traffic percentage for canary (default: 100) */
  maxPercentage?: number;
  /** Percentage increment per stage (default: 10) */
  incrementStep?: number;
  /** Duration of each stage in seconds (default: 300) */
  stageDurationSeconds?: number;
  /** Error rate threshold for auto-rollback (default: 5%) */
  errorRateThreshold?: number;
  /** Latency p95 threshold for auto-rollback in ms (default: 500) */
  latencyThreshold?: number;
  /** Minimum sample size before evaluating (default: 100) */
  minSampleSize?: number;
  /** Whether to auto-rollback on threshold breach */
  autoRollback?: boolean;
}

export type CanaryStage = 'initial' | 'ramping' | 'complete' | 'rolled-back' | 'terminated';
export type CanaryStatus = 'running' | 'promoted' | 'rolled-back' | 'terminated';

export interface CanaryMetrics {
  totalRequests: number;
  canaryRequests: number;
  stableRequests: number;
  canaryErrors: number;
  stableErrors: number;
  canaryLatencyP50: number;
  canaryLatencyP95: number;
  stableLatencyP50: number;
  stableLatencyP95: number;
  currentPercentage: number;
}

export interface CanaryState {
  moduleName: string;
  stableVersion: string;
  canaryVersion: string;
  currentPercentage: number;
  stage: CanaryStage;
  status: CanaryStatus;
  startedAt: number;
  lastStageChange: number;
  metrics: CanaryMetrics;
  history: Array<{ timestamp: number; percentage: number; stage: CanaryStage }>;
}

export interface CanaryEvaluation {
  shouldProceed: boolean;
  shouldRollback: boolean;
  reason: string;
  metrics: CanaryMetrics;
}

// ---------------------------------------------------------------------------
// Canary Deployment Manager
// ---------------------------------------------------------------------------

/**
 * Manages canary deployments with progressive traffic shifting,
 * health monitoring, and automatic rollback.
 */
export class CanaryManager extends EventEmitter {
  private config: Required<CanaryConfig>;
  private state: CanaryState;
  private requestLog: Array<{ version: 'stable' | 'canary'; success: boolean; latencyMs: number; timestamp: number }> = [];
  private static readonly MAX_LOG_SIZE = 10000;
  private stageTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: CanaryConfig) {
    super();
    this.config = {
      moduleName: config.moduleName,
      stableVersion: config.stableVersion,
      canaryVersion: config.canaryVersion,
      initialPercentage: config.initialPercentage ?? 5,
      maxPercentage: config.maxPercentage ?? 100,
      incrementStep: config.incrementStep ?? 10,
      stageDurationSeconds: config.stageDurationSeconds ?? 300,
      errorRateThreshold: config.errorRateThreshold ?? 5,
      latencyThreshold: config.latencyThreshold ?? 500,
      minSampleSize: config.minSampleSize ?? 100,
      autoRollback: config.autoRollback ?? true,
    };

    this.state = {
      moduleName: config.moduleName,
      stableVersion: config.stableVersion,
      canaryVersion: config.canaryVersion,
      currentPercentage: this.config.initialPercentage,
      stage: 'initial',
      status: 'running',
      startedAt: Date.now(),
      lastStageChange: Date.now(),
      metrics: {
        totalRequests: 0,
        canaryRequests: 0,
        stableRequests: 0,
        canaryErrors: 0,
        stableErrors: 0,
        canaryLatencyP50: 0,
        canaryLatencyP95: 0,
        stableLatencyP50: 0,
        stableLatencyP95: 0,
        currentPercentage: this.config.initialPercentage,
      },
      history: [{
        timestamp: Date.now(),
        percentage: this.config.initialPercentage,
        stage: 'initial',
      }],
    };
  }

  /**
   * Routes a request to either stable or canary version.
   */
  route(): 'stable' | 'canary' {
    if (this.state.status !== 'running') return 'stable';

    const random = Math.random() * 100;
    return random < this.state.currentPercentage ? 'canary' : 'stable';
  }

  /**
   * Records a request result for metrics collection.
   */
  recordRequest(version: 'stable' | 'canary', success: boolean, latencyMs: number): void {
    this.requestLog.push({ version, success, latencyMs, timestamp: Date.now() });
    if (this.requestLog.length > CanaryManager.MAX_LOG_SIZE) {
      this.requestLog.shift();
    }
    this.updateMetrics();
  }

  /**
   * Starts the canary deployment with progressive rollout.
   */
  start(): void {
    this.emit('canary-start', this.state);
    this.scheduleNextStage();
  }

  /**
   * Evaluates canary health and decides whether to proceed.
   */
  evaluate(): CanaryEvaluation {
    const metrics = this.getMetrics();

    if (metrics.totalRequests < this.config.minSampleSize) {
      return {
        shouldProceed: false,
        shouldRollback: false,
        reason: `Insufficient sample size (${metrics.totalRequests}/${this.config.minSampleSize})`,
        metrics,
      };
    }

    const canaryErrorRate = metrics.canaryRequests > 0
      ? (metrics.canaryErrors / metrics.canaryRequests) * 100
      : 0;
    const stableErrorRate = metrics.stableRequests > 0
      ? (metrics.stableErrors / metrics.stableRequests) * 100
      : 0;

    // Check error rate threshold
    if (canaryErrorRate > this.config.errorRateThreshold) {
      return {
        shouldProceed: false,
        shouldRollback: this.config.autoRollback,
        reason: `Canary error rate ${canaryErrorRate.toFixed(2)}% exceeds threshold ${this.config.errorRateThreshold}%`,
        metrics,
      };
    }

    // Check latency threshold
    if (metrics.canaryLatencyP95 > this.config.latencyThreshold) {
      return {
        shouldProceed: false,
        shouldRollback: this.config.autoRollback,
        reason: `Canary p95 latency ${metrics.canaryLatencyP95}ms exceeds threshold ${this.config.latencyThreshold}ms`,
        metrics,
      };
    }

    // Compare canary vs stable
    if (canaryErrorRate > stableErrorRate * 2) {
      return {
        shouldProceed: false,
        shouldRollback: this.config.autoRollback,
        reason: `Canary error rate ${canaryErrorRate.toFixed(2)}% is 2x worse than stable ${stableErrorRate.toFixed(2)}%`,
        metrics,
      };
    }

    return {
      shouldProceed: true,
      shouldRollback: false,
      reason: 'Canary is healthy — proceed to next stage',
      metrics,
    };
  }

  /**
   * Promotes canary to 100% traffic (terminates canary, makes it stable).
   */
  promote(): void {
    this.state.currentPercentage = 100;
    this.state.stage = 'complete';
    this.state.status = 'promoted';
    this.state.history.push({ timestamp: Date.now(), percentage: 100, stage: 'complete' });
    this.stopStageTimer();
    this.emit('canary-promoted', this.state);
  }

  /**
   * Rolls back canary to 0% traffic.
   */
  rollback(): void {
    this.state.currentPercentage = 0;
    this.state.stage = 'rolled-back';
    this.state.status = 'rolled-back';
    this.state.history.push({ timestamp: Date.now(), percentage: 0, stage: 'rolled-back' });
    this.stopStageTimer();
    this.emit('canary-rolled-back', this.state);
  }

  /**
   * Terminates the canary deployment.
   */
  terminate(): void {
    this.state.status = 'terminated';
    this.stopStageTimer();
    this.emit('canary-terminated', this.state);
  }

  /**
   * Gets current canary state.
   */
  getState(): CanaryState {
    return { ...this.state, metrics: this.getMetrics() };
  }

  /**
   * Gets current metrics.
   */
  getMetrics(): CanaryMetrics {
    return { ...this.state.metrics, currentPercentage: this.state.currentPercentage };
  }

  /**
   * Manually sets the canary traffic percentage.
   */
  setPercentage(percentage: number): void {
    const clamped = Math.max(0, Math.min(this.config.maxPercentage, percentage));
    this.state.currentPercentage = clamped;
    this.state.metrics.currentPercentage = clamped;
    this.emit('canary-percentage-changed', { percentage: clamped });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private scheduleNextStage(): void {
    if (this.state.status !== 'running') return;

    this.stageTimer = setTimeout(() => {
      this.advanceStage();
    }, this.config.stageDurationSeconds * 1000);
  }

  private advanceStage(): void {
    if (this.state.status !== 'running') return;

    const evaluation = this.evaluate();

    if (evaluation.shouldRollback) {
      this.rollback();
      return;
    }

    if (!evaluation.shouldProceed) {
      // Not enough data, wait another stage
      this.scheduleNextStage();
      return;
    }

    // Increase percentage
    const newPercentage = Math.min(
      this.config.maxPercentage,
      this.state.currentPercentage + this.config.incrementStep,
    );

    this.state.currentPercentage = newPercentage;
    this.state.stage = newPercentage >= this.config.maxPercentage ? 'complete' : 'ramping';
    this.state.lastStageChange = Date.now();
    this.state.history.push({
      timestamp: Date.now(),
      percentage: newPercentage,
      stage: this.state.stage,
    });

    this.emit('canary-stage-advanced', {
      percentage: newPercentage,
      stage: this.state.stage,
    });

    if (newPercentage >= this.config.maxPercentage) {
      this.promote();
    } else {
      this.scheduleNextStage();
    }
  }

  private stopStageTimer(): void {
    if (this.stageTimer) {
      clearTimeout(this.stageTimer);
      this.stageTimer = null;
    }
  }

  private updateMetrics(): void {
    const canaryEntries = this.requestLog.filter(r => r.version === 'canary');
    const stableEntries = this.requestLog.filter(r => r.version === 'stable');

    this.state.metrics.totalRequests = this.requestLog.length;
    this.state.metrics.canaryRequests = canaryEntries.length;
    this.state.metrics.stableRequests = stableEntries.length;
    this.state.metrics.canaryErrors = canaryEntries.filter(r => !r.success).length;
    this.state.metrics.stableErrors = stableEntries.filter(r => !r.success).length;

    if (canaryEntries.length > 0) {
      const latencies = canaryEntries.map(r => r.latencyMs).sort((a, b) => a - b);
      this.state.metrics.canaryLatencyP50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
      this.state.metrics.canaryLatencyP95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
    }

    if (stableEntries.length > 0) {
      const latencies = stableEntries.map(r => r.latencyMs).sort((a, b) => a - b);
      this.state.metrics.stableLatencyP50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
      this.state.metrics.stableLatencyP95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
    }

    this.state.metrics.currentPercentage = this.state.currentPercentage;
  }
}
