import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { scanAppDir, resolveRoutes } from 'pledgestack-core';
import type { PledgeConfig, ResolvedRoute } from 'pledgestack-shared';

interface Diagnostic {
  level: 'error' | 'warning' | 'info' | 'ok';
  category: string;
  message: string;
  fix?: string;
}

/**
 * pledgestack doctor — Diagnoses and reports common PledgeStack project issues.
 */
export async function doctorCommand(config: PledgeConfig): Promise<void> {
  const diagnostics: Diagnostic[] = [];

  // Check config file
  checkConfigFile(config, diagnostics);

  // Check app directory
  checkAppDir(config, diagnostics);

  // Check routes
  await checkRoutes(config, diagnostics);

  // Check TypeScript config
  checkTsConfig(config, diagnostics);

  // Check package.json
  checkPackageJson(config, diagnostics);

  // Check public directory
  checkPublicDir(config, diagnostics);

  // Check environment files
  checkEnvFiles(config, diagnostics);

  // Check build output
  checkBuildOutput(config, diagnostics);

  // Check dependencies
  checkDependencies(config, diagnostics);

  // Print results
  printDiagnostics(diagnostics);

  const errors = diagnostics.filter((d) => d.level === 'error');
  const warnings = diagnostics.filter((d) => d.level === 'warning');

  if (errors.length > 0) {
    console.log(`\n${red('✗')} ${errors.length} error(s) found`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`\n${yellow('⚠')} ${warnings.length} warning(s) found`);
  } else {
    console.log(`\n${green('✓')} All checks passed!`);
  }
}

function checkConfigFile(config: PledgeConfig, diags: Diagnostic[]): void {
  const configPaths = [
    join(config.rootDir, 'pledge.config.ts'),
    join(config.rootDir, 'pledge.config.js'),
    join(config.rootDir, 'pledge.config.mjs'),
  ];

  const found = configPaths.find((p) => existsSync(p));
  if (found) {
    diags.push({ level: 'ok', category: 'Config', message: `Found config: ${found}` });
  } else {
    diags.push({
      level: 'info',
      category: 'Config',
      message: 'No pledge.config.ts found — using defaults',
    });
  }
}

function checkAppDir(config: PledgeConfig, diags: Diagnostic[]): void {
  const appPath = join(config.rootDir, config.appDir);
  if (!existsSync(appPath)) {
    diags.push({
      level: 'error',
      category: 'App Dir',
      message: `App directory not found: ${appPath}`,
      fix: `Create the directory: mkdir -p ${config.appDir}`,
    });
    return;
  }

  const stat = statSync(appPath);
  if (!stat.isDirectory()) {
    diags.push({
      level: 'error',
      category: 'App Dir',
      message: `App path is not a directory: ${appPath}`,
    });
    return;
  }

  diags.push({ level: 'ok', category: 'App Dir', message: `App directory exists: ${appPath}` });
}

