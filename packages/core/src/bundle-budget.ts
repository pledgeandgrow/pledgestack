/**
 * Bundle size budget enforcement.
 *
 * Provides:
 * - Per-route bundle size limits
 * - CI build failure when budgets exceeded
 * - Import splitting suggestions
 * - Budget configuration and reporting
 */

export interface RouteBudget {
  /** Route path pattern */
  route: string;
  /** Max JS size in KB */
  maxJsSize?: number;
  /** Max CSS size in KB */
  maxCssSize?: number;
  /** Max total size in KB */
  maxTotalSize?: number;
  /** Max initial JS size in KB (first load) */
  maxInitialJsSize?: number;
}

export interface BudgetConfig {
  /** Global default budgets */
  defaults?: {
    maxJsSize?: number;
    maxCssSize?: number;
    maxTotalSize?: number;
    maxInitialJsSize?: number;
  };
  /** Per-route budgets */
  routes?: RouteBudget[];
  /** Whether to fail the build on budget exceeded */
  failOnExceeded?: boolean;
  /** Warning threshold (percentage of budget, default: 80) */
  warningThreshold?: number;
}

export interface RouteMeasurement {
  route: string;
  jsSize: number;
  cssSize: number;
  totalSize: number;
  initialJsSize: number;
  chunks: Array<{ name: string; size: number; type: 'js' | 'css' }>;
}

export interface BudgetResult {
  route: string;
  passed: boolean;
  warnings: string[];
  errors: string[];
  measurements: RouteMeasurement;
  budget: RouteBudget;
  suggestions: string[];
}

const DEFAULT_WARNING_THRESHOLD = 80;

const DEFAULT_BUDGETS = {
  maxJsSize: 250,
  maxCssSize: 50,
  maxTotalSize: 300,
  maxInitialJsSize: 150,
};

/**
 * Check route measurements against configured budgets.
 */
export function checkBudgets(
  measurements: RouteMeasurement[],
  config: BudgetConfig,
): BudgetResult[] {
  const results: BudgetResult[] = [];
  const warningThreshold = config.warningThreshold ?? DEFAULT_WARNING_THRESHOLD;
  const defaults = { ...DEFAULT_BUDGETS, ...config.defaults };

  for (const measurement of measurements) {
    const routeBudget = config.routes?.find((r) => matchRoute(r.route, measurement.route));
    const budget: RouteBudget = {
      route: measurement.route,
      maxJsSize: routeBudget?.maxJsSize ?? defaults.maxJsSize,
      maxCssSize: routeBudget?.maxCssSize ?? defaults.maxCssSize,
      maxTotalSize: routeBudget?.maxTotalSize ?? defaults.maxTotalSize,
      maxInitialJsSize: routeBudget?.maxInitialJsSize ?? defaults.maxInitialJsSize,
    };

    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    checkThreshold('JS', measurement.jsSize, budget.maxJsSize!, warningThreshold, warnings, errors);
    checkThreshold('CSS', measurement.cssSize, budget.maxCssSize!, warningThreshold, warnings, errors);
    checkThreshold('Total', measurement.totalSize, budget.maxTotalSize!, warningThreshold, warnings, errors);
    checkThreshold('Initial JS', measurement.initialJsSize, budget.maxInitialJsSize!, warningThreshold, warnings, errors);

    if (measurement.jsSize > budget.maxJsSize!) {
      suggestions.push(...suggestSplits(measurement));
    }

    results.push({
      route: measurement.route,
      passed: errors.length === 0,
      warnings,
      errors,
      measurements: measurement,
      budget,
      suggestions,
    });
  }

  return results;
}

/**
 * Generate a budget report from results.
 */
