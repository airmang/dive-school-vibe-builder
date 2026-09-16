#!/usr/bin/env node
/** Explicit, local-only skill installation. Existing installations are never replaced. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  assertSafePath, validateProjectRoot, parseArguments, rejectUnknown,
} from '../skills/school-vibe-builder/scripts/harness.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(REPO_ROOT, 'skills', 'school-vibe-builder');

function manifest(folder) {
  const entries = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error('스킬 원본에 심볼릭 링크가 있습니다. 설치를 중단합니다.');
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) entries.push(path.relative(folder, full));
      else throw new Error('일반 파일이 아닌 스킬 리소스가 있습니다.');
    }
  }
  walk(folder);
  return entries.sort();
}

export function installSkill({ project, user = false, dryRun = false, home = os.homedir() }) {
  if (Boolean(project) === Boolean(user)) throw new Error('--project <앱 폴더> 또는 --user 중 하나만 선택하세요.');
  const base = user ? assertSafePath(home) : validateProjectRoot(project);
  const destination = assertSafePath(path.join(base, '.agents', 'skills', 'school-vibe-builder'));
  if (fs.existsSync(destination)) throw new Error('이미 설치되어 있습니다. 덮어쓰지 않았습니다. 기존 폴더를 별도 백업·비교한 뒤 교체하세요.');
  assertSafePath(SOURCE);
  const files = manifest(SOURCE);
  if (!files.includes('SKILL.md')) throw new Error('원본 SKILL.md가 없습니다.');
  if (!dryRun) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    // Stage in the same filesystem, then rename into a new directory.
    const temporary = fs.mkdtempSync(path.join(path.dirname(destination), '.school-vibe-install-'));
    try {
      for (const relative of files) {
        const target = path.join(temporary, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(SOURCE, relative), target, fs.constants.COPYFILE_EXCL);
      }
      if (fs.existsSync(destination)) throw new Error('설치 중 대상이 생겨 중단했습니다.');
      fs.renameSync(temporary, destination);
    } catch (error) {
      fs.rmSync(temporary, { recursive: true, force: true });
      throw error;
    }
  }
  return {
    action: dryRun ? 'dry-run' : 'installed', scope: user ? 'user' : 'project',
    destination, files: files.length,
    note: '앱 폴더에서 Codex를 열고 $school-vibe-builder를 사용하세요. 보이지 않으면 /skills 확인 후 재시작하세요.',
  };
}

function cli(argv) {
  if (!argv.length || argv.includes('--help')) {
    console.log('node scripts/install.mjs --project "../my-class-app" [--dry-run]\nnode scripts/install.mjs --user [--dry-run]\n\n로컬 폴더만 복사합니다. 계정 연결·패키지 설치·설정 덮어쓰기는 하지 않습니다.');
    return;
  }
  const options = parseArguments(argv, new Set(['user', 'dry-run']));
  rejectUnknown(options, ['project', 'user', 'dry-run']);
  const result = installSkill({ project: options.project, user: options.user, dryRun: options['dry-run'] });
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { cli(process.argv.slice(2)); }
  catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 2; }
}
