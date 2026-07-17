/**
 * Bundle size budget enforcement.
 * Item 72 of the PledgeStack roadmap.
 *
 * This script checks built bundle sizes against configured limits.
 * Run after build: node scripts/check-bundle-size.js
 */

import { existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

interface BundleBudget {
  path: string;
  maxSizeKb: number;
}

const DEFAULT_BUDGETS: BundleBudget[] = [
  { path: 'packages/core/dist', maxSizeKb: 100 },
  { path: 'packages/client/dist', maxSizeKb: 150 },
  { path: 'packages/server/dist', maxSizeKb: 200 },
  { path: 'packages/shared/dist', maxSizeKb: 50 },
  { path: 'packages/adapters/dist', maxSizeKb: 100 },
];

function getDirSize(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(fullPath);
    } else if (extname(entry.name) === '.js' || extname(entry.name) === '.mjs') {
      total += statSync(fullPath).size;
    }
  }
  return total;
}

function checkBudgets(budgets: BundleBudget[] = DEFAULT_BUDGETS): boolean {
  let passed = true;
  const rootDir = process.cwd();

  for (const budget of budgets) {
    const fullPath = join(rootDir, budget.path);
    const sizeBytes = getDirSize(fullPath);
    const sizeKb = Math.round(sizeBytes / 1024);

    if (sizeKb > budget.maxSizeKb) {
      console.error(`✗ ${budget.path}: ${sizeKb}KB exceeds limit ${budget.maxSizeKb}KB`);
      passed = false;
    } else {
      console.log(`✓ ${budget.path}: ${sizeKb}KB / ${budget.maxSizeKb}KB`);
    }
  }

  return passed;
}

if (require.main === module) {
  const passed = checkBudgets();
  if (!passed) {
    console.error('\nBundle size budget exceeded!');
    process.exit(1);
  }
  console.log('\nAll bundle sizes within budget.');
}

export { checkBudgets, DEFAULT_BUDGETS };