export function generateReport(results: BudgetResult[]): string {
  const lines: string[] = ['## Bundle Size Budget Report\n'];

  for (const result of results) {
    const status = result.passed ? '✓' : '✗';
    lines.push(`### ${status} ${result.route}`);
    lines.push(`| Metric | Size | Budget | Status |`);
    lines.push(`|--------|------|--------|--------|`);
    lines.push(`| JS | ${formatSize(result.measurements.jsSize)} | ${formatSize(result.budget.maxJsSize!)} | ${result.measurements.jsSize <= result.budget.maxJsSize! ? '✓' : '✗'} |`);
    lines.push(`| CSS | ${formatSize(result.measurements.cssSize)} | ${formatSize(result.budget.maxCssSize!)} | ${result.measurements.cssSize <= result.budget.maxCssSize! ? '✓' : '✗'} |`);
    lines.push(`| Total | ${formatSize(result.measurements.totalSize)} | ${formatSize(result.budget.maxTotalSize!)} | ${result.measurements.totalSize <= result.budget.maxTotalSize! ? '✓' : '✗'} |`);
    lines.push(`| Initial JS | ${formatSize(result.measurements.initialJsSize)} | ${formatSize(result.budget.maxInitialJsSize!)} | ${result.measurements.initialJsSize <= result.budget.maxInitialJsSize! ? '✓' : '✗'} |`);

    if (result.warnings.length > 0) {
      lines.push(`\n**Warnings:**`);
      for (const w of result.warnings) lines.push(`- ${w}`);
    }
    if (result.errors.length > 0) {
      lines.push(`\n**Errors:**`);
      for (const e of result.errors) lines.push(`- ${e}`);
    }
    if (result.suggestions.length > 0) {
      lines.push(`\n**Suggestions:**`);
      for (const s of result.suggestions) lines.push(`- ${s}`);
    }
    lines.push('');
  }

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    lines.push(`\n**${failed.length} route(s) exceeded budget.**`);
  } else {
    lines.push(`\n**All routes within budget.**`);
  }

  return lines.join('\n');
}

/**
 * Check if any routes failed budget checks.
 */
export function hasFailures(results: BudgetResult[]): boolean {
  return results.some((r) => !r.passed);
}

function checkThreshold(
  name: string,
  actual: number,
  budget: number,
  warningThreshold: number,
  warnings: string[],
  errors: string[],
): void {
  const percentage = (actual / budget) * 100;
  if (actual > budget) {
    errors.push(`${name} size ${formatSize(actual)} exceeds budget ${formatSize(budget)} (${percentage.toFixed(0)}%)`);
  } else if (percentage >= warningThreshold) {
    warnings.push(`${name} size ${formatSize(actual)} is at ${percentage.toFixed(0)}% of budget ${formatSize(budget)}`);
  }
}

function suggestSplits(measurement: RouteMeasurement): string[] {
  const suggestions: string[] = [];
  const largeChunks = measurement.chunks
    .filter((c) => c.type === 'js' && c.size > 50)
    .sort((a, b) => b.size - a.size);

  for (const chunk of largeChunks.slice(0, 3)) {
    if (chunk.name.includes('vendor')) {
      suggestions.push(`Split vendor chunk "${chunk.name}" (${formatSize(chunk.size)}) — consider splitting node_modules into separate vendor chunks`);
    } else if (chunk.name.includes('icon') || chunk.name.includes('Icon')) {
      suggestions.push(`Tree-shake icon imports in "${chunk.name}" (${formatSize(chunk.size)}) — import only needed icons instead of full icon library`);
    } else if (chunk.size > 100) {
      suggestions.push(`Lazy-load "${chunk.name}" (${formatSize(chunk.size)}) — use dynamic import() to defer loading until needed`);
    } else {
      suggestions.push(`Consider code-splitting "${chunk.name}" (${formatSize(chunk.size)}) — break into smaller chunks`);
    }
  }

  return suggestions;
}

function matchRoute(pattern: string, route: string): boolean {
  if (pattern === route) return true;
  const regex = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
  return new RegExp(`^${regex}$`).test(route);
}

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
