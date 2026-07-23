/**
 * #282 — Rust Addon Tree Shaking.
 *
 * Strip unused crate features at compile time, cargo feature flag
 * optimization, remove unused derive macros, minimize .node size.
 *
 * Provides:
 * - Analyze Cargo.toml for unused features
 * - Detect unused crate dependencies
 * - Suggest minimal feature sets
 * - Generate optimized Cargo.toml
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrateFeatureUsage {
  crate: string;
  allFeatures: string[];
  usedFeatures: string[];
  unusedFeatures: string[];
  defaultFeatures: boolean;
  recommendedFeatures: string[];
  potentialSizeSavingsKB: number;
}

export interface TreeShakeResult {
  crateUsages: CrateFeatureUsage[];
  unusedCrates: string[];
  totalPotentialSavingsKB: number;
  optimizedCargoToml: string;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Feature analysis
// ---------------------------------------------------------------------------

/**
 * Known minimal feature sets for common crates.
 */
const MINIMAL_FEATURES: Record<string, { default: string[]; minimal: string[]; description: string }> = {
  'tokio': {
    default: ['full'],
    minimal: ['rt', 'macros', 'net', 'io-util', 'time'],
    description: 'Replace "full" with only needed features. Most apps need rt+macros+net',
  },
  'serde': {
    default: ['derive'],
    minimal: ['derive'],
    description: 'derive is typically the only needed feature',
  },
  'sqlx': {
    default: ['runtime-tokio', 'postgres', 'macros', 'chrono'],
    minimal: ['runtime-tokio', 'postgres', 'macros'],
    description: 'Remove unused database features (mysql, sqlite, json)',
  },
  'reqwest': {
    default: ['default-tls', 'json', 'stream'],
    minimal: ['json'],
    description: 'Use rustls-tls instead of default-tls, remove unused features',
  },
  'image': {
    default: ['default'],
    minimal: ['png', 'jpeg'],
    description: 'Only enable formats you use. Each format adds ~100KB',
  },
  'napi': {
    default: ['napi8', 'async'],
    minimal: ['napi8', 'async'],
    description: 'napi8 is the minimum for async support',
  },
};

/**
 * Analyzes a Cargo.toml for unused features and suggests minimal feature sets.
 */
