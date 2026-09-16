import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  initializeProject, parsePlan, projectStatus, checkProject, secretFindings,
  REQUIRED_TASKS, parseArguments,
} from '../skills/school-vibe-builder/scripts/harness.mjs';
import { installSkill } from '../scripts/install.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER = path.join(REPO, 'skills/school-vibe-builder/scripts/harness.mjs');
const HAS_GIT = spawnSync('git', ['--version']).status === 0;

function fixture(t, init = true, profile = 'calendar') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'school-vibe-tests-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const project = path.join(tmp, '교사 앱 with spaces');
  if (init) initializeProject({ project, name: '우리 반 일정', profile });
  return { tmp, project };
}
function git(project, args) {
  const result = spawnSync('git', ['-C', project, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
function updatePlan(project, fn) {
  const file = path.join(project, 'PLAN.md');
  fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')), 'utf8');
}
function complete(project, ids, evidence = true) {
  updatePlan(project, (text) => {
    for (const id of ids) text = text.replace(`- [ ] [${id}]`, `- [x] [${id}]`);
    if (evidence) text += '\n' + ids.map((id) =>
      `| ${id} | PASS | 단위시험용 합성 근거 — 외부 서비스 확인이 아님 | 2026-09-16T13:00:00+09:00 |`).join('\n') + '\n';
    return text;
  });
}
function snapshot(root) {
  const result = {};
  function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.name === '.git') continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) result[path.relative(root, full)] = fs.readFileSync(full).toString('base64');
    }
  }
  walk(root);
  return result;
}

test('initialization creates exactly five learner files with Korean content', (t) => {
  const { project } = fixture(t);
  assert.deepEqual(fs.readdirSync(project).sort(), ['.env.example', '.gitignore', 'AGENTS.md', 'PLAN.md', 'PROJECT.md'].sort());
  assert.match(fs.readFileSync(path.join(project, 'PROJECT.md'), 'utf8'), /우리 반 일정/);
  assert.equal(projectStatus(project).documentedDone, 0);
});

test('all four profiles render without unresolved template tokens', (t) => {
  const { tmp } = fixture(t, false);
  for (const profile of ['calendar', 'admissions', 'counseling', 'custom']) {
    const project = path.join(tmp, profile);
    initializeProject({ project, name: profile, profile });
    const document = fs.readFileSync(path.join(project, 'PROJECT.md'), 'utf8');
    assert.ok(!/\{\{[A-Z_]+\}\}/.test(document));
    assert.match(document, new RegExp(`프로필: .${profile}.`));
  }
});

test('draft plan contains every required task exactly once', (t) => {
  const { project } = fixture(t);
  const { tasks } = parsePlan(fs.readFileSync(path.join(project, 'PLAN.md'), 'utf8'));
  assert.deepEqual(tasks.map((task) => task.id), REQUIRED_TASKS);
  assert.equal(tasks.length, 29);
});

test('dry-run initialization does not create any project directory', (t) => {
  const { project } = fixture(t, false);
  const report = initializeProject({ project, name: 'dry run', dryRun: true });
  assert.equal(report.action, 'dry-run');
  assert.equal(fs.existsSync(project), false);
});

test('invalid profile fails before writing files', (t) => {
  const { project } = fixture(t, false);
  assert.throws(() => initializeProject({ project, name: 'test', profile: '../bad' }), /profile/);
  assert.equal(fs.existsSync(project), false);
});

test('invalid project name fails before writing files', (t) => {
  const { project } = fixture(t, false);
  for (const name of ['', 'bad\nname', 'x'.repeat(121), '{{BAD}}']) {
    assert.throws(() => initializeProject({ project, name }));
  }
  assert.equal(fs.existsSync(project), false);
});

test('existing PROJECT or PLAN prevents all reinitialization writes', (t) => {
  const { project } = fixture(t);
  const before = snapshot(project);
  assert.throws(() => initializeProject({ project, name: 'replacement' }), /이미/);
  assert.deepEqual(snapshot(project), before);
});

test('an existing PLAN alone is not overwritten and nothing else is created', (t) => {
  const { project } = fixture(t, false);
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, 'PLAN.md'), 'existing');
  assert.throws(() => initializeProject({ project, name: 'test' }), /PLAN.md/);
  assert.deepEqual(fs.readdirSync(project), ['PLAN.md']);
});

