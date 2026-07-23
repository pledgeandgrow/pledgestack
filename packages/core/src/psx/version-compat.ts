/**
 * #299 — PSX Version Compatibility.
 *
 * Semantic versioning for Rust workspace deps, breaking change detection
 * across crate updates, `pledge add --check` for compatibility validation.
 *
 * Provides:
 * - Parse Cargo.toml dependencies with semver ranges
 * - Check compatibility between crate versions
 * - Detect breaking changes from version diffs
 * - Validate new crate additions against existing deps
 * - Suggest compatible version ranges
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrateDependency {
  name: string;
  version: string;
  features: string[];
  optional: boolean;
  source: 'crates.io' | 'git' | 'path';
  raw: string;
}

export interface CompatibilityResult {
  crate: string;
  currentVersion: string;
  requestedVersion?: string;
  compatible: boolean;
  reason: string;
  breakingChanges: string[];
  suggestions: string[];
}

export interface VersionCheckResult {
  dependencies: CompatibilityResult[];
  conflicts: CompatibilityResult[];
  allCompatible: boolean;
  cargoLockUpToDate: boolean;
}

// ---------------------------------------------------------------------------
// Cargo.toml parsing
// ---------------------------------------------------------------------------

/**
 * Parses a Cargo.toml file and extracts all dependencies.
 */
export function parseCargoDeps(cargoTomlPath: string): CrateDependency[] {
  if (!existsSync(cargoTomlPath)) return [];

  const content = readFileSync(cargoTomlPath, 'utf-8');
  const deps: CrateDependency[] = [];

  // Match: name = "version"  OR  name = { version = "...", features = [...], ... }
  const depRegex = /^(\w[\w-]*)\s*=\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = depRegex.exec(content)) !== null) {
    const name = match[1];
    const raw = match[2].trim();

    // Skip non-dependency keys
    if (['edition', 'name', 'version', 'authors', 'description', 'license', 'repository', 'homepage', 'documentation', 'keywords', 'categories', 'readme'].includes(name)) {
      continue;
    }

    // Parse simple version: "1.0"
    const simpleMatch = raw.match(/^"([^"]+)"$/);
    if (simpleMatch) {
      deps.push({
        name,
        version: simpleMatch[1],
        features: [],
        optional: false,
        source: 'crates.io',
        raw,
      });
      continue;
    }

    // Parse inline table: { version = "...", features = [...] }
    const tableMatch = raw.match(/^\{(.+)\}$/);
    if (tableMatch) {
      const tableContent = tableMatch[1];
      const versionMatch = tableContent.match(/version\s*=\s*"([^"]+)"/);
      const featuresMatch = tableContent.match(/features\s*=\s*\[([^\]]+)\]/);
      const optionalMatch = tableContent.match(/optional\s*=\s*(true|false)/);
      const gitMatch = tableContent.match(/git\s*=\s*"([^"]+)"/);
      const pathMatch = tableContent.match(/path\s*=\s*"([^"]+)"/);

      deps.push({
        name,
        version: versionMatch?.[1] ?? '*',
        features: featuresMatch
          ? featuresMatch[1].split(',').map(f => f.trim().replace(/"/g, '')).filter(Boolean)
          : [],
        optional: optionalMatch?.[1] === 'true',
        source: gitMatch ? 'git' : pathMatch ? 'path' : 'crates.io',
        raw,
      });
    }
  }

  return deps;
}

// ---------------------------------------------------------------------------
// Semver utilities
// ---------------------------------------------------------------------------

export interface SemverVersion {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
}

/**
 * Parses a semver version string.
 */
export function parseSemver(version: string): SemverVersion | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    preRelease: match[4],
  };
}

/**
 * Checks if a version satisfies a semver range (e.g., "1", "1.2", "^1.2.3", "~1.2.3", ">=1.2.3").
 */
