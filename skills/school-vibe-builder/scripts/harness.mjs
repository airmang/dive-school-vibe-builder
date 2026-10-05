#!/usr/bin/env node
export * from '../../dive-builder/scripts/harness.mjs';
import { cli, isMain } from '../../dive-builder/scripts/harness.mjs';
if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === 'init' && !args.includes('--mode')) args.push('--mode','webapp');
  try { process.exitCode = cli(args); }
  catch (e) { console.error(`ERROR: ${e.message}`); process.exitCode = 2; }
}