test('existing AGENTS and ignore files remain unchanged', (t) => {
  const { project } = fixture(t, false);
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, 'AGENTS.md'), 'Original team instructions');
  fs.writeFileSync(path.join(project, '.gitignore'), 'original-rule/\n');
  const report = initializeProject({ project, name: 'test' });
  assert.equal(fs.readFileSync(path.join(project, 'AGENTS.md'), 'utf8'), 'Original team instructions');
  assert.equal(fs.readFileSync(path.join(project, '.gitignore'), 'utf8'), 'original-rule/\n');
  assert.ok(report.files.includes('AGENTS.school-vibe.proposed.md'));
});

test('existing proposed AGENTS prevents partial file creation', (t) => {
  const { project } = fixture(t, false);
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, 'AGENTS.md'), 'Original');
  fs.writeFileSync(path.join(project, 'AGENTS.school-vibe.proposed.md'), 'Keep');
  const before = snapshot(project);
  assert.throws(() => initializeProject({ project, name: 'test' }), /이미/);
  assert.deepEqual(snapshot(project), before);
});

test('distribution repository cannot be used as a learner application', () => {
  assert.throws(() => initializeProject({ project: REPO, name: 'bad' }), /별도 앱 폴더/);
});

test('filesystem root and home root are rejected', () => {
  assert.throws(() => initializeProject({ project: path.parse(REPO).root, name: 'bad' }));
  assert.throws(() => initializeProject({ project: os.homedir(), name: 'bad' }));
});

test('symlinked project directories are rejected', { skip: process.platform === 'win32' }, (t) => {
  const { tmp } = fixture(t, false);
  const actual = path.join(tmp, 'actual');
  const link = path.join(tmp, 'link');
  fs.mkdirSync(actual);
  fs.symlinkSync(actual, link, 'dir');
  assert.throws(() => initializeProject({ project: link, name: 'bad' }), /심볼릭/);
  assert.equal(fs.readdirSync(actual).length, 0);
});

test('symlinked AGENTS files are rejected without writing the target', { skip: process.platform === 'win32' }, (t) => {
  const { tmp, project } = fixture(t, false);
  fs.mkdirSync(project);
  const target = path.join(tmp, 'original.md');
  fs.writeFileSync(target, 'keep');
  fs.symlinkSync(target, path.join(project, 'AGENTS.md'));
  assert.throws(() => initializeProject({ project, name: 'bad' }), /심볼릭/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'keep');
  assert.equal(fs.existsSync(path.join(project, 'PROJECT.md')), false);
});

test('status distinguishes done, in-progress, blocked and next action', (t) => {
  const { project } = fixture(t);
  updatePlan(project, (text) => text.replace('[ ] [P0.1]', '[x] [P0.1]').replace('[ ] [P0.2]', '[!] [P0.2]').replace('[ ] [S1.1]', '[~] [S1.1]'));
  const report = projectStatus(project);
  assert.equal(report.documentedDone, 1);
  assert.deepEqual(report.blocked, ['P0.2']);
  assert.deepEqual(report.inProgress, ['S1.1']);
  assert.equal(report.next.id, 'P0.2');
});

test('status requires an existing PLAN', (t) => {
  const { project } = fixture(t, false);
  assert.throws(() => projectStatus(project), /PLAN.md/);
});

test('fresh draft passes document preflight without claiming workflow completion', (t) => {
  const { project } = fixture(t);
  const report = checkProject(project, 'draft');
  assert.equal(report.ok, true, report.issues.join('\n'));
  assert.match(report.disclaimer, /실제 로그인/);
  assert.equal(projectStatus(project).documentedDone, 0);
});

test('status and check are read-only for project files', (t) => {
  const { project } = fixture(t);
  const before = snapshot(project);
  projectStatus(project);
  checkProject(project, 'draft');
  assert.deepEqual(snapshot(project), before);
});

test('completed checkbox without evidence is blocked', (t) => {
  const { project } = fixture(t);
  complete(project, ['P0.1'], false);
  const report = checkProject(project);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.includes('근거') && issue.includes('P0.1')));
});

test('manual evidence with an ISO time is accepted as recorded manual evidence', (t) => {
  const { project } = fixture(t);
  complete(project, ['P0.1']);
  updatePlan(project, (text) => text.replace('| P0.1 | PASS |', '| P0.1 | MANUAL-PASS |'));
  assert.equal(checkProject(project).ok, true);
});

