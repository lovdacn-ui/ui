#!/usr/bin/env node

/**
 * build-all-channels.cjs
 *
 * Compiles the lovdacn registry into BOTH target channels:
 * 1. Stable ('latest') channel: apps/v2/public/r
 * 2. Beta channel: apps/v2/public/r/beta
 *
 * Ensures normal components, preset tokens, styles, and blocks are always
 * up-to-date across both stable (default) and beta distributions.
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = __dirname;
const PKG_DIR = path.resolve(__dirname, '..');

function run(cmd, env = {}) {
  execSync(cmd, {
    cwd: PKG_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

console.log('=== 1/3 Generating Design System Tokens & Presets ===');
run('node scripts/generate-design-system.cjs');

console.log('\n=== 2/3 Building Stable Channel (apps/v2/public/r) ===');
run('node scripts/build-registry.cjs', { LOVDA_REGISTRY_CHANNEL: 'stable' });
run('node scripts/build-blocks.cjs', { LOVDA_REGISTRY_CHANNEL: 'stable' });
run('node scripts/build-extra-components.cjs', { LOVDA_REGISTRY_CHANNEL: 'stable' });

console.log('\n=== 3/3 Building Beta Channel (apps/v2/public/r/beta) ===');
run('node scripts/build-registry.cjs', { LOVDA_REGISTRY_CHANNEL: 'beta' });
run('node scripts/build-blocks.cjs', { LOVDA_REGISTRY_CHANNEL: 'beta' });
run('node scripts/build-extra-components.cjs', { LOVDA_REGISTRY_CHANNEL: 'beta' });

console.log('\n✔ Successfully built registry across both stable and beta channels!\n');