export function analyzeCargoFeatures(cargoTomlPath: string): CrateFeatureUsage[] {
  if (!existsSync(cargoTomlPath)) return [];

  const content = readFileSync(cargoTomlPath, 'utf-8');
  const results: CrateFeatureUsage[] = [];

  // Parse dependencies
  const depRegex = /^(\w[\w-]*)\s*=\s*\{(.+)\}$/gm;
  let match: RegExpExecArray | null;

  while ((match = depRegex.exec(content)) !== null) {
    const crate = match[1];
    const tableContent = match[2];

    const featuresMatch = tableContent.match(/features\s*=\s*\[([^\]]+)\]/);
    const defaultFeaturesMatch = tableContent.match(/default-features\s*=\s*(true|false)/);

    const allFeatures = featuresMatch
      ? featuresMatch[1].split(',').map(f => f.trim().replace(/"/g, '')).filter(Boolean)
      : [];
    const defaultFeatures = defaultFeaturesMatch?.[1] !== 'false';

    const minimal = MINIMAL_FEATURES[crate];
    const usedFeatures = minimal?.minimal ?? allFeatures;
    const unusedFeatures = allFeatures.filter(f => !usedFeatures.includes(f));
    const recommendedFeatures = minimal?.minimal ?? allFeatures;

    // Estimate size savings (rough estimates)
    const potentialSizeSavingsKB = unusedFeatures.length * 50; // ~50KB per unused feature

    results.push({
      crate,
      allFeatures,
      usedFeatures,
      unusedFeatures,
      defaultFeatures,
      recommendedFeatures,
      potentialSizeSavingsKB,
    });
  }

  return results;
}

/**
 * Detects unused crate dependencies by analyzing Rust source files.
 */
export function detectUnusedCrates(
  cargoTomlPath: string,
  rustSourceDir: string,
): string[] {
  if (!existsSync(cargoTomlPath)) return [];

  const content = readFileSync(cargoTomlPath, 'utf-8');
  const declaredCrates: string[] = [];

  // Extract crate names from Cargo.toml
  const depRegex = /^(\w[\w-]*)\s*=\s/gm;
  let match: RegExpExecArray | null;
  while ((match = depRegex.exec(content)) !== null) {
    const name = match[1];
    if (!['edition', 'name', 'version', 'authors', 'description', 'license', 'repository', 'homepage', 'documentation', 'keywords', 'categories', 'readme'].includes(name)) {
      declaredCrates.push(name);
    }
  }

  // Scan Rust source files for `use` statements
  const usedCrates = new Set<string>();
  try {
    const output = execSync(
      `find "${rustSourceDir}" -name "*.rs" -exec grep -h "^use " {} + 2>/dev/null || true`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
    );

    for (const line of output.split('\n')) {
      const useMatch = line.match(/^use\s+(\w+)/);
      if (useMatch) {
        usedCrates.add(useMatch[1].replace(/_/g, '-'));
      }

      // Also check for extern crate
      const externMatch = line.match(/^extern\s+crate\s+(\w+)/);
      if (externMatch) {
        usedCrates.add(externMatch[1].replace(/_/g, '-'));
      }
    }
  } catch {
    // If find/grep fails, can't detect unused crates
    return [];
  }

  // Also check for crate:: references
  try {
    const output = execSync(
      `find "${rustSourceDir}" -name "*.rs" -exec grep -h "crate::" {} + 2>/dev/null || true`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    // The crate:: prefix refers to the current crate, not external ones
    void output;
  } catch {
    // Ignore
  }

  // Mark crates as unused if not found in source
  const unusedCrates = declaredCrates.filter(c => {
    const crateName = c.replace(/-/g, '_');
    return !usedCrates.has(c) && !usedCrates.has(crateName);
  });

  // Don't flag napi/napi-derive as unused (they're used via macros)
  return unusedCrates.filter(c => c !== 'napi' && c !== 'napi-derive');
}

/**
 * Generates an optimized Cargo.toml with minimal features.
 */
export function generateOptimizedCargoToml(cargoTomlPath: string): string {
  if (!existsSync(cargoTomlPath)) return '';

  const content = readFileSync(cargoTomlPath, 'utf-8');
  const usages = analyzeCargoFeatures(cargoTomlPath);

  let optimized = content;

  for (const usage of usages) {
    if (usage.unusedFeatures.length === 0) continue;

    const minimal = MINIMAL_FEATURES[usage.crate];
    if (!minimal) continue;

    // Replace features array in the dependency declaration
    const oldFeatures = `features = [${usage.allFeatures.map(f => `"${f}"`).join(', ')}]`;
    const newFeatures = `features = [${usage.recommendedFeatures.map(f => `"${f}"`).join(', ')}]`;

    optimized = optimized.replace(oldFeatures, newFeatures);
  }

  // Ensure LTO and strip are enabled in release profile
  if (!optimized.includes('lto = true')) {
    optimized += '\n[profile.release]\nlto = true\nopt-level = 3\nstrip = true\n';
  }

  return optimized;
}

/**
 * Runs full tree shaking analysis on a project.
 */
export function treeShakeAnalysis(
  projectRoot: string,
  rustSourceDir?: string,
): TreeShakeResult {
  const cargoTomlPath = join(projectRoot, 'packages', 'core', 'native', 'Cargo.toml');
  const sourceDir = rustSourceDir ?? join(projectRoot, 'packages', 'core', 'native', 'src');

  const crateUsages = analyzeCargoFeatures(cargoTomlPath);
  const unusedCrates = detectUnusedCrates(cargoTomlPath, sourceDir);
  const optimizedCargoToml = generateOptimizedCargoToml(cargoTomlPath);

  const totalPotentialSavingsKB = crateUsages.reduce(
    (sum, u) => sum + u.potentialSizeSavingsKB,
    0,
  );

  const warnings: string[] = [];
  for (const usage of crateUsages) {
    if (usage.unusedFeatures.length > 0) {
      const minimal = MINIMAL_FEATURES[usage.crate];
      warnings.push(
        `${usage.crate}: ${usage.unusedFeatures.length} unused feature(s): ${usage.unusedFeatures.join(', ')}` +
        (minimal ? ` — ${minimal.description}` : ''),
      );
    }
  }

  for (const crate of unusedCrates) {
    warnings.push(`${crate}: crate declared in Cargo.toml but not used in source — remove to save space`);
  }

  return {
    crateUsages,
    unusedCrates,
    totalPotentialSavingsKB,
    optimizedCargoToml,
    warnings,
  };
}

/**
 * Formats tree shaking results for CLI output.
 */
export function formatTreeShakeResult(result: TreeShakeResult): string {
  const lines: string[] = [
    '\n=== Rust Addon Tree Shaking Analysis ===\n',
  ];

  if (result.warnings.length === 0) {
    lines.push(`${green('✓')} No unused features or crates detected`);
    return lines.join('\n');
  }

  lines.push(`Potential savings: ~${result.totalPotentialSavingsKB}KB\n`);

  for (const usage of result.crateUsages) {
    if (usage.unusedFeatures.length === 0) continue;
    lines.push(`${yellow('⚠')} ${usage.crate}:`);
    lines.push(`  Current features: [${usage.allFeatures.join(', ')}]`);
    lines.push(`  Recommended:      [${usage.recommendedFeatures.join(', ')}]`);
    lines.push(`  Estimated savings: ~${usage.potentialSizeSavingsKB}KB\n`);
  }

  if (result.unusedCrates.length > 0) {
    lines.push(`${red('✗')} Unused crates:`);
    for (const crate of result.unusedCrates) {
      lines.push(`  • ${crate} — remove from Cargo.toml`);
    }
  }

  lines.push(`\n${dim('Run with --fix to apply optimized Cargo.toml')}`);
  return lines.join('\n');
}

/**
 * Applies the optimized Cargo.toml to disk.
 */
export function applyTreeShaking(projectRoot: string): { applied: boolean; backupPath: string } {
  const cargoTomlPath = join(projectRoot, 'packages', 'core', 'native', 'Cargo.toml');
  const backupPath = cargoTomlPath + '.bak';

  // Backup original
  const original = readFileSync(cargoTomlPath, 'utf-8');
  writeFileSync(backupPath, original, 'utf-8');

  // Write optimized
  const optimized = generateOptimizedCargoToml(cargoTomlPath);
  writeFileSync(cargoTomlPath, optimized, 'utf-8');

  return { applied: true, backupPath };
}

// ---------------------------------------------------------------------------

function red(s: string): string { return `\x1b[31m${s}\x1b[0m`; }
function green(s: string): string { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s: string): string { return `\x1b[33m${s}\x1b[0m`; }
function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