test('placeholder or invalid-date evidence does not validate a checkbox', (t) => {
  const { project } = fixture(t);
  complete(project, ['P0.1']);
  updatePlan(project, (text) => text.replace('단위시험용 합성 근거 — 외부 서비스 확인이 아님', 'TODO 확인 예정'));
  assert.equal(checkProject(project).ok, false);
  updatePlan(project, (text) => text.replace('TODO 확인 예정', '단위시험용 구체적인 근거 입력').replace('2026-09-16T13:00:00+09:00', 'not-a-date'));
  assert.equal(checkProject(project).ok, false);
});

test('deleting a required security task cannot bypass preflight', (t) => {
  const { project } = fixture(t);
  updatePlan(project, (text) => text.split('\n').filter((line) => !line.startsWith('- [ ] [S5.3]')).join('\n'));
  assert.ok(checkProject(project).issues.some((issue) => issue.includes('S5.3')));
});

test('duplicate task IDs are rejected', (t) => {
  const { project } = fixture(t);
  updatePlan(project, (text) => `${text}\n- [ ] [P0.1] duplicate\n`);
  assert.ok(checkProject(project).issues.some((issue) => issue.includes('중복')));
});

test('fresh draft fails prepush and release gates', (t) => {
  const { project } = fixture(t);
  assert.equal(checkProject(project, 'prepush').ok, false);
  assert.equal(checkProject(project, 'release').ok, false);
});

test('prepush accepts complete stage 0-5 records with Git protections', { skip: !HAS_GIT }, (t) => {
  const { project } = fixture(t);
  git(project, ['init']);
  complete(project, REQUIRED_TASKS.filter((id) => /^(P0|S[1-5])\./.test(id)));
  const report = checkProject(project, 'prepush');
  assert.equal(report.ok, true, report.issues.join('\n'));
});

test('release checks sharing readiness without circularly requiring sharing itself', { skip: !HAS_GIT }, (t) => {
  const { project } = fixture(t);
  git(project, ['init']);
  complete(project, REQUIRED_TASKS.filter((id) => id !== 'S8.4'));
  const report = checkProject(project, 'release');
  assert.equal(report.ok, true, report.issues.join('\n'));
  assert.equal(projectStatus(project).next.id, 'S8.4');
});

test('tracked environment files are flagged without printing their values', { skip: !HAS_GIT }, (t) => {
  const { project } = fixture(t);
  git(project, ['init']);
  const secret = ['sb_', 'secret_', 'notARealTokenForUnitTesting123456'].join('');
  fs.writeFileSync(path.join(project, '.env.local'), `PRIVATE=${secret}\n`);
  git(project, ['add', '-f', '.env.local']);
  const serialized = JSON.stringify(checkProject(project));
  assert.match(serialized, /Git 추적/);
  assert.ok(!serialized.includes(secret));
});

test('ignored .env contents are not opened or scanned', { skip: !HAS_GIT }, (t) => {
  const { project } = fixture(t);
  git(project, ['init']);
  const secret = ['sb_', 'secret_', 'neverReadThisEnvironmentValue123456'].join('');
  fs.writeFileSync(path.join(project, '.env.local'), `PRIVATE=${secret}\n`);
  const report = checkProject(project);
  assert.equal(report.ok, true, report.issues.join('\n'));
  assert.ok(!JSON.stringify(report).includes(secret));
});

test('already tracked student-data paths are blocked', { skip: !HAS_GIT }, (t) => {
  const { project } = fixture(t);
  git(project, ['init']);
  fs.mkdirSync(path.join(project, 'student-data'));
  fs.writeFileSync(path.join(project, 'student-data', 'synthetic.csv'), 'synthetic only');
  git(project, ['add', '-f', 'student-data/synthetic.csv']);
  assert.ok(checkProject(project).issues.some((issue) => issue.includes('student-data/synthetic.csv')));
});

test('an ineffective .gitignore is detected using actual Git behavior', { skip: !HAS_GIT }, (t) => {
  const { project } = fixture(t);
  git(project, ['init']);
  fs.writeFileSync(path.join(project, '.gitignore'), '# Nothing ignored\n');
  assert.ok(checkProject(project).issues.some((issue) => issue.includes('제외 규칙')));
});

test('environment example values must remain empty', (t) => {
  const { project } = fixture(t);
  fs.appendFileSync(path.join(project, '.env.example'), 'EXAMPLE=not-empty\n');
  assert.ok(checkProject(project).issues.some((issue) => issue.includes('빈 값만')));
});

test('source secret findings are redacted and include file and line', (t) => {
  const { project } = fixture(t);
  const secret = ['sb_', 'secret_', 'syntheticPrivateSecret123456789'].join('');
  fs.writeFileSync(path.join(project, 'client.ts'), `// fixture\nconst key = "${secret}";\n`);
  const report = checkProject(project);
  assert.ok(report.issues.some((issue) => issue.includes('client.ts:2')));
  assert.ok(!JSON.stringify(report).includes(secret));
});

