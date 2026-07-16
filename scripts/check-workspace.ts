#!/usr/bin/env node
/**
 * Workspace validation — ensures all packages have consistent configs.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface PackageInfo {
  name: string;
  version: string;
  hasTsConfig: boolean;
  hasReadme: boolean;
  dependencies: string[];
}

function readPackage(dir: string): PackageInfo | null {
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  return {
    name: pkg.name,
    version: pkg.version,
    hasTsConfig: existsSync(join(dir, 'tsconfig.json')),
    hasReadme: existsSync(join(dir, 'README.md')),
    dependencies: Object.keys(pkg.dependencies ?? {}),
  };
}

function main() {
  const packagesDir = join(process.cwd(), 'packages');
  const dirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(packagesDir, d.name));

  const packages = dirs.map(readPackage).filter(Boolean) as PackageInfo[];

  let errors = 0;

  console.log('Package                          Version    tsconfig  README');
  console.log('─────────────────────────────────────────────────────────────');

  for (const pkg of packages) {
    const tsCheck = pkg.hasTsConfig ? '✓' : '✗';
    const readmeCheck = pkg.hasReadme ? '✓' : '✗';
    console.log(`${pkg.name.padEnd(32)} ${pkg.version.padEnd(10)} ${tsCheck.padEnd(9)} ${readmeCheck}`);

    if (!pkg.hasTsConfig) {
      console.error(`  ERROR: ${pkg.name} missing tsconfig.json`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} error(s) found`);
    process.exit(1);
  } else {
    console.log('\nAll packages OK');
  }
}

main();