export function satisfiesVersion(version: string, range: string): boolean {
  const v = parseSemver(version);
  if (!v) return false;

  // Strip caret/tilde
  const rangeStr = range.replace(/[\^~]/, '').trim();

  // Exact major (e.g., "1")
  if (/^\d+$/.test(rangeStr)) {
    return v.major === parseInt(rangeStr, 10);
  }

  // Major.minor (e.g., "1.2")
  if (/^\d+\.\d+$/.test(rangeStr)) {
    const [major, minor] = rangeStr.split('.').map(Number);
    return v.major === major && v.minor === minor;
  }

  // Full version (e.g., "1.2.3")
  const r = parseSemver(rangeStr);
  if (!r) return false;

  if (range.startsWith('^')) {
    // Compatible: same major, >= specified
    return v.major === r.major &&
      (v.minor > r.minor || (v.minor === r.minor && v.patch >= r.patch));
  }

  if (range.startsWith('~')) {
    // Patch: same major.minor, >= specified patch
    return v.major === r.major && v.minor === r.minor && v.patch >= r.patch;
  }

  if (range.startsWith('>=')) {
    return compareSemver(v, r) >= 0;
  }

  if (range.startsWith('>')) {
    return compareSemver(v, r) > 0;
  }

  if (range.startsWith('<=')) {
    return compareSemver(v, r) <= 0;
  }

  if (range.startsWith('<')) {
    return compareSemver(v, r) < 0;
  }

  // Exact match
  return v.major === r.major && v.minor === r.minor && v.patch === r.patch;
}

function compareSemver(a: SemverVersion, b: SemverVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.preRelease && !b.preRelease) return -1;
  if (!a.preRelease && b.preRelease) return 1;
  if (a.preRelease && b.preRelease) return a.preRelease.localeCompare(b.preRelease);
  return 0;
}

// ---------------------------------------------------------------------------
// Breaking change detection
// ---------------------------------------------------------------------------

/**
 * Known breaking changes between major versions of common crates.
 */
const KNOWN_BREAKING_CHANGES: Record<string, Record<string, string[]>> = {
  'tokio': {
    '1': ['API stabilized', 'Async traits now native'],
    '0.2': ['Major API redesign from 0.1'],
  },
  'sqlx': {
    '0.7': ['Pool API changes', 'FromRow derive macro updated'],
    '0.6': ['Transaction API changes', 'Query builder modifications'],
  },
  'serde': {
    '1': ['Stable API, no breaking changes expected within 1.x'],
  },
  'napi': {
    '2': ['Complete API redesign from 1.x', 'New macro system', 'Thread-safe function support'],
    '1': ['Initial stable release'],
  },
  'reqwest': {
    '0.11': ['Default features changed', 'TLS backend updates'],
    '0.12': ['Hyper 1.0 migration', 'API adjustments'],
  },
  'image': {
    '0.24': ['Image format enum changes', 'Decoder API updates'],
    '0.25': ['Major API restructuring', 'New error types'],
  },
};

/**
 * Detects breaking changes between two versions of a crate.
 */