test('publishable keys are not treated as service secrets', () => {
  const key = ['sb_', 'publishable_', 'syntheticPublicKey123456789'].join('');
  assert.equal(secretFindings(`const key = "${key}";`).length, 0);
});

test('legacy service-role JWTs are detected but anon-role JWTs are not', () => {
  function jwt(role) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ role })).toString('base64url');
    return `${header}.${payload}.SyntheticSignature`;
  }
  assert.ok(secretFindings(jwt('service_role')).length > 0);
  assert.equal(secretFindings(jwt('anon')).length, 0);
});

test('public secret variable names are rejected', () => {
  const name = ['NEXT_', 'PUBLIC_', 'SUPABASE_', 'SERVICE_ROLE_KEY'].join('');
  assert.ok(secretFindings(`const key = process.env.${name};`).length > 0);
});

test('installation copies a complete skill including hidden template files', (t) => {
  const { project } = fixture(t, false);
  const report = installSkill({ project });
  assert.ok(fs.existsSync(path.join(report.destination, 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(report.destination, 'assets/templates/.env.example')));
  assert.ok(fs.existsSync(path.join(report.destination, 'scripts/harness.mjs')));
  assert.equal(fs.existsSync(path.join(project, 'PROJECT.md')), false);
});

test('installed standalone runner can initialize the app', (t) => {
  const { project } = fixture(t, false);
  const { destination } = installSkill({ project });
  const result = spawnSync(process.execPath, [path.join(destination, 'scripts/harness.mjs'), 'init', '--project', project, '--name', '설치된 앱', '--profile', 'counseling'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(project, 'PROJECT.md'), 'utf8'), /상담카드/);
});

test('installation dry run has no filesystem side effects', (t) => {
  const { project } = fixture(t, false);
  const report = installSkill({ project, dryRun: true });
  assert.equal(report.action, 'dry-run');
  assert.equal(fs.existsSync(project), false);
});

test('duplicate installation refuses to overwrite local edits', (t) => {
  const { project } = fixture(t, false);
  const { destination } = installSkill({ project });
  const file = path.join(destination, 'SKILL.md');
  fs.appendFileSync(file, '\nlocal customization\n');
  const before = fs.readFileSync(file, 'utf8');
  assert.throws(() => installSkill({ project }), /이미 설치/);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('user scope is explicit and does not modify other user configuration', (t) => {
  const { tmp } = fixture(t, false);
  const home = path.join(tmp, 'fake-home');
  fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
  fs.writeFileSync(path.join(home, '.codex/config.toml'), 'existing_config = true\n');
  const report = installSkill({ user: true, home });
  assert.equal(report.scope, 'user');
  assert.equal(fs.readFileSync(path.join(home, '.codex/config.toml'), 'utf8'), 'existing_config = true\n');
});

test('ambiguous or missing installation scope is rejected', (t) => {
  const { project } = fixture(t, false);
  assert.throws(() => installSkill({}), /하나만/);
  assert.throws(() => installSkill({ project, user: true }), /하나만/);
});

test('symlinked installation paths are rejected', { skip: process.platform === 'win32' }, (t) => {
  const { tmp, project } = fixture(t, false);
  fs.mkdirSync(project);
  const outside = path.join(tmp, 'outside');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(project, '.agents'), 'dir');
  assert.throws(() => installSkill({ project }), /심볼릭/);
  assert.equal(fs.readdirSync(outside).length, 0);
});

test('CLI status provides machine-readable JSON', (t) => {
  const { project } = fixture(t);
  const result = spawnSync(process.execPath, [RUNNER, 'status', '--project', project, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).next.id, 'P0.1');
});

test('CLI returns nonzero for blocked gates and unknown options', (t) => {
  const { project } = fixture(t);
  const blocked = spawnSync(process.execPath, [RUNNER, 'check', '--project', project, '--gate', 'release'], { encoding: 'utf8' });
  assert.equal(blocked.status, 1);
  const invalid = spawnSync(process.execPath, [RUNNER, 'status', '--project', project, '--force'], { encoding: 'utf8' });
  assert.equal(invalid.status, 2);
});

test('argument parsing rejects duplicated or missing option values', () => {
  assert.throws(() => parseArguments(['--project', 'a', '--project', 'b']), /중복/);
  assert.throws(() => parseArguments(['--project']), /값이 필요/);
});
