/**
 * #287 — NAPI Call Overhead Benchmarking.
 *
 * Automated benchmarks for NAPI boundary crossing cost, track overhead
 * per Rust function, optimize serialization for hot paths.
 *
 * Provides:
 * - Per-function NAPI overhead measurement
 * - Serialization cost analysis (JSON vs PSXB vs raw)
 * - Overhead tracking across builds
 * - Hot path identification
 */

import { benchmarkFn, type BenchConfig } from './bench';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NapiOverheadResult {
  functionName: string;
  jsOnlyMs: number;
  napiMs: number;
  overheadMs: number;
  overheadPercent: number;
  serializationMs: number;
  serializationPercent: number;
  isHotPath: boolean;
  recommendation: string;
}

export interface SerializationBenchResult {
  format: 'json' | 'psxb' | 'raw';
  encodeMs: number;
  decodeMs: number;
  totalMs: number;
  payloadSizeBytes: number;
}

export interface NapiOverheadReport {
  results: NapiOverheadResult[];
  serialization: SerializationBenchResult[];
  avgOverheadMs: number;
  hotPaths: string[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// NAPI overhead measurement
// ---------------------------------------------------------------------------

/**
 * Measures the NAPI boundary crossing overhead for a specific function.
 */
export async function measureFunctionOverhead(
  functionName: string,
  napiFn: () => unknown | Promise<unknown>,
  jsEquivalent: () => unknown | Promise<unknown>,
  config: BenchConfig = {},
): Promise<NapiOverheadResult> {
  const napiResult = await benchmarkFn(`napi.${functionName}`, napiFn, config);
  const jsResult = await benchmarkFn(`js.${functionName}`, jsEquivalent, config);

  const overheadMs = napiResult.avgTimeMs - jsResult.avgTimeMs;
  const overheadPercent = (overheadMs / napiResult.avgTimeMs) * 100;

  // Estimate serialization cost by comparing with a no-op NAPI call
  const noopResult = await benchmarkFn(`napi.noop`, () => { void 0; }, { ...config, iterations: 1000 });
  const baseOverheadMs = noopResult.avgTimeMs;
  const serializationMs = Math.max(0, overheadMs - baseOverheadMs);
  const serializationPercent = (serializationMs / napiResult.avgTimeMs) * 100;

  const isHotPath = napiResult.opsPerSec > 10_000; // Called >10K times/sec
  const overheadThreshold = 0.1; // 100 microseconds
  const isOverheadSignificant = overheadMs > overheadThreshold;

  let recommendation: string;
  if (!isOverheadSignificant) {
    recommendation = 'Overhead is negligible — no action needed';
  } else if (serializationPercent > 50) {
    recommendation = 'Serialization dominates — consider using PSXB binary format or reducing payload size';
  } else if (isHotPath) {
    recommendation = 'Hot path with significant overhead — consider batching calls or caching results';
  } else {
    recommendation = 'Moderate overhead — acceptable for non-hot-path function';
  }

  return {
    functionName,
    jsOnlyMs: jsResult.avgTimeMs,
    napiMs: napiResult.avgTimeMs,
    overheadMs,
    overheadPercent,
    serializationMs,
    serializationPercent,
    isHotPath,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Serialization benchmarking
// ---------------------------------------------------------------------------

/**
 * Benchmarks different serialization formats for NAPI data transfer.
 */
export async function benchmarkSerialization(
  payload: unknown,
  config: BenchConfig = {},
): Promise<SerializationBenchResult[]> {
  const results: SerializationBenchResult[] = [];
  const payloadJson = JSON.stringify(payload);
  const payloadBuffer = Buffer.from(payloadJson, 'utf-8');

  // JSON serialization
  const jsonEncode = await benchmarkFn('json.encode', () => JSON.stringify(payload), { ...config, iterations: 5000 });
  const jsonDecode = await benchmarkFn('json.decode', () => JSON.parse(payloadJson), { ...config, iterations: 5000 });
  results.push({
    format: 'json',
    encodeMs: jsonEncode.avgTimeMs,
    decodeMs: jsonDecode.avgTimeMs,
    totalMs: jsonEncode.avgTimeMs + jsonDecode.avgTimeMs,
    payloadSizeBytes: payloadBuffer.length,
  });

  // Raw buffer (zero-copy)
  const rawEncode = await benchmarkFn('raw.encode', () => Buffer.from(payloadJson, 'utf-8'), { ...config, iterations: 5000 });
  const rawDecode = await benchmarkFn('raw.decode', () => payloadBuffer.toString('utf-8'), { ...config, iterations: 5000 });
  results.push({
    format: 'raw',
    encodeMs: rawEncode.avgTimeMs,
    decodeMs: rawDecode.avgTimeMs,
    totalMs: rawEncode.avgTimeMs + rawDecode.avgTimeMs,
    payloadSizeBytes: payloadBuffer.length,
  });

  // PSXB (simulated — would use native binary protocol in production)
  const psxbEncode = await benchmarkFn('psxb.encode', () => {
    // Simulated PSXB encoding (header + payload)
    const header = Buffer.alloc(8);
    header.writeUInt32BE(payloadBuffer.length, 0);
    return Buffer.concat([header, payloadBuffer]);
  }, { ...config, iterations: 5000 });
  const psxbDecode = await benchmarkFn('psxb.decode', () => {
    // Simulated PSXB decoding
    const buf = Buffer.concat([Buffer.alloc(8), payloadBuffer]);
    return buf.subarray(8);
  }, { ...config, iterations: 5000 });
  results.push({
    format: 'psxb',
    encodeMs: psxbEncode.avgTimeMs,
    decodeMs: psxbDecode.avgTimeMs,
    totalMs: psxbEncode.avgTimeMs + psxbDecode.avgTimeMs,
    payloadSizeBytes: payloadBuffer.length + 8,
  });

  return results;
}

// ---------------------------------------------------------------------------
// Full overhead report
// ---------------------------------------------------------------------------

/**
 * Generates a full NAPI overhead report for all functions.
 */
export async function generateOverheadReport(
  functions: Array<{ name: string; napi: () => unknown; js: () => unknown }>,
  config: BenchConfig = {},
): Promise<NapiOverheadReport> {
  const results: NapiOverheadResult[] = [];

  for (const fn of functions) {
    const result = await measureFunctionOverhead(fn.name, fn.napi, fn.js, config);
    results.push(result);
  }

  const avgOverheadMs = results.reduce((sum, r) => sum + r.overheadMs, 0) / results.length;
  const hotPaths = results.filter(r => r.isHotPath).map(r => r.functionName);

  // Run serialization benchmark with a typical payload
  const serialization = await benchmarkSerialization({ id: 1, name: 'test', data: [1, 2, 3] }, config);

  return {
    results,
    serialization,
    avgOverheadMs,
    hotPaths,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatOverheadReport(report: NapiOverheadReport): string {
  const lines: string[] = [
    '\n=== NAPI Overhead Benchmark ===\n',
    `Average overhead: ${(report.avgOverheadMs * 1000).toFixed(1)}μs per call`,
    `Hot paths: ${report.hotPaths.length > 0 ? report.hotPaths.join(', ') : 'none'}\n`,
    'Per-Function Overhead:',
    '  ' + ['Function'.padEnd(25), 'JS'.padStart(10), 'NAPI'.padStart(10), 'Overhead'.padStart(10), 'Serial%'.padStart(10)].join('  '),
    '  ' + '-'.repeat(70),
  ];

  for (const r of report.results) {
    const icon = r.overheadMs > 0.1 ? yellow('⚠') : green('✓');
    lines.push(`  ${icon} ${r.functionName.padEnd(23)} ${(r.jsOnlyMs * 1000).toFixed(1).padStart(8)}μs  ${(r.napiMs * 1000).toFixed(1).padStart(8)}μs  ${(r.overheadMs * 1000).toFixed(1).padStart(8)}μs  ${r.serializationPercent.toFixed(0).padStart(8)}%`);
  }

  lines.push('\nSerialization Formats:');
  for (const s of report.serialization) {
    lines.push(`  ${s.format.toUpperCase().padEnd(6)} encode: ${(s.encodeMs * 1000).toFixed(1)}μs  decode: ${(s.decodeMs * 1000).toFixed(1)}μs  total: ${(s.totalMs * 1000).toFixed(1)}μs  size: ${s.payloadSizeBytes}B`);
  }

  lines.push('\nRecommendations:');
  for (const r of report.results) {
    if (r.overheadMs > 0.1) {
      lines.push(`  ${yellow('→')} ${r.functionName}: ${r.recommendation}`);
    }
  }

  return lines.join('\n');
}

function green(s: string): string { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s: string): string { return `\x1b[33m${s}\x1b[0m`; }
