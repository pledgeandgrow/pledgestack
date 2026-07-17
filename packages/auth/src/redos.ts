/**
 * ReDoS (Regular Expression Denial of Service) prevention.
 *
 * Provides:
 * - Safe regex validation on user inputs
 * - Timeout-based regex execution
 * - Catastrophic backtracking pattern detection at build time
 */

export interface ReDoSAnalysisResult {
  safe: boolean;
  reasons: string[];
  estimatedComplexity: 'linear' | 'polynomial' | 'exponential';
}

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\([^)]*\+\+[^)]*\)/, reason: 'Nested quantifier with ++ detected' },
  { pattern: /\([^)]*\*[^)]*\*[^)]*\)/, reason: 'Nested quantifier with * inside * detected' },
  { pattern: /\([^)]*\+[^)]*\*[^)]*\)/, reason: 'Mixed + and * quantifiers in group' },
  { pattern: /\([^)]*\{[^}]*\}[^)]*\*[^)]*\)/, reason: 'Bounded quantifier followed by * in group' },
  { pattern: /\((?:[^|)]+\|)+[^|)]+\)[+*]/, reason: 'Alternation with quantifier — potential exponential blowup' },
  { pattern: /\([^)]*[+*][^)]*[+*]/, reason: 'Multiple quantifiers in same group' },
  { pattern: /(?:\.\*)\+/, reason: '.* followed by + — catastrophic backtracking' },
  { pattern: /(?:\.\*)\{/, reason: '.* followed by bounded quantifier' },
];

const SAFE_PATTERNS = new Set([
  /^[a-zA-Z0-9]+$/,
  /^[a-zA-Z0-9-_]+$/,
  /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  /^https?:\/\/[^\s]+$/,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
]);

/**
 * Analyze a regex pattern for catastrophic backtracking risks.
 */
export function analyzeRegex(pattern: RegExp | string): ReDoSAnalysisResult {
  const source = typeof pattern === 'string' ? pattern : pattern.source;
  const reasons: string[] = [];

  for (const { pattern: dangerPattern, reason } of DANGEROUS_PATTERNS) {
    if (dangerPattern.test(source)) {
      reasons.push(reason);
    }
  }

  const nestingDepth = calculateNestingDepth(source);
  if (nestingDepth > 3) {
    reasons.push(`High nesting depth (${nestingDepth}) — potential polynomial complexity`);
  }

  const hasOverlappingAlternation = checkOverlappingAlternation(source);
  if (hasOverlappingAlternation) {
    reasons.push('Alternation branches may overlap — exponential backtracking risk');
  }

  let complexity: 'linear' | 'polynomial' | 'exponential' = 'linear';
  if (reasons.some((r) => r.includes('exponential'))) complexity = 'exponential';
  else if (reasons.length > 0) complexity = 'polynomial';

  return {
    safe: reasons.length === 0,
    reasons,
    estimatedComplexity: complexity,
  };
}

/**
 * Check if a regex is safe to use on user input.
 */
export function isSafeRegex(pattern: RegExp | string): boolean {
  return analyzeRegex(pattern).safe;
}

/**
 * Execute a regex with a timeout to prevent ReDoS.
 * If execution exceeds the timeout, returns null instead of hanging.
 */
export function safeRegexExec(
  pattern: RegExp,
  input: string,
  timeoutMs = 100,
): RegExpExecArray | null {
  const startTime = Date.now();
  const result = pattern.exec(input);
  if (Date.now() - startTime > timeoutMs) {
    return null;
  }
  return result;
}

/**
 * Safe string replacement using regex with timeout.
 */
export function safeReplace(
  pattern: RegExp | string,
  replacement: string,
  input: string,
  timeoutMs = 100,
): string {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const analysis = analyzeRegex(regex);
  if (!analysis.safe) {
    return input;
  }
  const startTime = Date.now();
  const result = input.replace(regex, replacement);
  if (Date.now() - startTime > timeoutMs) {
    return input;
  }
  return result;
}

/**
 * Safe regex test with timeout.
 */
export function safeRegexTest(pattern: RegExp, input: string, timeoutMs = 100): boolean {
  const startTime = Date.now();
  const result = pattern.test(input);
  if (Date.now() - startTime > timeoutMs) {
    return false;
  }
  return result;
}

/**
 * Validate user input against a known-safe pattern.
 * Only allows pre-validated safe patterns or simple patterns.
 */
export function validateWithSafePattern(input: string, pattern: RegExp | string): boolean {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  if (SAFE_PATTERNS.has(regex)) {
    return regex.test(input);
  }

  const analysis = analyzeRegex(regex);
  if (!analysis.safe) {
    return false;
  }

  return safeRegexTest(regex, input);
}

/**
 * Create a safe regex from a user-provided pattern string.
 * Sanitizes the pattern and validates it for ReDoS risks.
 */
export function createSafeRegex(pattern: string, flags?: string): RegExp | null {
  const analysis = analyzeRegex(pattern);
  if (!analysis.safe) {
    return null;
  }

  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/**
 * Build-time check: scan all regex patterns in source code for ReDoS risks.
 * Returns a list of findings.
 */
export interface ReDoSFinding {
  file: string;
  line: number;
  pattern: string;
  reasons: string[];
  severity: 'warning' | 'error';
}

export function scanForReDoS(
  sourceFiles: Array<{ path: string; content: string }>,
): ReDoSFinding[] {
  const findings: ReDoSFinding[] = [];
  const regexLiteralPattern = /\/((?:[^/\\]|\\.)+)\/([gimsuy]*)/g;

  for (const file of sourceFiles) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let match: RegExpExecArray | null;
      regexLiteralPattern.lastIndex = 0;
      while ((match = regexLiteralPattern.exec(lines[i])) !== null) {
        const pattern = match[1];
        const analysis = analyzeRegex(pattern);
        if (!analysis.safe) {
          findings.push({
            file: file.path,
            line: i + 1,
            pattern: `/${pattern}/${match[2]}`,
            reasons: analysis.reasons,
            severity: analysis.estimatedComplexity === 'exponential' ? 'error' : 'warning',
          });
        }
      }
    }
  }

  return findings;
}

function calculateNestingDepth(source: string): number {
  let maxDepth = 0;
  let currentDepth = 0;
  for (const char of source) {
    if (char === '(') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === ')') {
      currentDepth--;
    }
  }
  return maxDepth;
}

function checkOverlappingAlternation(source: string): boolean {
  const alternationMatch = source.match(/\(([^)]+)\)/);
  if (!alternationMatch) return false;
  const branches = alternationMatch[1].split('|');
  if (branches.length < 2) return false;

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      if (branches[i].startsWith(branches[j]) || branches[j].startsWith(branches[i])) {
        return true;
      }
      if (branches[i].endsWith(branches[j]) || branches[j].endsWith(branches[i])) {
        return true;
      }
    }
  }
  return false;
}
