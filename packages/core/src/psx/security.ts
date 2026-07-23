/**
 * #295 — PSX Security Review.
 *
 * Security audit of NAPI bindings, verification of no unsafe Rust code
 * in user .psx/.ps files, sandboxing of Rust file system and network access.
 *
 * Provides:
 * - NAPI binding audit (check for unsafe, raw pointers, FFI)
 * - Rust source security scanner (detect unsafe blocks, unwrap, expect)
 * - File system access sandbox (whitelist allowed paths)
 * - Network access controls (whitelist allowed hosts)
 * - Security report generation
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  file: string;
  line: number;
  message: string;
  recommendation: string;
  cwe?: string;
}

export interface SecurityReport {
  findings: SecurityFinding[];
  summary: SecuritySummary;
  timestamp: string;
  projectRoot: string;
}

export interface SecuritySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
  filesScanned: number;
  passed: boolean;
}

export interface SandboxConfig {
  allowedPaths: string[];
  allowedHosts: string[];
  allowedEnvVars: string[];
  allowFileSystem: boolean;
  allowNetwork: boolean;
  allowSubprocess: boolean;
  allowUnsafe: boolean;
}

// ---------------------------------------------------------------------------
// Default sandbox policy
// ---------------------------------------------------------------------------

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  allowedPaths: [],
  allowedHosts: [],
  allowedEnvVars: [],
  allowFileSystem: true,
  allowNetwork: true,
  allowSubprocess: false,
  allowUnsafe: false,
};

// ---------------------------------------------------------------------------
// Security patterns to detect in Rust source
// ---------------------------------------------------------------------------

const SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  severity: SecurityFinding['severity'];
  category: string;
  message: string;
  recommendation: string;
  cwe?: string;
}> = [
  {
    pattern: /\bunsafe\s*\{/g,
    severity: 'high',
    category: 'unsafe-block',
    message: 'Unsafe block detected — bypasses memory safety guarantees',
    recommendation: 'Remove unsafe block or provide a safe wrapper with bounds checking',
    cwe: 'CWE-787',
  },
  {
    pattern: /\bunsafe\s+(fn|impl|trait)/g,
    severity: 'high',
    category: 'unsafe',
    message: 'Unsafe Rust code detected — bypasses memory safety guarantees',
    recommendation: 'Remove unsafe code or provide a safe wrapper with bounds checking',
    cwe: 'CWE-787',
  },
  {
    pattern: /\bstd::ptr::/,
    severity: 'high',
    category: 'raw-pointer',
    message: 'Raw pointer manipulation detected — can cause memory corruption',
    recommendation: 'Use Rust references or safe abstractions instead of raw pointers',
    cwe: 'CWE-119',
  },
  {
    pattern: /\bstd::ffi::|\bextern\s+"C"/g,
    severity: 'medium',
    category: 'ffi',
    message: 'FFI (Foreign Function Interface) detected — can introduce vulnerabilities',
    recommendation: 'Minimize FFI usage, ensure all C bindings are properly validated',
    cwe: 'CWE-775',
  },
  {
    pattern: /\.unwrap\(\)/g,
    severity: 'low',
    category: 'unwrap',
    message: 'unwrap() call can panic — may cause denial of service',
    recommendation: 'Use expect() with descriptive message or proper error handling with ?',
    cwe: 'CWE-754',
  },
  {
    pattern: /\.expect\(/g,
    severity: 'info',
    category: 'expect',
    message: 'expect() call can panic — consider graceful error handling',
    recommendation: 'Use Result propagation (?) for recoverable errors',
  },
  {
    pattern: /\bstd::process::Command/g,
    severity: 'critical',
    category: 'subprocess',
    message: 'Subprocess execution detected — command injection risk',
    recommendation: 'Avoid spawning subprocesses from Rust addons. Use NAPI for inter-process communication',
    cwe: 'CWE-78',
  },
  {
    pattern: /\bstd::fs::(read|write|create_dir|remove_dir|remove_file|rename|copy)|\bfs::(read|write|create_dir|remove_dir|remove_file|rename|copy)/g,
    severity: 'medium',
    category: 'filesystem',
    message: 'File system access detected — ensure paths are validated and sandboxed',
    recommendation: 'Whitelist allowed paths in SandboxConfig, validate all user input',
    cwe: 'CWE-22',
  },
  {
    pattern: /\bstd::net::|TcpStream|UdpSocket|TcpListener/g,
    severity: 'medium',
    category: 'network',
    message: 'Network access detected — ensure hosts are whitelisted',
    recommendation: 'Whitelist allowed hosts in SandboxConfig, use reqwest with timeout',
    cwe: 'CWE-918',
  },
  {
    pattern: /\bstd::env::var/g,
    severity: 'low',
    category: 'env',
    message: 'Environment variable access detected — may leak secrets',
    recommendation: 'Whitelist allowed env vars in SandboxConfig, never log env values',
    cwe: 'CWE-532',
  },
  {
    pattern: /\beval\b|include_str!\s*\(|include_bytes!\s*\(/g,
    severity: 'medium',
    category: 'code-injection',
    message: 'Dynamic code/file inclusion detected — may allow code injection',
    recommendation: 'Avoid dynamic inclusion of untrusted content',
    cwe: 'CWE-94',
  },
  {
    pattern: /\bpassword\b|\bsecret\b|\bprivate_key\b/gi,
    severity: 'info',
    category: 'sensitive-data',
    message: 'Potential sensitive data reference found',
    recommendation: 'Ensure secrets are not hardcoded, use environment variables',
    cwe: 'CWE-798',
  },
];

// ---------------------------------------------------------------------------
// NAPI binding audit
// ---------------------------------------------------------------------------

/**
 * Audits generated NAPI bindings for security issues.
 * Checks for unsafe code, raw pointers, and missing validation.
 */