async function checkRoutes(config: PledgeConfig, diags: Diagnostic[]): Promise<void> {
  try {
    const appPath = join(config.rootDir, config.appDir);
    if (!existsSync(appPath)) return;

    const files = await scanAppDir(appPath);
    const routes = resolveRoutes(files, config);

    diags.push({ level: 'ok', category: 'Routes', message: `Found ${routes.length} route(s)` });

    // Check for root page
    const rootPage = routes.find((r: ResolvedRoute) => r.pattern === '/' || r.pattern === '');
    if (!rootPage) {
      diags.push({
        level: 'warning',
        category: 'Routes',
        message: 'No root page (app/page.tsx) found',
        fix: 'Create app/page.tsx for the home page',
      });
    }

    // Check for root layout
    const rootLayout = routes.find((r: ResolvedRoute) => r.isLayout && (r.pattern === '/' || r.pattern === ''));
    if (!rootLayout) {
      diags.push({
        level: 'warning',
        category: 'Routes',
        message: 'No root layout (app/layout.tsx) found',
        fix: 'Create app/layout.tsx for the root layout',
      });
    }

    // Check for not-found
    const notFound = routes.find((r: ResolvedRoute) => r.isNotFound);
    if (!notFound) {
      diags.push({
        level: 'info',
        category: 'Routes',
        message: 'No not-found.tsx found — default 404 will be used',
      });
    }
  } catch (err) {
    diags.push({
      level: 'error',
      category: 'Routes',
      message: `Failed to scan routes: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

function checkTsConfig(config: PledgeConfig, diags: Diagnostic[]): void {
  const tsconfigPath = join(config.rootDir, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    diags.push({
      level: 'warning',
      category: 'TypeScript',
      message: 'No tsconfig.json found',
      fix: 'Run: pledgestack create to scaffold a new project with tsconfig.json',
    });
    return;
  }

  diags.push({ level: 'ok', category: 'TypeScript', message: 'tsconfig.json found' });

  try {
    const content = readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(content);

    if (!tsconfig.compilerOptions?.jsx) {
      diags.push({
        level: 'warning',
        category: 'TypeScript',
        message: 'jsx option not set in tsconfig.json',
        fix: 'Set "compilerOptions.jsx": "react-jsx" in tsconfig.json',
      });
    }

    if (tsconfig.compilerOptions?.moduleResolution === 'bundler') {
      diags.push({
        level: 'info',
        category: 'TypeScript',
        message: 'moduleResolution is "bundler" — may cause issues with workspace packages',
      });
    }
  } catch {
    diags.push({
      level: 'error',
      category: 'TypeScript',
      message: 'Failed to parse tsconfig.json',
    });
  }
}

function checkPackageJson(config: PledgeConfig, diags: Diagnostic[]): void {
  const pkgPath = join(config.rootDir, 'package.json');
  if (!existsSync(pkgPath)) {
    diags.push({
      level: 'error',
      category: 'Package',
      message: 'No package.json found',
      fix: 'Run: npm init -y',
    });
    return;
  }

  diags.push({ level: 'ok', category: 'Package', message: 'package.json found' });

  try {
    const content = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);

    const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    if (!allDeps['pledgestack-core']) {
      diags.push({
        level: 'error',
        category: 'Package',
        message: 'pledgestack-core not in dependencies',
        fix: 'Run: pnpm add pledgestack-core',
      });
    }

    if (!allDeps['react'] || !allDeps['react-dom']) {
      diags.push({
        level: 'error',
        category: 'Package',
        message: 'react/react-dom not in dependencies',
        fix: 'Run: pnpm add react react-dom',
      });
    }

    if (!allDeps['typescript']) {
      diags.push({
        level: 'warning',
        category: 'Package',
        message: 'typescript not in devDependencies',
      });
    }
  } catch {
    diags.push({
      level: 'error',
      category: 'Package',
      message: 'Failed to parse package.json',
    });
  }
}

function checkPublicDir(config: PledgeConfig, diags: Diagnostic[]): void {
  const publicPath = join(config.rootDir, config.publicDir);
  if (existsSync(publicPath)) {
    diags.push({ level: 'ok', category: 'Public', message: `Public directory exists: ${publicPath}` });
  } else {
    diags.push({
      level: 'info',
      category: 'Public',
      message: `No public directory found at ${publicPath}`,
    });
  }
}

function checkEnvFiles(config: PledgeConfig, diags: Diagnostic[]): void {
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
  const found = envFiles.filter((f) => existsSync(join(config.rootDir, f)));

  if (found.length > 0) {
    diags.push({ level: 'ok', category: 'Env', message: `Found env files: ${found.join(', ')}` });

    // Check for PLEDGE_PUBLIC_ prefix usage
    for (const f of found) {
      const content = readFileSync(join(config.rootDir, f), 'utf-8');
      if (content.includes('PLEDGE_PUBLIC_')) {
        diags.push({
          level: 'ok',
          category: 'Env',
          message: `Found PLEDGE_PUBLIC_ variables in ${f}`,
        });
      }
    }
  } else {
    diags.push({
      level: 'info',
      category: 'Env',
      message: 'No .env files found',
    });
  }
}

function checkBuildOutput(config: PledgeConfig, diags: Diagnostic[]): void {
  const outPath = join(config.rootDir, config.outDir);
  if (existsSync(outPath)) {
    diags.push({ level: 'ok', category: 'Build', message: `Build output exists: ${outPath}` });
  } else {
    diags.push({
      level: 'info',
      category: 'Build',
      message: `No build output found at ${outPath} — run: pledge build`,
    });
  }
}

function checkDependencies(config: PledgeConfig, diags: Diagnostic[]): void {
  // Check for conflicting frameworks
  const pkgPath = join(config.rootDir, 'package.json');
  if (!existsSync(pkgPath)) return;

  try {
    const content = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    const conflicts = ['next', 'nuxt', '@remix-run/react', '@sveltejs/kit', 'astro'];
    for (const conflict of conflicts) {
      if (allDeps[conflict]) {
        diags.push({
          level: 'warning',
          category: 'Conflicts',
          message: `Found "${conflict}" in dependencies — may conflict with PledgeStack`,
          fix: `Remove ${conflict} from package.json`,
        });
      }
    }
  } catch {
    // Already reported in checkPackageJson
  }
}

function printDiagnostics(diags: Diagnostic[]): void {
  console.log(bold('\n=== PledgeStack Doctor ===\n'));

  const categories = new Set(diags.map((d) => d.category));
  for (const category of categories) {
    const catDiags = diags.filter((d) => d.category === category);
    console.log(bold(`\n[${category}]`));
    for (const d of catDiags) {
      const icon = d.level === 'error' ? red('✗') : d.level === 'warning' ? yellow('⚠') : d.level === 'ok' ? green('✓') : blue('ℹ');
      console.log(`  ${icon} ${d.message}`);
      if (d.fix) {
        console.log(`    ${dim('Fix:')} ${d.fix}`);
      }
    }
  }
}

function red(s: string): string {
  return `\x1b[31m${s}\x1b[0m`;
}
function green(s: string): string {
  return `\x1b[32m${s}\x1b[0m`;
}
function yellow(s: string): string {
  return `\x1b[33m${s}\x1b[0m`;
}
function blue(s: string): string {
  return `\x1b[34m${s}\x1b[0m`;
}
function bold(s: string): string {
  return `\x1b[1m${s}\x1b[0m`;
}
function dim(s: string): string {
  return `\x1b[2m${s}\x1b[0m`;
}
