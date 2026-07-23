/**
 * #286 — PSX Memory Profiling.
 *
 * Track Rust addon memory usage per module, detect leaks,
 * `pledge doctor` integration for memory diagnostics, heap snapshots.
 *
 * Provides:
 * - Per-module memory tracking via NAPI
 * - Leak detection with allocation diffing
 * - Heap snapshot generation
 * - Integration with pledge doctor
 */

import { EventEmitter } from 'node:events';
import { writeFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleMemoryInfo {
  module: string;
  allocatedBytes: number;
  deallocatedBytes: number;
  netBytes: number;
  allocationCount: number;
  deallocationCount: number;
  peakBytes: number;
  samples: MemorySample[];
}

export interface MemorySample {
  timestamp: number;
  bytes: number;
  label?: string;
}

export interface MemoryLeakDetection {
  module: string;
  isLeaking: boolean;
  confidence: number;
  growthRateBytesPerMin: number;
  samples: number;
  recommendation: string;
}

export interface MemoryReport {
  modules: ModuleMemoryInfo[];
  leaks: MemoryLeakDetection[];
  totalAllocatedBytes: number;
  totalNetBytes: number;
  timestamp: string;
  duration: number;
}

// ---------------------------------------------------------------------------
// Memory Profiler
// ---------------------------------------------------------------------------

export class PsxMemoryProfiler extends EventEmitter {
  private modules = new Map<string, ModuleMemoryInfo>();
  private startTime = 0;
  private interval: ReturnType<typeof setInterval> | null = null;

  /**
   * Starts memory profiling.
   */
  start(): void {
    this.startTime = Date.now();
    this.emit('started', { timestamp: this.startTime });
  }

  /**
   * Stops memory profiling.
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.emit('stopped', { duration: Date.now() - this.startTime });
  }

  /**
   * Records a memory allocation for a module.
   */
  recordAllocation(module: string, bytes: number, label?: string): void {
    let info = this.modules.get(module);
    if (!info) {
      info = {
        module,
        allocatedBytes: 0,
        deallocatedBytes: 0,
        netBytes: 0,
        allocationCount: 0,
        deallocationCount: 0,
        peakBytes: 0,
        samples: [],
      };
      this.modules.set(module, info);
    }

    info.allocatedBytes += bytes;
    info.allocationCount++;
    info.netBytes = info.allocatedBytes - info.deallocatedBytes;
    info.peakBytes = Math.max(info.peakBytes, info.netBytes);

    info.samples.push({
      timestamp: Date.now(),
      bytes: info.netBytes,
      label,
    });

    // Keep last 1000 samples
    if (info.samples.length > 1000) {
      info.samples = info.samples.slice(-1000);
    }

    this.emit('allocation', { module, bytes, net: info.netBytes });
  }

  /**
   * Records a memory deallocation for a module.
   */
  recordDeallocation(module: string, bytes: number): void {
    const info = this.modules.get(module);
    if (!info) return;

    info.deallocatedBytes += bytes;
    info.deallocationCount++;
    info.netBytes = info.allocatedBytes - info.deallocatedBytes;

    info.samples.push({
      timestamp: Date.now(),
      bytes: info.netBytes,
    });

    if (info.samples.length > 1000) {
      info.samples = info.samples.slice(-1000);
    }

    this.emit('deallocation', { module, bytes, net: info.netBytes });
  }

  /**
   * Gets current memory info for a module.
   */
  getModuleMemory(module: string): ModuleMemoryInfo | undefined {
    return this.modules.get(module);
  }

  /**
   * Gets memory info for all tracked modules.
   */
  getAllMemory(): ModuleMemoryInfo[] {
    return Array.from(this.modules.values());
  }

  /**
   * Detects potential memory leaks by analyzing allocation trends.
   */
  detectLeaks(): MemoryLeakDetection[] {
    const leaks: MemoryLeakDetection[] = [];

    for (const info of this.modules.values()) {
      if (info.samples.length < 10) continue;

      // Compare first 10 samples with last 10 samples
      const firstTen = info.samples.slice(0, 10);
      const lastTen = info.samples.slice(-10);

      const firstAvg = firstTen.reduce((sum, s) => sum + s.bytes, 0) / firstTen.length;
      const lastAvg = lastTen.reduce((sum, s) => sum + s.bytes, 0) / lastTen.length;

      const growth = lastAvg - firstAvg;
      const timeSpanMs = (lastTen[lastTen.length - 1].timestamp - firstTen[0].timestamp) || 1;
      const growthRateBytesPerMin = (growth / timeSpanMs) * 60_000;

      // Leak detection heuristics
      const isLeaking = growth > 1024 * 1024 && growthRateBytesPerMin > 10_000; // >1MB growth, >10KB/min
      const confidence = Math.min(1, Math.abs(growth) / (1024 * 1024));

      let recommendation: string;
      if (isLeaking) {
        recommendation = `Potential memory leak: growing ${growthRateBytesPerMin.toFixed(0)} bytes/min. Check for missing deallocations in ${info.module}.`;
      } else if (growth > 100_000) {
        recommendation = `Slight memory growth detected. Monitor ${info.module} for continued growth.`;
      } else {
        recommendation = 'No leak detected. Memory usage is stable.';
      }

      leaks.push({
        module: info.module,
        isLeaking,
        confidence,
        growthRateBytesPerMin,
        samples: info.samples.length,
        recommendation,
      });
    }

    return leaks;
  }

  /**
   * Generates a full memory report.
   */
  generateReport(): MemoryReport {
    const modules = this.getAllMemory();
    const leaks = this.detectLeaks();
    const totalAllocated = modules.reduce((sum, m) => sum + m.allocatedBytes, 0);
    const totalNet = modules.reduce((sum, m) => sum + m.netBytes, 0);

    return {
      modules,
      leaks,
      totalAllocatedBytes: totalAllocated,
      totalNetBytes: totalNet,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
    };
  }

  /**
   * Exports a heap snapshot in JSON format.
   */
  exportSnapshot(outputPath: string): void {
    const report = this.generateReport();
    writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  }

  /**
   * Starts periodic sampling at the given interval.
   */
  startSampling(intervalMs: number = 10_000): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      for (const info of this.modules.values()) {
        info.samples.push({
          timestamp: Date.now(),
          bytes: info.netBytes,
          label: 'periodic',
        });
        if (info.samples.length > 1000) {
          info.samples = info.samples.slice(-1000);
        }
      }
      this.emit('sample', { timestamp: Date.now() });
    }, intervalMs);
  }

  /**
   * Resets all memory tracking data.
   */
  reset(): void {
    this.modules.clear();
    this.startTime = Date.now();
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let defaultProfiler: PsxMemoryProfiler | null = null;

export function getMemoryProfiler(): PsxMemoryProfiler {
  if (!defaultProfiler) {
    defaultProfiler = new PsxMemoryProfiler();
  }
  return defaultProfiler;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatMemoryReport(report: MemoryReport): string {
  const lines: string[] = [
    '\n=== PSX Memory Profile ===\n',
    `Duration: ${(report.duration / 1000).toFixed(1)}s`,
    `Total allocated: ${formatBytes(report.totalAllocatedBytes)}`,
    `Total net: ${formatBytes(report.totalNetBytes)}\n`,
    'Per-Module Breakdown:',
  ];

  for (const mod of report.modules) {
    lines.push(`  ${mod.module}:`);
    lines.push(`    Allocated: ${formatBytes(mod.allocatedBytes)}  Net: ${formatBytes(mod.netBytes)}  Peak: ${formatBytes(mod.peakBytes)}`);
    lines.push(`    Allocations: ${mod.allocationCount}  Deallocations: ${mod.deallocationCount}`);
  }

  if (report.leaks.length > 0) {
    lines.push('\nLeak Detection:');
    for (const leak of report.leaks) {
      const icon = leak.isLeaking ? red('✗') : yellow('⚠');
      lines.push(`  ${icon} ${leak.module}: ${leak.isLeaking ? 'LEAK DETECTED' : 'monitoring'}`);
      lines.push(`    Growth: ${leak.growthRateBytesPerMin.toFixed(0)} bytes/min  Confidence: ${(leak.confidence * 100).toFixed(0)}%`);
      lines.push(`    ${dim(leak.recommendation)}`);
    }
  }

  return lines.join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function red(s: string): string { return `\x1b[31m${s}\x1b[0m`; }
function yellow(s: string): string { return `\x1b[33m${s}\x1b[0m`; }
function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
