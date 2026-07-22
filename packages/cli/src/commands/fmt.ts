/**
 * `pledge fmt` — Format Rust code in .psx/.ps files using rustfmt.
 *
 * Goal #220: Runs `cargo fmt` on all .ps/.psx Rust blocks, ensuring
 * consistent formatting across the project. Supports `--check` for CI.
 *
 * Usage:
 *   pledge fmt              Format all .psx/.ps files
 *   pledge fmt --check      Check if files need formatting (CI mode)
 *   pledge fmt app/users    Format only files in specific directory
 */

import { formatDirectory, checkFormatting } from 'pledgestack-core';

export interface FmtOptions {
  /** Check mode — don't modify files, just report which need formatting */
  check?: boolean;
  /** Specific directory to format (default: project root) */
  dir?: string;
  /** Rust edition (default: 2021) */
  edition?: string;
  /** Path to rustfmt.toml config file */
  configFile?: string;
}

export async function fmtCommand(opts: FmtOptions): Promise<void> {
  const rootDir = opts.dir ?? process.cwd();

  if (opts.check) {
    // CI mode — check without modifying
    const needsFormat = await checkFormatting(rootDir, {
      edition: opts.edition,
      configFile: opts.configFile,
    });

    if (needsFormat.length === 0) {
      console.log('All .psx/.ps files are properly formatted.');
      return;
    }

    console.error('The following files need formatting:');
    for (const result of needsFormat) {
      console.error(`  ${result.file}`);
    }
    console.error(`\nRun \`pledge fmt\` to fix.`);
    process.exit(1);
  }

  // Format mode
  const results = await formatDirectory(rootDir, {
    edition: opts.edition,
    configFile: opts.configFile,
  });

  const changed = results.filter((r) => r.changed);
  const errors = results.filter((r) => r.error);

  if (changed.length === 0 && errors.length === 0) {
    console.log('All .psx/.ps files are already properly formatted.');
    return;
  }

  for (const result of changed) {
    const blocks = result.blocksFormatted ? ` (${result.blocksFormatted} block${result.blocksFormatted > 1 ? 's' : ''})` : '';
    console.log(`  formatted  ${result.file}${blocks}`);
  }

  for (const result of errors) {
    console.error(`  error      ${result.file}: ${result.error}`);
  }

  console.log(`\nFormatted ${changed.length} file${changed.length !== 1 ? 's' : ''}.`);
  if (errors.length > 0) {
    console.error(`${errors.length} error${errors.length !== 1 ? 's' : ''}.`);
  }
}
