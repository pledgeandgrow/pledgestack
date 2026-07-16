#!/usr/bin/env node

// Postinstall script for pledgestack-pledgepack
// Downloads or locates the native pledgepack binary for the current platform.

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const platform = process.platform;
const arch = process.arch;

const platformPackages = {
  'darwin': {
    'arm64': '@pledgepack/darwin-arm64',
    'x64': '@pledgepack/darwin-x64',
  },
  'linux': {
    'x64': '@pledgepack/linux-x64-gnu',
  },
  'win32': {
    'x64': '@pledgepack/win32-x64-msvc',
  },
};

const platformEntry = platformPackages[platform];
const packageName = platformEntry?.[arch];

if (!packageName) {
  console.warn(`[pledgepack] No prebuilt binary for ${platform}-${arch}. Building from source...`);
  process.exit(0);
}

// Check if local binary already exists (from cargo build)
const localBinary = join(__dirname, '..', 'bin', 'pledgepack');
const localExe = join(__dirname, '..', 'bin', 'pledgepack.exe');

if (existsSync(localBinary) || existsSync(localExe)) {
  console.log('[pledgepack] Using local binary.');
  process.exit(0);
}

// Try to require the platform-specific package
try {
  const pkgPath = require.resolve(packageName);
  console.log(`[pledgepack] Using ${packageName}`);
  process.exit(0);
} catch {
  console.warn(`[pledgepack] Platform package ${packageName} not installed.`);
  console.warn('[pledgepack] Run "cargo build --release" in the pledgepack package to build from source.');
  process.exit(0);
}
