#!/usr/bin/env node
/** Minimal dependency-free structure checks for this distribution. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlan, REQUIRED_TASKS, VERSION } from '../skills/school-vibe-builder/scripts/harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = path.join(root, 'skills/school-vibe-builder');
const errors = [];
function check(condition, message) { if (!condition) errors.push(message); }
function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }

const required = [
  'README.md', 'START_HERE.md', 'AGENTS.md', 'LICENSE', 'SECURITY.md', 'CHANGELOG.md',
  'package.json', '.gitignore', '.gitattributes', 'scripts/install.mjs',
  'scripts/verify-package.mjs', 'tests/harness.test.mjs', 'docs/facilitator-guide.md',
  'docs/publishing-guide.md', 'docs/testing-report.md',
  'skills/school-vibe-builder/SKILL.md', 'skills/school-vibe-builder/agents/openai.yaml',
  'skills/school-vibe-builder/scripts/harness.mjs',
];
for (const relative of required) check(fs.existsSync(path.join(root, relative)), `Required file missing: ${relative}`);
const skillText = fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8');
check(skillText.startsWith('---\n'), 'SKILL.md front matter must begin at first line.');
const front = skillText.split('---\n')[1] ?? '';
check(/^name: school-vibe-builder$/m.test(front), 'Skill name must match folder.');
check(/^description: .+$/m.test(front), 'Skill description missing.');
check(skillText.split('\n').length < 500, 'SKILL.md should be under 500 lines.');
const yaml = fs.readFileSync(path.join(skill, 'agents/openai.yaml'), 'utf8');
check(/^interface:/m.test(yaml), 'Interface metadata missing.');
check(/default_prompt: .*\$school-vibe-builder/.test(yaml), 'Default prompt must invoke the skill.');
check(/allow_implicit_invocation: true/.test(yaml), 'Invocation policy missing.');
const metadata = JSON.parse(read('package.json'));
check(metadata.version === VERSION, 'Version mismatch.');
check(!metadata.dependencies && !metadata.devDependencies, 'Distribution must remain dependency-free.');
const plan = fs.readFileSync(path.join(skill, 'assets/templates/PLAN.md'), 'utf8');
check(JSON.stringify(parsePlan(plan).tasks.map((t) => t.id)) === JSON.stringify(REQUIRED_TASKS), 'PLAN template and required IDs differ.');
for (const profile of ['calendar', 'admissions', 'counseling', 'custom']) {
  const data = JSON.parse(fs.readFileSync(path.join(skill, 'assets/profiles', `${profile}.json`), 'utf8'));
  for (const key of ['GOAL', 'USERS', 'MVP', 'FIELDS', 'ACCESS_MATRIX', 'ACCEPTANCE']) check(Boolean(data[key]), `${profile} lacks ${key}`);
}
const files = [];
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const full = path.join(folder, entry.name);
    check(!entry.isSymbolicLink(), `Symlink found: ${path.relative(root, full)}`);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) files.push(full);
  }
}
walk(root);
for (const file of files.filter((f) => f.endsWith('.md'))) {
  const text = fs.readFileSync(file, 'utf8');
  check(!text.includes('\uFFFD'), `Invalid encoding marker: ${path.relative(root, file)}`);
  const fences = text.split('\n').filter((line) => line.trimStart().startsWith('```')).length;
  check(fences % 2 === 0, `Unbalanced code fence: ${path.relative(root, file)}`);
  for (const match of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const destination = path.resolve(path.dirname(file), target.split('#')[0]);
    check(fs.existsSync(destination), `Broken local link in ${path.relative(root, file)}: ${target}`);
  }
}
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${files.length} files; skill metadata, profiles, 29 task IDs, versions, local links, fences, UTF-8 basics.`);
  console.log('This is structural validation, not an end-to-end Codex/cloud test.');
}
