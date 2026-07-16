#!/usr/bin/env node
/**
 * Benchmark script — measures build performance across scenarios.
 */
import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

interface BenchmarkResult {
  name: string;
  durationMs: number;
  success: boolean;
}

function runBenchmark(name: string, command: string): BenchmarkResult {
  const start = performance.now();
  let success = true;
  try {
    execSync(command, { stdio: 'pipe', cwd: process.cwd() });
  } catch {
    success = false;
  }
  const durationMs = Math.round(performance.now() - start);
  return { name, durationMs, success };
}

function main() {
  const results: BenchmarkResult[] = [];

  results.push(runBenchmark('cold-build', 'pnpm pledge build'));
  results.push(runBenchmark('cached-build', 'pnpm pledge build'));

  console.log('\n--- Benchmark Results ---\n');
  for (const r of results) {
    const status = r.success ? 'PASS' : 'FAIL';
    console.log(`${r.name.padEnd(20)} ${r.durationMs}ms  [${status}]`);
  }
}

main();
