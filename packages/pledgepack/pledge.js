#!/usr/bin/env node

// Pledgepack CLI entry point — delegates to the native Rust binary.

import { resolveBinary, runPledgepack } from './index.js';

const binary = resolveBinary();
if (!binary) {
  console.error('pledgepack: binary not found.');
  console.error('Run "cargo build --release" in the pledgepack package,');
  console.error('or install the platform-specific package for your system.');
  process.exit(1);
}

const args = process.argv.slice(2);
runPledgepack(args).catch((err) => {
  console.error(err);
  process.exit(1);
});
