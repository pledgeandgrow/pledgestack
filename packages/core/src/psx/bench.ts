/**
 * #304 — PSX Load Testing.
 *
 * `pledge bench --psx` load tests for Rust functions: requests/sec
 * with NAPI overhead, compare Rust vs TypeScript equivalent, identify
 * NAPI bottlenecks.
 *
 * Provides:
 * - Benchmark individual Rust functions via NAPI
 * - Compare Rust vs TypeScript equivalent functions
 * - Measure NAPI boundary crossing overhead
 * - Generate performance reports with percentiles
 * - Identify bottlenecks and suggest optimizations
 */

import { performance } from 'node:perf_hooks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BenchConfig {
  /** Number of iterations per benchmark (default: 10,000) */
  iterations?: number;
  /** Warmup iterations before measurement (default: 1,000) */
  warmupIterations?: number;
  /** Number of concurrent operations (default: 1) */
  concurrency?: number;
  /** Timeout in ms per iteration (default: 5000) */
  timeout?: number;
  /** Whether to include GC time in measurements (default: false) */
  includeGc?: boolean;
}

export interface BenchResult {
  name: string;
  iterations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  medianTimeMs: number;
  p95TimeMs: number;
  p99TimeMs: number;
  opsPerSec: number;
  stdDevMs: number;
}

export interface ComparisonResult {
  rust: BenchResult;
  typescript: BenchResult;
  speedup: number;
  napiOverheadMs: number;
  napiOverheadPercent: number;
  winner: 'rust' | 'typescript' | 'tie';
  recommendation: string;
}

export interface BenchReport {
  results: BenchResult[];
  comparisons: ComparisonResult[];
  timestamp: string;
  config: Required<BenchConfig>;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<BenchConfig> = {
  iterations: 10_000,
  warmupIterations: 1_000,
  concurrency: 1,
  timeout: 5_000,
  includeGc: false,
};

// ---------------------------------------------------------------------------
// Core benchmarking
// ---------------------------------------------------------------------------

/**
 * Benchmarks a single function by calling it repeatedly and measuring execution time.
 */
export async function benchmarkFn(
  name: string,
  fn: () => unknown | Promise<unknown>,
  config: BenchConfig = {},
): Promise<BenchResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < cfg.warmupIterations; i++) {
    await fn();
  }

  // Force GC if not including GC time
  if (!cfg.includeGc && global.gc) {
    global.gc();
  }

  // Measure
  const startTime = performance.now();
  for (let i = 0; i < cfg.iterations; i++) {
    const iterStart = performance.now();
    await fn();
    times.push(performance.now() - iterStart);
  }
  const totalTimeMs = performance.now() - startTime;

  // Calculate statistics
  times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const opsPerSec = (cfg.iterations / totalTimeMs) * 1000;
  const variance = times.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);

  return {
    name,
    iterations: cfg.iterations,
    totalTimeMs,
    avgTimeMs: avg,
    minTimeMs: min,
    maxTimeMs: max,
    medianTimeMs: median,
    p95TimeMs: p95,
    p99TimeMs: p99,
    opsPerSec,
    stdDevMs: stdDev,
  };
}

/**
 * Benchmarks a function with concurrent execution.
 */
