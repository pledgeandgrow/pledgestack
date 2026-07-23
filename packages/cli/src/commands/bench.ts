import type { PledgeConfig } from 'pledgestack-shared';

interface BenchOptions {
  psx?: boolean;
  iterations?: string;
  concurrency?: string;
  compare?: boolean;
}

/**
 * pledge bench — Load test Rust functions and compare with TypeScript equivalents.
 *
 * Usage:
 *   pledge bench --psx              Benchmark all Rust NAPI functions
 *   pledge bench --psx --compare    Compare Rust vs TypeScript
 *   pledge bench --psx -i 50000     Custom iteration count
 */
export async function benchCommand(
  _config: PledgeConfig,
  opts?: BenchOptions,
): Promise<void> {
  const { benchmarkFn, formatBenchResult, measureNapiOverhead } = await import('pledgestack-core');

  const iterations = opts?.iterations ? parseInt(opts.iterations, 10) : 10_000;
  const concurrency = opts?.concurrency ? parseInt(opts.concurrency, 10) : 1;

  console.log(bold('\n=== PledgeStack Benchmark ===\n'));
  console.log(`Iterations: ${iterations}  Concurrency: ${concurrency}\n`);

  if (!opts?.psx) {
    console.log(yellow('Use --psx flag to benchmark Rust NAPI functions'));
    console.log(dim('Example: pledge bench --psx --compare\n'));
    return;
  }

  // Try to load native addons
  let rustAddon: Record<string, unknown> | null = null;
  try {
    rustAddon = require('../../core/native/rust-bench.node');
  } catch {
    try {
      rustAddon = require('@pledgestack/core/native/rust-bench.node');
    } catch {
      console.log(yellow('No Rust benchmark addon found.'));
      console.log(dim('Build first with: pledge build'));
      console.log(dim('Then run: pledge bench --psx\n'));
      return;
    }
  }

  const addon: Record<string, unknown> = rustAddon!;

  // Benchmark available Rust functions
  const results: Array<{ name: string; result: unknown }> = [];

  // NAPI overhead measurement
  console.log(bold('Measuring NAPI boundary overhead...'));
  if (typeof addon.noop === 'function') {
    const overhead = await measureNapiOverhead(addon.noop as () => void, { iterations });
    console.log(`  NAPI overhead: ${overhead.overheadMs.toFixed(4)}ms per call (${overhead.overheadPercent.toFixed(1)}%)`);
    console.log(`  Rust noop: ${overhead.rustResult.avgTimeMs.toFixed(4)}ms  JS noop: ${overhead.tsResult.avgTimeMs.toFixed(4)}ms\n`);
  }

  // Benchmark each function in the addon
  console.log(bold('Benchmarking Rust functions:'));
  console.log('  ' + ['Name'.padEnd(35), 'avg'.padStart(12), 'median'.padStart(12), 'p95'.padStart(12), 'p99'.padStart(12), 'ops/s'.padStart(15)].join('  '));
  console.log('  ' + '-'.repeat(100));

  for (const [name, fn] of Object.entries(addon)) {
    if (typeof fn !== 'function') continue;
    if (name.startsWith('_')) continue;

    try {
      const result = await benchmarkFn(`rust.${name}`, fn as () => unknown, { iterations, concurrency });
      console.log('  ' + formatBenchResult(result));
      results.push({ name, result });
    } catch (err) {
      console.log(`  ${red('✗')} rust.${name} — ${(err as Error).message}`);
    }
  }

  if (opts?.compare) {
    console.log(bold('\nComparing Rust vs TypeScript...'));
    console.log(yellow('  Comparison requires TypeScript equivalents to be registered.'));
    console.log(dim('  Use the compareRustVsTs() API for programmatic comparison.\n'));
  }

  console.log(bold(`\nBenchmark complete: ${results.length} function(s) tested`));
}

function red(s: string): string { return `\x1b[31m${s}\x1b[0m`; }
function yellow(s: string): string { return `\x1b[33m${s}\x1b[0m`; }
function bold(s: string): string { return `\x1b[1m${s}\x1b[0m`; }
function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