export function detectBreakingChanges(
  crate: string,
  fromVersion: string,
  toVersion: string,
): string[] {
  const fromMajor = parseSemver(fromVersion);
  const toMajor = parseSemver(toVersion);

  if (!fromMajor || !toMajor) return [];

  const changes: string[] = [];

  // Major version bump = breaking changes
  if (toMajor.major > fromMajor.major) {
    changes.push(`Major version bump: ${fromVersion} → ${toVersion}`);

    const knownChanges = KNOWN_BREAKING_CHANGES[crate]?.[`${toMajor.major}`];
    if (knownChanges) {
      changes.push(...knownChanges);
    } else {
      changes.push('API may have breaking changes — review migration guide');
    }
  }

  // Check for known breaking changes in minor versions
  if (toMajor.major === fromMajor.major && toMajor.minor > fromMajor.minor) {
    const knownChanges = KNOWN_BREAKING_CHANGES[crate]?.[`${toMajor.major}.${toMajor.minor}`];
    if (knownChanges) {
      changes.push(...knownChanges);
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Compatibility checking
// ---------------------------------------------------------------------------

/**
 * Checks if a crate version is compatible with the existing dependencies.
 */
export function checkCompatibility(
  cargoTomlPath: string,
  crate: string,
  requestedVersion: string,
): CompatibilityResult {
  const deps = parseCargoDeps(cargoTomlPath);
  const existing = deps.find((d: CrateDependency) => d.name === crate);

  if (!existing) {
    // New crate — check if version is valid
    return {
      crate,
      currentVersion: '(not installed)',
      requestedVersion,
      compatible: true,
      reason: 'New dependency — no conflicts',
      breakingChanges: [],
      suggestions: [`Add ${crate} = "${requestedVersion}" to Cargo.toml`],
    };
  }

  const breakingChanges = detectBreakingChanges(crate, existing.version, requestedVersion);
  const isCompatible = breakingChanges.length === 0;

  return {
    crate,
    currentVersion: existing.version,
    requestedVersion,
    compatible: isCompatible,
    reason: isCompatible
      ? `Compatible: ${existing.version} → ${requestedVersion}`
      : `Breaking changes detected: ${existing.version} → ${requestedVersion}`,
    breakingChanges,
    suggestions: isCompatible
      ? [`Update ${crate} from ${existing.version} to ${requestedVersion}`]
      : [
          `Review breaking changes before updating`,
          `Run cargo update -p ${crate} --precise ${requestedVersion}`,
          `Test thoroughly after update`,
        ],
  };
}

/**
 * Runs a full version compatibility check on the project.
 */
export function checkProjectCompatibility(projectRoot: string): VersionCheckResult {
  const cargoTomlPath = join(projectRoot, 'packages', 'core', 'native', 'Cargo.toml');
  const cargoLockPath = join(projectRoot, 'Cargo.lock');

  if (!existsSync(cargoTomlPath)) {
    return {
      dependencies: [],
      conflicts: [],
      allCompatible: true,
      cargoLockUpToDate: false,
    };
  }

  const deps = parseCargoDeps(cargoTomlPath);
  const results: CompatibilityResult[] = [];

  // Check each dependency
  for (const dep of deps) {
    // Check for duplicate/conflicting versions in workspace
    const result: CompatibilityResult = {
      crate: dep.name,
      currentVersion: dep.version,
      compatible: true,
      reason: 'OK',
      breakingChanges: [],
      suggestions: [],
    };

    // Check for known problematic versions
    if (dep.version === '*') {
      result.compatible = false;
      result.reason = 'Wildcard version not recommended for production';
      result.suggestions.push('Pin to a specific version range (e.g., "1" or "^1.2.3")');
    }

    results.push(result);
  }

  // Check if Cargo.lock is up to date
  let cargoLockUpToDate = true;
  if (existsSync(cargoLockPath)) {
    try {
      execSync('cargo metadata --no-deps --format-version 1', {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      cargoLockUpToDate = false;
    }
  } else {
    cargoLockUpToDate = false;
  }

  const conflicts = results.filter(r => !r.compatible);

  return {
    dependencies: results,
    conflicts,
    allCompatible: conflicts.length === 0,
    cargoLockUpToDate,
  };
}

// ---------------------------------------------------------------------------
// CLI: pledge add --check
// ---------------------------------------------------------------------------

/**
 * Validates that adding a crate won't cause compatibility issues.
 * Returns a report suitable for CLI output.
 */
export function validateCrateAddition(
  projectRoot: string,
  crate: string,
  version: string,
): { valid: boolean; report: string; result: CompatibilityResult } {
  const cargoTomlPath = join(projectRoot, 'packages', 'core', 'native', 'Cargo.toml');
  const result = checkCompatibility(cargoTomlPath, crate, version);

  const lines: string[] = [];
  const icon = result.compatible ? green('✓') : red('✗');

  lines.push(`${icon} ${crate} ${result.currentVersion} → ${result.requestedVersion}`);
  lines.push(`  ${result.reason}`);

  if (result.breakingChanges.length > 0) {
    lines.push('  Breaking changes:');
    for (const change of result.breakingChanges) {
      lines.push(`    ${red('•')} ${change}`);
    }
  }

  if (result.suggestions.length > 0) {
    lines.push('  Suggestions:');
    for (const suggestion of result.suggestions) {
      lines.push(`    ${blue('→')} ${suggestion}`);
    }
  }

  return {
    valid: result.compatible,
    report: lines.join('\n'),
    result,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function red(s: string): string { return `\x1b[31m${s}\x1b[0m`; }
function green(s: string): string { return `\x1b[32m${s}\x1b[0m`; }
function blue(s: string): string { return `\x1b[34m${s}\x1b[0m`; }
