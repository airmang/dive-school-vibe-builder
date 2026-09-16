#!/usr/bin/env node
/** DIVE Builder: dependency-free, local-only document helpers.
 * No shell execution, cloud calls, package installation, or automatic approvals.
 * A check result is a document/static preflight, not a security certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const VERSION = '0.2.0';
export const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT = path.resolve(SKILL_ROOT, '../dive-webapp');
const MAX_TEXT_BYTES = 1024 * 1024;
const EXCLUDED_DIRS = new Set([
  '.git', '.agents', 'node_modules', '.next', '.vercel', 'dist', 'out',
  'build', 'coverage', 'playwright-report', 'test-results', '.venv', 'venv', '__pycache__', 'target', '.dive-install',
  'private-data', 'student-data', 'backups',
]);
const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.sql',
  '.md', '.txt', '.yml', '.yaml', '.html', '.css', '.py', '.rs', '.go', '.java', '.cs', '.cpp', '.sh', '.ps1', '.toml',
]);
const DISCLAIMER = '문서 형식·완료 근거 기입·일부 비밀 패턴만 검사했습니다. 실제 동작·권한·배포와 해당 데이터 검토는 별도로 필요합니다. 계획의 진실성이나 코드 변경 후 근거의 유효성을 자동 증명하지 않습니다.';

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
  if (!value || typeof value !== 'string') throw new Error('--project에 프로젝트 폴더를 지정하세요.');
  const root = assertSafePath(value);
  if (root === path.parse(root).root || root === path.resolve(os.homedir())) {
    throw new Error('파일시스템/사용자 홈 루트가 아닌 별도 프로젝트 폴더를 지정하세요.');
  }
  if (fs.existsSync(root) && !fs.statSync(root).isDirectory()) {
    throw new Error('프로젝트 폴더 경로가 디렉터리가 아닙니다.');
  }
  // The distribution repository is not a learner's application repository.
  if (['school-vibe-builder','dive-builder'].some(n => fs.existsSync(path.join(root, 'skills', n, 'SKILL.md')))) {
    throw new Error('하네스 배포 저장소가 아닌 별도 프로젝트 폴더를 지정하세요.');
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

const INTRO = `대기 [ ], 진행 [~], 차단 [!], 검증 완료 [x], 합의된 적용 제외 [-].
고정 커리큘럼이 아니다. 목표에 따라 작업을 추가·수정하고 변경 이유를 남긴다.
완료 근거: PASS=도구 확인, MANUAL-PASS=사용자 확인, N/A=합의한 적용 제외, FAIL=실패.
같은 작업의 마지막 근거 행을 현재 기록으로 사용한다. 시각은 시간대가 있는 ISO 형식이다.
이 문서만으로 실제 실행·사용자 승인·검증 진위를 증명할 수 없다.`;

/** Drafts only. No app scaffolding, implicit approvals, or overwrite. */
export function initializeProject({ project, name, mode = 'general', profile = 'custom', dryRun = false }) {
  const root = validateProjectRoot(project);
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || /[\r\n\x00-\x1f{}]/.test(name)) {
    throw new Error('--name은 중괄호/제어문자 없는 1~120자 한 줄이어야 합니다.');
  }
  if (!['general','webapp'].includes(mode)) throw new Error('mode는 general/webapp입니다. 프로젝트 종류를 제한하는 옵션이 아닙니다.');
  if (!['custom','calendar','admissions','counseling'].includes(profile)) throw new Error('알 수 없는 예시 profile입니다. custom으로 자유롭게 정의하세요.');
  if (mode === 'general' && profile !== 'custom') throw new Error('학교 예시 profile은 webapp 모드에서만 사용합니다.');
  if (mode === 'webapp' && !fs.existsSync(path.join(WEB_ROOT,'SKILL.md'))) throw new Error('dive-webapp 스킬을 함께 설치하세요.');
  const values = {
    GOAL: '사용자가 원하는 결과를 한 문장으로 정리한다.', USERS: '실제 사용 장면·사용자·기기를 확인한다.',
    MVP: '- 먼저 작동할 핵심 행동을 합의한다.', FIELDS: '필요한 입력과 기대 출력을 정리한다. 저장·서버는 필요할 때만.',
    ACCESS_MATRIX: '외부 공유·민감정보·원본 변경 여부를 확인한다.', ACCEPTANCE: '- 실제 사용으로 확인 가능한 완료 조건을 합의한다.',
    ...(mode === 'webapp' ? JSON.parse(readText(path.join(WEB_ROOT,'assets/profiles',`${profile}.json`))) : {}),
    PROJECT_NAME: name.trim(), PROFILE: profile, TODAY: new Date().toISOString().slice(0,10), INTRO,
  };
  const templates = path.join(SKILL_ROOT,'assets/templates');
  const sources = {
    'AGENTS.md': path.join(templates,'AGENTS.md'), 'PROJECT.md': path.join(templates,'PROJECT.md'),
    'PLAN.md': path.join(mode === 'webapp' ? path.join(WEB_ROOT,'assets') : templates,'PLAN.md'),
    '.gitignore': path.join(templates,'gitignore.txt'), '.env.example': path.join(templates,'env-example.txt'),
  };
  for (const file of ['PROJECT.md','PLAN.md']) {
    if (fs.existsSync(assertSafePath(path.join(root,file)))) throw new Error(`${file}이 이미 있습니다. 초기화하지 말고 이어서 진행하세요.`);
  }
  const writes = [], preserved = [], warnings = [];
  for (const [file, source] of Object.entries(sources)) {
    let output = assertSafePath(path.join(root,file));
    if (fs.existsSync(output)) {
      if (file !== 'AGENTS.md') { preserved.push(file); continue; }
      output = assertSafePath(path.join(root,'AGENTS.dive.proposed.md'));
      warnings.push('기존 AGENTS.md를 보존했습니다. 제안 파일을 검토·병합한 뒤 정리하세요.');
      if (fs.existsSync(output)) throw new Error('AGENTS.dive.proposed.md가 이미 있습니다.');
    }
    writes.push([output,render(readText(source),values)]);
  }
  const created = [];
  if (!dryRun) {
    fs.mkdirSync(root,{recursive:true});
    try {
      for (const [file,text] of writes) { fs.writeFileSync(file,text,{encoding:'utf8',flag:'wx'}); created.push(file); }
    } catch (e) { for (const file of created.reverse()) fs.unlinkSync(file); throw e; }
  }
  return {action:dryRun?'dry-run':'initialized',project:root,mode,files:writes.map(([f])=>path.relative(root,f)),preserved,warnings,
    note:'문서 초안만 생성했습니다. 실제 목표·계획을 합의하고 PLAN_APPROVAL을 갱신하세요. 모드 선택은 배포 승인이 아닙니다.'};
}

