#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export * from '../../dive-builder/scripts/harness.mjs';
import { cli } from '../../dive-builder/scripts/harness.mjs';
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args[0] === 'init' && !args.includes('--mode')) args.push('--mode','webapp');
  try { process.exitCode = cli(args); }
  catch (e) { console.error(`ERROR: ${e.message}`); process.exitCode = 2; }
}