export function auditNapiBindings(rustSource: string, fileName: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = rustSource.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of SECURITY_PATTERNS) {
      pattern.pattern.lastIndex = 0;
      const match = pattern.pattern.exec(line);
      if (match) {
        findings.push({
          severity: pattern.severity,
          category: pattern.category,
          file: fileName,
          line: i + 1,
          message: pattern.message,
          recommendation: pattern.recommendation,
          cwe: pattern.cwe,
        });
      }
    }
  }

  // Check for missing input validation in NAPI functions
  const napiFnRegex = /#\[napi\]\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/g;
  let napiMatch: RegExpExecArray | null;
  while ((napiMatch = napiFnRegex.exec(rustSource)) !== null) {
    const fnName = napiMatch[1];
    const fnStart = rustSource.slice(0, napiMatch.index).split('\n').length;
    // Find the function body
    const fnBodyStart = rustSource.indexOf('{', napiMatch.index);
    if (fnBodyStart === -1) continue;

    let braceCount = 0;
    let fnEnd = fnBodyStart;
    for (let i = fnBodyStart; i < rustSource.length; i++) {
      if (rustSource[i] === '{') braceCount++;
      if (rustSource[i] === '}') braceCount--;
      if (braceCount === 0) { fnEnd = i; break; }
    }

    const fnBody = rustSource.slice(fnBodyStart, fnEnd);

    // Check for validation patterns
    const hasValidation =
      fnBody.includes('if ') ||
      fnBody.includes('match ') ||
      fnBody.includes('.ok_or') ||
      fnBody.includes('.ok_or_else') ||
      fnBody.includes('return Err') ||
      fnBody.includes('Result::Err');

    if (!hasValidation && fnBody.length > 50) {
      findings.push({
        severity: 'low',
        category: 'missing-validation',
        file: fileName,
        line: fnStart,
        message: `NAPI function "${fnName}" has no visible input validation`,
        recommendation: 'Add input validation for all NAPI function parameters',
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Rust source security scanner
// ---------------------------------------------------------------------------

/**
 * Scans a Rust source file for security issues.
 */
export function scanRustSource(
  source: string,
  fileName: string,
  config: SandboxConfig = DEFAULT_SANDBOX_CONFIG,
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of SECURITY_PATTERNS) {
      pattern.pattern.lastIndex = 0;
      const match = pattern.pattern.exec(line);
      if (match) {
        // Skip if category is allowed by config
        if (pattern.category === 'subprocess' && config.allowSubprocess) continue;
        if ((pattern.category === 'unsafe' || pattern.category === 'unsafe-block') && config.allowUnsafe) continue;

        findings.push({
          severity: pattern.severity,
          category: pattern.category,
          file: fileName,
          line: i + 1,
          message: pattern.message,
          recommendation: pattern.recommendation,
          cwe: pattern.cwe,
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// File system sandbox
// ---------------------------------------------------------------------------

/**
 * Validates that a file path is within the allowed sandbox paths.
 */
export function validatePath(
  path: string,
  config: SandboxConfig,
): { allowed: boolean; reason?: string } {
  if (config.allowedPaths.length === 0) {
    return { allowed: true };
  }

  const normalized = path.replace(/\\/g, '/');

  for (const allowed of config.allowedPaths) {
    const normalizedAllowed = allowed.replace(/\\/g, '/');
    if (normalized.startsWith(normalizedAllowed)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `Path "${path}" is outside allowed sandbox paths`,
  };
}

/**
 * Validates that a host is in the allowed network hosts list.
 */
export function validateHost(
  host: string,
  config: SandboxConfig,
): { allowed: boolean; reason?: string } {
  if (config.allowedHosts.length === 0) {
    return { allowed: true };
  }

  const normalizedHost = host.toLowerCase().replace(/^https?:\/\//, '').split(':')[0];

  for (const allowed of config.allowedHosts) {
    const normalizedAllowed = allowed.toLowerCase().replace(/^https?:\/\//, '').split(':')[0];
    if (normalizedHost === normalizedAllowed || normalizedHost.endsWith('.' + normalizedAllowed)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `Host "${host}" is not in allowed network hosts`,
  };
}

// ---------------------------------------------------------------------------
// Full project security audit
// ---------------------------------------------------------------------------

/**
 * Runs a full security audit on a PledgeStack project.
 * Scans all .psx, .ps, and generated Rust source files.
 */
export function auditProjectSecurity(
  projectRoot: string,
  config: SandboxConfig = DEFAULT_SANDBOX_CONFIG,
): SecurityReport {
  const findings: SecurityFinding[] = [];
  let filesScanned = 0;

  // Scan .psx and .ps files
  const appDir = join(projectRoot, 'app');
  if (existsSync(appDir)) {
    scanDirectory(appDir, projectRoot, findings, config, ref => { filesScanned = ref; }, filesScanned);
  }

  // Scan generated Rust source in .pledge directory
  const pledgeDir = join(projectRoot, '.pledge');
  if (existsSync(pledgeDir)) {
    scanDirectory(pledgeDir, projectRoot, findings, config, ref => { filesScanned = ref; }, filesScanned);
  }

  // Scan native directory
  const nativeDir = join(projectRoot, 'packages', 'core', 'native');
  if (existsSync(nativeDir)) {
    scanDirectory(nativeDir, projectRoot, findings, config, ref => { filesScanned = ref; }, filesScanned);
  }

  // Build summary
  const summary: SecuritySummary = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    info: findings.filter(f => f.severity === 'info').length,
    total: findings.length,
    filesScanned,
    passed: findings.filter(f => f.severity === 'critical' || f.severity === 'high').length === 0,
  };

  return {
    findings,
    summary,
    timestamp: new Date().toISOString(),
    projectRoot,
  };
}

function scanDirectory(
  dir: string,
  projectRoot: string,
  findings: SecurityFinding[],
  config: SandboxConfig,
  setCount: (n: number) => void,
  count: number,
): void {
  let fileCount = count;
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(projectRoot, fullPath);

    if (entry.isDirectory()) {
      scanDirectory(fullPath, projectRoot, findings, config, setCount, fileCount);
    } else if (entry.name.endsWith('.psx') || entry.name.endsWith('.ps') || entry.name.endsWith('.rs')) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const fileFindings = scanRustSource(content, relPath, config);
        findings.push(...fileFindings);
        fileCount++;
      } catch {
        // Skip unreadable files
      }
    }
  }
  setCount(fileCount);
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

/**
 * Formats a security report as a human-readable string.
 */
export function formatSecurityReport(report: SecurityReport): string {
  const lines: string[] = [
    '\n=== Security Audit Report ===\n',
    `Files scanned: ${report.summary.filesScanned}`,
    `Findings: ${report.summary.total} (${report.summary.critical} critical, ${report.summary.high} high, ${report.summary.medium} medium, ${report.summary.low} low, ${report.summary.info} info)\n`,
  ];

  if (report.findings.length === 0) {
    lines.push(`${green('✓')} No security issues found!`);
    return lines.join('\n');
  }

  // Group by severity
  const severities: SecurityFinding['severity'][] = ['critical', 'high', 'medium', 'low', 'info'];
  for (const severity of severities) {
    const sevFindings = report.findings.filter(f => f.severity === severity);
    if (sevFindings.length === 0) continue;

    const icon = severity === 'critical' ? red('✗') : severity === 'high' ? red('✗') : severity === 'medium' ? yellow('⚠') : blue('ℹ');
    lines.push(`\n${icon} ${severity.toUpperCase()} (${sevFindings.length}):`);

    for (const finding of sevFindings) {
      lines.push(`  [${finding.category}] ${finding.file}:${finding.line}`);
      lines.push(`    ${finding.message}`);
      lines.push(`    ${dim('Fix: ' + finding.recommendation)}`);
      if (finding.cwe) {
        lines.push(`    ${dim('CWE: ' + finding.cwe)}`);
      }
    }
  }

  lines.push('');
  if (report.summary.passed) {
    lines.push(`${green('✓')} Security audit passed (no critical/high issues)`);
  } else {
    lines.push(`${red('✗')} Security audit FAILED — ${report.summary.critical + report.summary.high} critical/high issue(s) must be fixed`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI integration: pledge doctor --security
// ---------------------------------------------------------------------------

/**
 * Runs security audit and returns findings as diagnostics.
 */
export function runSecurityAudit(
  projectRoot: string,
  config?: Partial<SandboxConfig>,
): { report: SecurityReport; passed: boolean } {
  const fullConfig = { ...DEFAULT_SANDBOX_CONFIG, ...config };
  const report = auditProjectSecurity(projectRoot, fullConfig);
  return { report, passed: report.summary.passed };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function red(s: string): string { return `\x1b[31m${s}\x1b[0m`; }
function green(s: string): string { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s: string): string { return `\x1b[33m${s}\x1b[0m`; }
function blue(s: string): string { return `\x1b[34m${s}\x1b[0m`; }
function dim(s: string): string { return `\x1b[2m${s}\x1b[0m`; }
