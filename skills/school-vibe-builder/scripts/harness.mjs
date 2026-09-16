#!/usr/bin/env node
/** School Vibe Builder: dependency-free, local-only document helpers.
 * No shell execution, cloud calls, package installation, or automatic approvals.
 * A check result is a document/static preflight, not a security certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const VERSION = '0.1.0';
export const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REQUIRED_TASKS = Object.freeze([
  'P0.1', 'P0.2',
  'S1.1', 'S1.2', 'S1.3', 'S2.1', 'S2.2', 'S2.3',
  'S3.1', 'S3.2', 'S3.3', 'S4.1', 'S4.2', 'S4.3',
  'S5.1', 'S5.2', 'S5.3', 'S5.4',
  'S6.1', 'S6.2', 'S6.3', 'S7.1', 'S7.2', 'S7.3', 'S7.4',
  'S8.1', 'S8.2', 'S8.3', 'S8.4',
]);
const PROFILES = new Set(['calendar', 'admissions', 'counseling', 'custom']);
const MAX_TEXT_BYTES = 1024 * 1024;
const EXCLUDED_DIRS = new Set([
  '.git', '.agents', 'node_modules', '.next', '.vercel', 'dist', 'out',
  'build', 'coverage', 'playwright-report', 'test-results',
  'private-data', 'student-data', 'backups',
]);
const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.sql',
  '.md', '.txt', '.yml', '.yaml', '.html', '.css',
]);
const DISCLAIMER = '문서 형식·완료 근거 기입·일부 비밀 패턴만 검사했습니다. 실제 로그인/RLS/배포/개인정보 검토는 별도로 필요합니다.';

/** Refuse symlinks in all existing path components, including broken links. */
export function assertSafePath(value) {
  const absolute = path.resolve(value);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const component of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw new Error(`심볼릭 링크 경로에는 쓰거나 검사하지 않습니다: ${current}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return absolute;
}

export function validateProjectRoot(value) {
  if (!value || typeof value !== 'string') throw new Error('--project에 앱 폴더를 지정하세요.');
  const root = assertSafePath(value);
  if (root === path.parse(root).root || root === path.resolve(os.homedir())) {
    throw new Error('파일시스템/사용자 홈 루트가 아닌 별도 앱 폴더를 지정하세요.');
  }
  if (fs.existsSync(root) && !fs.statSync(root).isDirectory()) {
    throw new Error('앱 폴더 경로가 디렉터리가 아닙니다.');
  }
  // The distribution repository is not a learner's application repository.
  if (fs.existsSync(path.join(root, 'skills', 'school-vibe-builder', 'SKILL.md'))) {
    throw new Error('하네스 배포 저장소가 아닌 별도 앱 폴더를 지정하세요.');
  }
  return root;
}

function readText(file) {
  assertSafePath(file);
  if (fs.statSync(file).size > MAX_TEXT_BYTES) throw new Error(`문서가 너무 큽니다: ${path.basename(file)}`);
  return fs.readFileSync(file, 'utf8');
}

function render(template, values) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`알 수 없는 템플릿 항목: ${key}`);
    return values[key];
  });
}

/** Generate drafts only. Existing PROJECT/PLAN files cause a complete refusal. */
export function initializeProject({ project, name, profile = 'custom', dryRun = false }) {
  const root = validateProjectRoot(project);
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || /[\r\n\x00-\x1f]/.test(name)) {
    throw new Error('--name은 1~120자의 한 줄 앱 이름이어야 합니다.');
  }
  if (/[{}]/.test(name)) throw new Error('앱 이름에는 중괄호를 사용할 수 없습니다.');
  if (!PROFILES.has(profile)) throw new Error('profile은 calendar/admissions/counseling/custom 중 하나입니다.');
  const templates = path.join(SKILL_ROOT, 'assets', 'templates');
  const values = {
    ...JSON.parse(readText(path.join(SKILL_ROOT, 'assets', 'profiles', `${profile}.json`))),
    PROJECT_NAME: name.trim(), PROFILE: profile, TODAY: new Date().toISOString().slice(0, 10),
  };
  for (const file of ['PROJECT.md', 'PLAN.md']) {
    const target = assertSafePath(path.join(root, file));
    if (fs.existsSync(target)) throw new Error(`${file}이 이미 있습니다. 덮어쓰지 말고 이어서 작업하세요.`);
  }
  const writes = [];
  const preserved = [];
  const warnings = [];
  for (const file of ['AGENTS.md', 'PROJECT.md', 'PLAN.md', '.gitignore', '.env.example']) {
    let destination = file;
    const target = assertSafePath(path.join(root, file));
    if (fs.existsSync(target)) {
      if (file === 'AGENTS.md') {
        destination = 'AGENTS.school-vibe.proposed.md';
        warnings.push('기존 AGENTS.md를 보존했습니다. 제안 파일과 기존 규칙을 검토·병합하세요.');
      } else {
        preserved.push(file);
        warnings.push(`${file}을 보존했습니다. 제외 규칙/빈 환경변수 예시를 직접 대조하세요.`);
        continue;
      }
    }
    const output = assertSafePath(path.join(root, destination));
    if (fs.existsSync(output)) throw new Error(`${destination}이 이미 있어 안전하게 중단했습니다.`);
    writes.push([output, render(readText(path.join(templates, file)), values)]);
  }
  const created = [];
  if (!dryRun) {
    fs.mkdirSync(root, { recursive: true });
    try {
      for (const [file, text] of writes) {
        fs.writeFileSync(file, text, { encoding: 'utf8', flag: 'wx' });
        created.push(file);
      }
    } catch (error) {
      // Remove only the new files this invocation successfully created.
      for (const file of created.reverse()) fs.unlinkSync(file);
      throw error;
    }
  }
  return {
    action: dryRun ? 'dry-run' : 'initialized', project: root, profile,
    files: writes.map(([file]) => path.relative(root, file)), preserved, warnings,
    note: '초안만 생성했습니다. 합의 내용을 채우기 전에는 P0를 완료 처리하지 마세요.',
  };
}

export function parsePlan(text) {
  const tasks = [...text.matchAll(/^- \[([ x~!])\] \[([A-Z][A-Z0-9]*\.\d+)\] (.+)$/gm)]
    .map((m) => ({ state: m[1], id: m[2], title: m[3].trim() }));
  const evidence = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length === 4 && /^[A-Z][A-Z0-9]*\.\d+$/.test(cells[0])
      && ['PASS', 'MANUAL-PASS'].includes(cells[1])) {
      evidence.push({ id: cells[0], result: cells[1], detail: cells[2], time: cells[3] });
    }
  }
  return { tasks, evidence };
}

export function projectStatus(project) {
  const root = validateProjectRoot(project);
  const planPath = path.join(root, 'PLAN.md');
  if (!fs.existsSync(planPath)) throw new Error('PLAN.md가 없습니다. 먼저 인터뷰와 계획 생성을 진행하세요.');
  const { tasks } = parsePlan(readText(planPath));
  return {
    project: root, total: tasks.length,
    documentedDone: tasks.filter((t) => t.state === 'x').length,
    inProgress: tasks.filter((t) => t.state === '~').map((t) => t.id),
    blocked: tasks.filter((t) => t.state === '!').map((t) => t.id),
    next: tasks.find((t) => t.state !== 'x') ?? null,
    note: '문서에 기록된 상태입니다. 실행 상태나 외부 서비스 성공을 확인한 결과가 아닙니다.',
  };
}

function runGit(root, args) {
  return spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8', timeout: 10000, windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
}

function validEvidence(record) {
  return record.detail.length >= 8
    && !/TODO|TBD|placeholder|미확인|미실행|검증 예정|확인 예정|대기 중/i.test(record.detail)
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(record.time)
    && Number.isFinite(Date.parse(record.time));
}

/** Detect a few high-signal hard-coded secrets without printing their values. */
export function secretFindings(text) {
  const result = [];
  const patterns = [
    ['서버 전용 Supabase 키 의심', /\bsb_secret_[A-Za-z0-9_-]{12,}/g],
    ['GitHub 토큰 의심', /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{25,})/g],
    ['비밀키 PEM 의심', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
    ['DB 비밀번호 포함 연결 문자열 의심', /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/g],
    ['브라우저 공개 변수의 비밀/관리자 키 이름', /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PASSWORD|PRIVATE_KEY)[A-Z0-9_]*/g],
  ];
  for (const [message, regex] of patterns) {
    for (const match of text.matchAll(regex)) {
      result.push({ line: text.slice(0, match.index).split('\n').length, message });
    }
  }
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'));
      if (['service_role', 'authenticated'].includes(payload.role)) {
        result.push({ line: text.slice(0, match.index).split('\n').length, message: '관리자/사용자 세션 JWT 하드코딩 의심' });
      }
    } catch { /* Not a parseable JWT; do not print it. */ }
  }
  return result;
}

function textFiles(root, issues, warnings) {
  const files = [];
  let visited = 0;
  let stopped = false;
  function walk(folder) {
    if (stopped) return;
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (stopped) break;
      const full = path.join(folder, entry.name);
      const relative = path.relative(root, full);
      if (entry.isSymbolicLink()) { issues.push(`심볼릭 링크는 검사하지 못합니다: ${relative}`); continue; }
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (++visited > 5000) { stopped = true; issues.push('파일 수 상한으로 정적 검사가 중단되었습니다. 별도 검토가 필요합니다.'); break; }
      // Never open environment/real-data files. Git paths are checked separately.
      if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
      if (!(TEXT_EXTENSIONS.has(path.extname(entry.name)) || entry.name === '.env.example')) continue;
      if (fs.statSync(full).size > MAX_TEXT_BYTES) {
        warnings.push(`1 MiB를 넘는 파일은 내용 검사 제외: ${relative}`);
        continue;
      }
      files.push(full);
    }
  }
  walk(root);
  return files;
}

export function checkProject(project, gate = 'draft') {
  const root = validateProjectRoot(project);
  if (!['draft', 'prepush', 'release'].includes(gate)) throw new Error('gate는 draft/prepush/release 중 하나입니다.');
  const issues = [];
  const warnings = [];
  if (!fs.existsSync(root)) throw new Error('앱 폴더가 없습니다.');
  const docs = {};
  for (const name of ['AGENTS.md', 'PROJECT.md', 'PLAN.md']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) { issues.push(`${name} 누락`); continue; }
    docs[name] = readText(file);
    if (!docs[name].trim()) issues.push(`${name}이 비어 있습니다.`);
    if (/\{\{[A-Z_]+\}\}/.test(docs[name])) issues.push(`${name}에 미치환 템플릿 항목이 있습니다.`);
  }
  if (fs.existsSync(path.join(root, 'AGENTS.school-vibe.proposed.md'))) {
    warnings.push('AGENTS 제안 파일이 남아 있습니다. 실제 AGENTS.md와 병합 여부를 확인하세요.');
    if (gate !== 'draft') issues.push('AGENTS 제안 파일의 병합·검토 후 정리가 필요합니다.');
  }
  if (docs['PLAN.md']) {
    const { tasks, evidence } = parsePlan(docs['PLAN.md']);
    const counts = new Map();
    for (const task of tasks) counts.set(task.id, (counts.get(task.id) ?? 0) + 1);
    for (const id of REQUIRED_TASKS) if (!counts.has(id)) issues.push(`필수 작업 누락/형식 오류: ${id}`);
    for (const [id, count] of counts) if (count > 1) issues.push(`중복 작업 ID: ${id}`);
    for (const task of tasks.filter((t) => t.state === 'x')) {
      if (!evidence.some((r) => r.id === task.id && validEvidence(r))) {
        issues.push(`완료 표시의 유효한 근거 기록이 없습니다: ${task.id}`);
      }
    }
    const needed = gate === 'draft' ? [] : REQUIRED_TASKS.filter((id) =>
      gate === 'prepush' ? /^(P0|S[1-5])\./.test(id) : id !== 'S8.4');
    for (const id of needed) {
      if (tasks.find((t) => t.id === id)?.state !== 'x') issues.push(`${gate} 전 필수 미완료: ${id}`);
    }
  }
  const gitProbe = runGit(root, ['rev-parse', '--is-inside-work-tree']);
  const hasGit = gitProbe.status === 0 && gitProbe.stdout.trim() === 'true';
  if (!hasGit) {
    warnings.push('Git 저장소를 확인하지 못해 추적 파일·ignore의 실제 효과를 검사하지 못했습니다.');
    if (gate !== 'draft') issues.push('이 게이트는 Git 저장소와 Git 실행 파일이 필요합니다.');
  } else {
    const trackedResult = runGit(root, ['ls-files', '-z']);
    if (trackedResult.status !== 0) issues.push('Git 추적 파일 조회에 실패했습니다.');
    else {
      const tracked = trackedResult.stdout.split('\0').filter(Boolean);
      for (const file of tracked) {
        const normalized = file.replaceAll('\\', '/');
        const base = path.posix.basename(normalized);
        if ((base.startsWith('.env') && base !== '.env.example')
          || /(^|\/)(private-data|student-data|backups)\//.test(normalized)
          || /\.(dump|backup|sqlite3?|db|pem|key)$/i.test(base)) {
          issues.push(`커밋 제외 대상 파일이 이미 Git 추적 중입니다: ${normalized}`);
        }
      }
    }
    for (const probe of ['.env.local', '.env.production', 'private-data/probe.txt', 'student-data/probe.txt', 'backups/probe.dump']) {
      if (runGit(root, ['check-ignore', '--no-index', '--quiet', '--', probe]).status !== 0) {
        issues.push(`Git 제외 규칙이 적용되지 않습니다: ${probe}`);
      }
    }
    if (runGit(root, ['check-ignore', '--no-index', '--quiet', '--', '.env.example']).status === 0) {
      warnings.push('.env.example이 Git에서 제외됩니다. 빈 예제 파일은 공유할 수 있도록 검토하세요.');
    }
  }
  const example = path.join(root, '.env.example');
  if (!fs.existsSync(example)) issues.push('.env.example 누락');
  else {
    for (const [index, line] of readText(example).split(/\r?\n/).entries()) {
      if (line.trim().startsWith('#') || !line.trim()) continue;
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || !['', '""', "''"].includes(match[2].trim())) {
        issues.push(`.env.example:${index + 1} — 빈 값만 허용합니다. 값은 출력하지 않습니다.`);
      }
    }
  }
  let scanned = 0;
  for (const file of textFiles(root, issues, warnings)) {
    scanned++;
    for (const finding of secretFindings(readText(file))) {
      issues.push(`${path.relative(root, file)}:${finding.line} — ${finding.message} (값 비표시)`);
    }
  }
  return { gate, project: root, ok: issues.length === 0, scannedFiles: scanned, issues, warnings, disclaimer: DISCLAIMER };
}

export function parseArguments(argv, booleanFlags = new Set(['dry-run', 'json', 'help'])) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`알 수 없는 인수: ${token}`);
    const key = token.slice(2);
    if (Object.hasOwn(options, key)) throw new Error(`중복 인수: --${key}`);
    if (booleanFlags.has(key)) options[key] = true;
    else {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`--${key}에 값이 필요합니다.`);
      options[key] = argv[++i];
    }
  }
  return options;
}

export function rejectUnknown(options, allowed) {
  for (const key of Object.keys(options)) if (!allowed.includes(key)) throw new Error(`지원하지 않는 옵션: --${key}`);
}

function cli(argv) {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === 'help') {
    console.log(`School Vibe Builder ${VERSION}\n\ninit --project <앱 폴더> --name <이름> [--profile calendar|admissions|counseling|custom] [--dry-run]\nstatus --project <앱 폴더> [--json]\ncheck --project <앱 폴더> [--gate draft|prepush|release] [--json]\n\n네트워크/외부 실행 없음. init 외에는 프로젝트 파일을 수정하지 않습니다.`);
    return 0;
  }
  const options = parseArguments(rest);
  let result;
  if (command === 'init') {
    rejectUnknown(options, ['project', 'name', 'profile', 'dry-run', 'json']);
    result = initializeProject({ project: options.project, name: options.name, profile: options.profile, dryRun: options['dry-run'] });
  } else if (command === 'status') {
    rejectUnknown(options, ['project', 'json']);
    result = projectStatus(options.project);
  } else if (command === 'check') {
    rejectUnknown(options, ['project', 'gate', 'json']);
    result = checkProject(options.project, options.gate ?? 'draft');
  } else throw new Error(`지원하지 않는 명령: ${command}`);
  if (options.json || command === 'init') console.log(JSON.stringify(result, null, 2));
  else if (command === 'status') {
    console.log(`문서상 완료 ${result.documentedDone}/${result.total}\n진행: ${result.inProgress.join(', ') || '없음'}\n차단: ${result.blocked.join(', ') || '없음'}\n다음: ${result.next ? `${result.next.id} ${result.next.title}` : '문서상 모든 작업 완료'}\n${result.note}`);
  } else {
    console.log(`${result.ok ? 'PASS' : 'BLOCKED'} — ${result.gate} (정적 검사 ${result.scannedFiles}개 파일)`);
    for (const issue of result.issues) console.log(`ERROR: ${issue}`);
    for (const warning of result.warnings) console.log(`WARN: ${warning}`);
    console.log(result.disclaimer);
  }
  return result.ok === false ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = cli(process.argv.slice(2)); }
  catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 2; }
}