export async function benchmarkConcurrent(
  name: string,
  fn: () => unknown | Promise<unknown>,
  concurrency: number,
  totalOps: number,
): Promise<BenchResult> {
  const times: number[] = [];
  let completed = 0;

  // Warmup
  for (let i = 0; i < Math.min(100, totalOps); i++) {
    await fn();
  }

  const startTime = performance.now();

  async function worker() {
    while (completed < totalOps) {
      const opStart = performance.now();
      await fn();
      times.push(performance.now() - opStart);
      completed++;
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeMs = performance.now() - startTime;

  times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const opsPerSec = (times.length / totalTimeMs) * 1000;
  const variance = times.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);

  return {
    name: `${name} (concurrency=${concurrency})`,
    iterations: times.length,
    totalTimeMs,
    avgTimeMs: avg,
    minTimeMs: min,
    maxTimeMs: max,
    medianTimeMs: median,
    p95TimeMs: p95,
    p99TimeMs: p99,
    opsPerSec,
    stdDevMs: stdDev,
  };
}

// ---------------------------------------------------------------------------
// Rust vs TypeScript comparison
// ---------------------------------------------------------------------------

/**
 * Compares a Rust NAPI function against its TypeScript equivalent.
 */
export async function compareRustVsTs(
  name: string,
  rustFn: () => unknown | Promise<unknown>,
  tsFn: () => unknown | Promise<unknown>,
  config: BenchConfig = {},
): Promise<ComparisonResult> {
  const rustResult = await benchmarkFn(`rust.${name}`, rustFn, config);
  const tsResult = await benchmarkFn(`ts.${name}`, tsFn, config);

  const speedup = tsResult.avgTimeMs / rustResult.avgTimeMs;
  const napiOverheadMs = Math.max(0, rustResult.avgTimeMs - tsResult.avgTimeMs * 0.1); // Estimate NAPI overhead
  const napiOverheadPercent = (napiOverheadMs / rustResult.avgTimeMs) * 100;

  let winner: 'rust' | 'typescript' | 'tie';
  if (speedup > 1.2) winner = 'rust';
  else if (speedup < 0.8) winner = 'typescript';
  else winner = 'tie';

  let recommendation: string;
  if (winner === 'rust') {
    recommendation = `Rust is ${speedup.toFixed(2)}x faster — keep using the native addon`;
  } else if (winner === 'typescript') {
    recommendation = `TypeScript is ${(1 / speedup).toFixed(2)}x faster — consider using JS fallback for this function`;
  } else {
    recommendation = `Performance is comparable (${speedup.toFixed(2)}x) — NAPI overhead may negate Rust gains for this function`;
  }

  return {
    rust: rustResult,
    typescript: tsResult,
    speedup,
    napiOverheadMs,
    napiOverheadPercent,
    winner,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// NAPI overhead measurement
// ---------------------------------------------------------------------------

/**
 * Measures the raw NAPI boundary crossing overhead by comparing
 * a no-op Rust function call against a no-op JS function call.
 */
export async function measureNapiOverhead(
  rustNoop: () => void,
  config: BenchConfig = {},
): Promise<{ overheadMs: number; overheadPercent: number; rustResult: BenchResult; tsResult: BenchResult }> {
  const tsNoop = () => { void 0; };
  const rustResult = await benchmarkFn('rust.noop', rustNoop, config);
  const tsResult = await benchmarkFn('ts.noop', tsNoop, config);

  const overheadMs = rustResult.avgTimeMs - tsResult.avgTimeMs;
  const overheadPercent = (overheadMs / rustResult.avgTimeMs) * 100;

  return { overheadMs, overheadPercent, rustResult, tsResult };
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

/**
 * Formats a benchmark result as a table row.
 */
export function formatBenchResult(result: BenchResult): string {
  const ops = result.opsPerSec >= 1000
    ? `${(result.opsPerSec / 1000).toFixed(1)}K ops/s`
    : `${result.opsPerSec.toFixed(0)} ops/s`;

  return [
    result.name.padEnd(35),
    `${result.avgTimeMs.toFixed(4)}ms`.padStart(12),
    `${result.medianTimeMs.toFixed(4)}ms`.padStart(12),
    `${result.p95TimeMs.toFixed(4)}ms`.padStart(12),
    `${result.p99TimeMs.toFixed(4)}ms`.padStart(12),
    ops.padStart(15),
  ].join('  ');
}

/**
 * Formats a full benchmark report.
 */
export function formatBenchReport(report: BenchReport): string {
  const lines: string[] = [
    '\n=== PSX Load Test Results ===\n',
    `Iterations: ${report.config.iterations}  Warmup: ${report.config.warmupIterations}  Concurrency: ${report.config.concurrency}`,
    `Timestamp: ${report.timestamp}\n`,
    'Individual Benchmarks:',
    '  ' + ['Name'.padEnd(35), 'avg'.padStart(12), 'median'.padStart(12), 'p95'.padStart(12), 'p99'.padStart(12), 'ops/s'.padStart(15)].join('  '),
    '  ' + '-'.repeat(100),
  ];

  for (const result of report.results) {
    lines.push('  ' + formatBenchResult(result));
  }

  if (report.comparisons.length > 0) {
    lines.push('\nRust vs TypeScript Comparisons:');
    for (const cmp of report.comparisons) {
      const icon = cmp.winner === 'rust' ? green('✓') : cmp.winner === 'typescript' ? yellow('⚠') : blue('=');
      lines.push(`\n  ${icon} ${cmp.rust.name} vs ${cmp.typescript.name}`);
      lines.push(`    Rust:       ${cmp.rust.avgTimeMs.toFixed(4)}ms avg  ${cmp.rust.opsPerSec.toFixed(0)} ops/s`);
      lines.push(`    TypeScript: ${cmp.typescript.avgTimeMs.toFixed(4)}ms avg  ${cmp.typescript.opsPerSec.toFixed(0)} ops/s`);
      lines.push(`    Speedup:    ${cmp.speedup.toFixed(2)}x`);
      lines.push(`    NAPI overhead: ~${cmp.napiOverheadMs.toFixed(4)}ms (${cmp.napiOverheadPercent.toFixed(1)}%)`);
      lines.push(`    ${dim(cmp.recommendation)}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Full benchmark suite
// ---------------------------------------------------------------------------

/**
 * Runs a full benchmark suite on Rust functions.
 */
export async function runBenchSuite(
  benchmarks: Array<{ name: string; fn: () => unknown | Promise<unknown> }>,
  config: BenchConfig = {},
): Promise<BenchReport> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const results: BenchResult[] = [];

  for (const bench of benchmarks) {
    const result = await benchmarkFn(bench.name, bench.fn, cfg);
    results.push(result);
  }

  return {
    results,
    comparisons: [],
    timestamp: new Date().toISOString(),
    config: cfg,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function green(s: string): string { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s: string): string { return `\x1b[33m${s}\x1b[0m`; }
function blue(s: string): string { return `\x1b[34m${s}\x1b[0m`; }
function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