function withoutFences(text) {
  let fence = null;
  return text.split(/\r?\n/).filter(line => {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) { if (!fence) fence=m[1]; else if (m[1][0]===fence[0] && m[1].length>=fence.length) fence=null; return false; }
    return !fence;
  }).join('\n');
}

export function parsePlan(text) {
  const clean = withoutFences(text);
  const tasks = [...clean.matchAll(/^- \[([ x~!\-])\] \[([A-Z][A-Z0-9]*\.\d+)\] (.+)$/gm)]
    .map(m=>({state:m[1],id:m[2],title:m[3].trim()}));
  const evidence = [];
  for (const line of clean.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const c=line.split('|').slice(1,-1).map(x=>x.trim());
    if(c.length===4 && /^[A-Z][A-Z0-9]*\.\d+$/.test(c[0])) evidence.push({id:c[0],result:c[1],detail:c[2],time:c[3]});
  }
  const metadata = {}, errors = [];
  for(const m of clean.matchAll(/^> (DIVE_MODE|DIVE_DATA|DIVE_AUTH|PLAN_APPROVAL): (\S+)\s*$/gm)) {
    if(Object.hasOwn(metadata,m[1])) errors.push(`중복 설정: ${m[1]}`);
    metadata[m[1]]=m[2];
  }
  const count = clean.split('\n').filter(l=>/^- \[/.test(l)).length;
  if(count!==tasks.length) errors.push('작업 체크박스 형식/ID를 확인하세요.');
  return {tasks,evidence,metadata,errors};
}

export function projectStatus(project) {
  const root=validateProjectRoot(project);
  const {tasks,metadata,errors}=parsePlan(readText(path.join(root,'PLAN.md')));
  return {project:root,mode:metadata.DIVE_MODE??'legacy-or-unknown',total:tasks.length,
    documentedDone:tasks.filter(t=>t.state==='x').length,notApplicable:tasks.filter(t=>t.state==='-').length,
    inProgress:tasks.filter(t=>t.state==='~').map(t=>t.id),blocked:tasks.filter(t=>t.state==='!').map(t=>t.id),
    next:tasks.find(t=>t.state==='~')??tasks.find(t=>t.state===' ')??null,errors,
    note:'문서상 상태입니다. 차단 작업은 별도 표시합니다. 다음 후보의 의존성과 실제 코드·서비스 상태를 대조해야 합니다.'};
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
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(record.time)
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
    ['브라우저 공개 변수의 비밀/관리자 키 이름', /\b(?:NEXT_PUBLIC_|VITE_|PUBLIC_)[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PASSWORD|PRIVATE_KEY)[A-Z0-9_]*/g],
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
  if (!fs.existsSync(root)) throw new Error('프로젝트 폴더가 없습니다.');
  const docs = {};
  for (const name of ['AGENTS.md', 'PROJECT.md', 'PLAN.md']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) { issues.push(`${name} 누락`); continue; }
    docs[name] = readText(file);
    if (!docs[name].trim()) issues.push(`${name}이 비어 있습니다.`);
    if (/\{\{[A-Z_]+\}\}/.test(docs[name])) issues.push(`${name}에 미치환 템플릿 항목이 있습니다.`);
  }
  if (['AGENTS.dive.proposed.md','AGENTS.school-vibe.proposed.md'].some(f=>fs.existsSync(assertSafePath(path.join(root,f))))) {
    warnings.push('AGENTS 제안 파일의 검토·병합이 필요합니다.');
    if(gate==='release') issues.push('AGENTS 제안 파일을 검토·정리하세요.');
  }
  if (docs['PLAN.md']) {
    const {tasks,evidence,metadata,errors}=parsePlan(docs['PLAN.md']);
    issues.push(...errors);
    const mode=metadata.DIVE_MODE;
    if(!['general','webapp'].includes(mode)) issues.push('DIVE_MODE가 없거나 잘못되었습니다. 구버전 계획은 보존하고 migration 안내에 따라 전환하세요.');
    for(const [key,values] of Object.entries({DIVE_DATA:['undecided','none','supabase','other'],DIVE_AUTH:['undecided','none','required'],PLAN_APPROVAL:['pending','approved']})) {
      if(!values.includes(metadata[key])) issues.push(`설정 확인 필요: ${key}`);
    }
    if(!tasks.length) issues.push('계획에 작업이 없습니다. 빈 계획은 통과할 수 없습니다.');
    const counts=new Map();
    for(const t of tasks) counts.set(t.id,(counts.get(t.id)??0)+1);
    for(const [id,n] of counts) if(n>1) issues.push(`중복 작업 ID: ${id}`);
    if(mode==='webapp') {
      const file=path.join(WEB_ROOT,'assets/required-tasks.json');
      if(!fs.existsSync(file)) issues.push('웹앱 점검에 dive-webapp 스킬이 필요합니다.');
      else for(const id of JSON.parse(readText(file))) if(!counts.has(id)) issues.push(`웹앱 작업 누락: ${id}`);
    }
    for(const t of tasks) {
      const record=evidence.filter(e=>e.id===t.id).at(-1);
      if(t.state==='x' && (!record || !['PASS','MANUAL-PASS'].includes(record.result) || !validEvidence(record))) issues.push(`완료 근거 확인 필요: ${t.id}`);
      if(t.state==='-') {
        if(!record || record.result!=='N/A' || !validEvidence(record)) issues.push(`적용 제외 합의·이유 기록 필요: ${t.id}`);
        if(mode==='webapp') {
          const dataNone=metadata.DIVE_DATA==='none', authNone=metadata.DIVE_AUTH==='none';
          const allowed=(/^S[34]\./.test(t.id) && dataNone) || (/^S5\./.test(t.id) && authNone && (dataNone || ['S5.1','S5.2'].includes(t.id))) || (t.id==='S7.2' && dataNone && authNone);
          if(!allowed) issues.push(`필수 웹앱 점검을 제외할 수 없습니다: ${t.id}`);
        }
      }
    }
    if(gate==='release') {
      if(metadata.PLAN_APPROVAL!=='approved') issues.push('계획 범위 합의 기록이 필요합니다.');
      if(!tasks.some(t=>t.state==='x')) issues.push('실제로 완료한 작업이 없습니다.');
      if(mode==='webapp' && [metadata.DIVE_DATA,metadata.DIVE_AUTH].includes('undecided')) issues.push('웹앱의 저장·인증 필요 여부를 확정하세요.');
      for(const t of tasks) if(!['x','-'].includes(t.state) && !(mode==='webapp' && t.id==='S8.4' && t.state===' ')) issues.push(`완료 전 남은 작업: ${t.id}`);
    }
  }
  const gitProbe = runGit(root, ['rev-parse', '--is-inside-work-tree']);
  const hasGit = gitProbe.status === 0 && gitProbe.stdout.trim() === 'true';
  if (!hasGit) {
    warnings.push('Git 저장소를 확인하지 못해 추적 파일·ignore의 실제 효과를 검사하지 못했습니다.');
    if (gate === 'prepush') issues.push('업로드 전 점검에는 Git 저장소와 Git 실행 파일이 필요합니다.');
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

export function cli(argv) {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === 'help') {
    console.log(`DIVE Builder ${VERSION}\n\ninit --project <프로젝트 폴더> --name <이름> [--mode general|webapp] [--profile custom|calendar|admissions|counseling] [--dry-run]\nstatus --project <프로젝트 폴더> [--json]\ncheck --project <프로젝트 폴더> [--gate draft|prepush|release] [--json]\n\n네트워크/외부 실행 없음. init 외에는 프로젝트 파일을 수정하지 않습니다.`);
    return 0;
  }
  const options = parseArguments(rest);
  let result;
  if (command === 'init') {
    rejectUnknown(options, ['project', 'name', 'mode', 'profile', 'dry-run', 'json']);
    result = initializeProject({ project: options.project, name: options.name, mode: options.mode, profile: options.profile, dryRun: options['dry-run'] });
  } else if (command === 'status') {
    rejectUnknown(options, ['project', 'json']);
    result = projectStatus(options.project);
  } else if (command === 'check') {
    rejectUnknown(options, ['project', 'gate', 'json']);
    result = checkProject(options.project, options.gate ?? 'draft');
  } else throw new Error(`지원하지 않는 명령: ${command}`);
  if (options.json || command === 'init') console.log(JSON.stringify(result, null, 2));
  else if (command === 'status') {
    console.log(`문서상 완료 ${result.documentedDone}/${result.total} · 적용 제외 ${result.notApplicable}\n진행: ${result.inProgress.join(', ') || '없음'}\n차단: ${result.blocked.join(', ') || '없음'}\n다음: ${result.next ? `${result.next.id} ${result.next.title}` : '진행 가능한 대기 작업 없음 — 차단/의존성 확인'}\n${result.note}`);
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
