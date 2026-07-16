#!/usr/bin/env node
/**
 * Release script — orchestrates version bumping and publishing.
 * Uses Changesets for version management.
 */
import { execSync } from 'node:child_process';

function run(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  const action = process.argv[2] ?? 'version';

  switch (action) {
    case 'version':
      run('pnpm changeset version');
      run('pnpm install');
      break;
    case 'publish':
      run('pnpm pledge build');
      run('pnpm changeset publish');
      break;
    case 'check':
      run('pnpm changeset status --since=main');
      break;
    default:
      console.error(`Unknown action: ${action}`);
      console.error('Usage: tsx scripts/release.ts [version|publish|check]');
      process.exit(1);
  }
}

main();
