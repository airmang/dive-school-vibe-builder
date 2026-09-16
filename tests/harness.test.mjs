import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initializeProject, parsePlan, projectStatus, checkProject, assertSafePath, validateProjectRoot, secretFindings, parseArguments, rejectUnknown } from '../skills/dive-builder/scripts/harness.mjs';
import { installSkill, BUNDLE } from '../scripts/install.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SCRIPT=path.join(ROOT,'skills/dive-builder/scripts/harness.mjs');
const STAMP='2026-09-16T12:00:00+09:00';
function folder(t) { const p=fs.mkdtempSync(path.join(os.tmpdir(),'dive-test-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p; }
function init(t,mode='general',profile='custom') { const p=path.join(folder(t),'프로젝트 with spaces');initializeProject({project:p,name:'실제 작업',mode,profile});return p; }
function read(p,n='PLAN.md'){return fs.readFileSync(path.join(p,n),'utf8');}
function write(p,s,n='PLAN.md'){fs.writeFileSync(path.join(p,n),s);}
function meta(p,key,value){write(p,read(p).replace(new RegExp(`> ${key}: \\S+`),`> ${key}: ${value}`));}
function mark(p,id,state='x',result='PASS',detail='도구로 샘플 입력과 실제 결과를 확인했다.') {
  let text=read(p).replace(new RegExp(`^- \\[[ x~!\\-]\\] \\[${id.replace('.','\\.')}\\]`,'m'),`- [${state}] [${id}]`);
  text+=`\n| ${id} | ${result} | ${detail} | ${STAMP} |\n`;write(p,text);
}
function complete(p) { meta(p,'PLAN_APPROVAL','approved');for(const t of parsePlan(read(p)).tasks)mark(p,t.id); }
function git(p,args) { const r=spawnSync('git',['-C',p,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r; }

test('general init creates only neutral project drafts',t=>{const p=init(t);assert.equal(parsePlan(read(p)).metadata.DIVE_MODE,'general');assert.doesNotMatch(read(p),/Supabase|Vercel|Next\.js|로그인/);assert.equal(fs.existsSync(path.join(p,'package.json')),false);assert.equal(checkProject(p).ok,true);});
test('general core permits arbitrary project tasks',t=>{const p=init(t);write(p,read(p).replace(/\[T\d\.1\]/g,'[CUSTOM.9]').replace(/^- \[ \] \[CUSTOM.9\].*\n/gm,'' )+'\n- [ ] [GAME.71] 게임 규칙과 봇 API를 연결\n');assert.equal(checkProject(p).ok,true);});
for(const profile of ['custom','calendar','admissions','counseling'])test(`webapp seed ${profile} contains 29 required tasks`,t=>{const p=init(t,'webapp',profile);assert.equal(parsePlan(read(p)).tasks.length,29);assert.equal(checkProject(p).ok,true);assert.match(read(p),/DIVE_MODE: webapp/);});
test('webapp missing required task is detected',t=>{const p=init(t,'webapp');write(p,read(p).replace(/^- \[ \] \[S3\.2\].*\n/m,''));assert(checkProject(p).issues.some(x=>x.includes('S3.2')));});
test('init does not replace an existing project',t=>{const p=init(t);const before=read(p);assert.throws(()=>initializeProject({project:p,name:'다른 이름'}),/이미/);assert.equal(read(p),before);});
test('partial existing PLAN is preserved before any writes',t=>{const p=folder(t);write(p,'original');assert.throws(()=>initializeProject({project:p,name:'x'}));assert.deepEqual(fs.readdirSync(p),['PLAN.md']);});
test('existing AGENTS gets a separate proposal',t=>{const p=folder(t);write(p,'사용자 원본','AGENTS.md');initializeProject({project:p,name:'x'});assert.equal(read(p,'AGENTS.md'),'사용자 원본');assert(fs.existsSync(path.join(p,'AGENTS.dive.proposed.md')));});
test('existing proposal aborts without partial docs',t=>{const p=folder(t);write(p,'a','AGENTS.md');write(p,'b','AGENTS.dive.proposed.md');assert.throws(()=>initializeProject({project:p,name:'x'}));assert.equal(fs.existsSync(path.join(p,'PROJECT.md')),false);});
test('existing ignore and env example are preserved',t=>{const p=folder(t);write(p,'special\n','.gitignore');write(p,'LOCAL=\n','.env.example');const out=initializeProject({project:p,name:'x'});assert.equal(out.preserved.length,2);assert.equal(read(p,'.gitignore'),'special\n');});
test('dry-run writes nothing',t=>{const p=path.join(folder(t),'new');const out=initializeProject({project:p,name:'x',dryRun:true});assert.equal(out.action,'dry-run');assert.equal(fs.existsSync(p),false);});
for(const name of ['', '\nfoo', '{bad}', 'x'.repeat(121)])test(`reject invalid name ${JSON.stringify(name).slice(0,25)}`,t=>{assert.throws(()=>initializeProject({project:folder(t),name}));});
test('unknown mode is not silently treated as webapp',t=>assert.throws(()=>initializeProject({project:folder(t),name:'x',mode:'typo'})));
test('profile traversal is rejected',t=>assert.throws(()=>initializeProject({project:folder(t),name:'x',mode:'webapp',profile:'../x'})));
test('school profile is not imposed on general mode',t=>assert.throws(()=>initializeProject({project:folder(t),name:'x',profile:'calendar'})));
test('distribution root is not an app',()=>assert.throws(()=>validateProjectRoot(ROOT),/배포/));
test('home and filesystem root rejected',()=>{assert.throws(()=>validateProjectRoot(os.homedir()));assert.throws(()=>validateProjectRoot(path.parse(ROOT).root));});
test('regular file cannot be project root',t=>{const p=path.join(folder(t),'file');fs.writeFileSync(p,'x');assert.throws(()=>validateProjectRoot(p));});
test('symlink and broken symlink paths rejected',{skip:process.platform==='win32'},t=>{const p=folder(t);const real=path.join(p,'real');fs.mkdirSync(real);fs.symlinkSync(real,path.join(p,'link'));assert.throws(()=>assertSafePath(path.join(p,'link','new')));fs.symlinkSync(path.join(p,'missing'),path.join(p,'broken'));assert.throws(()=>assertSafePath(path.join(p,'broken','new')));});
test('symlinked output cannot be overwritten',{skip:process.platform==='win32'},t=>{const p=folder(t);const target=path.join(folder(t),'secret');fs.writeFileSync(target,'kept');fs.symlinkSync(target,path.join(p,'AGENTS.md'));assert.throws(()=>initializeProject({project:p,name:'x'}));assert.equal(fs.readFileSync(target,'utf8'),'kept');});
test('parser ignores fenced examples including tilde fences',()=>{const p=parsePlan('```md\n- [x] [FAKE.1] no\n```\n~~~\n> DIVE_MODE: webapp\n~~~\n- [ ] [REAL.2] yes');assert.deepEqual(p.tasks.map(t=>t.id),['REAL.2']);assert.equal(p.metadata.DIVE_MODE,undefined);});
test('CRLF plan parses correctly',t=>{const p=init(t);write(p,read(p).replaceAll('\n','\r\n'));assert.equal(checkProject(p).ok,true);});
test('empty plan cannot pass',t=>{const p=init(t);write(p,read(p).replace(/^- \[ \].*\n/gm,''));assert.equal(checkProject(p).ok,false);});
test('malformed task checkbox cannot silently disappear',t=>{const p=init(t);write(p,read(p)+'\n- [X] [BAD.1] invalid\n');assert(checkProject(p).issues.some(x=>x.includes('체크박스')));});
test('duplicate task IDs detected',t=>{const p=init(t);write(p,read(p)+'\n- [ ] [T1.1] duplicate\n');assert(checkProject(p).issues.some(x=>x.includes('중복 작업')));});
test('duplicate mode setting rejected',t=>{const p=init(t);write(p,read(p)+'\n> DIVE_MODE: webapp\n');assert(checkProject(p).issues.some(x=>x.includes('중복 설정')));});
test('legacy plan read-only status does not silently migrate',t=>{const p=init(t);write(p,read(p).replace(/^> DIVE_.*\n/gm,''));const before=read(p);assert.equal(projectStatus(p).mode,'legacy-or-unknown');assert.equal(checkProject(p).ok,false);assert.equal(read(p),before);});
test('done without evidence rejected',t=>{const p=init(t);write(p,read(p).replace('[ ] [T1.1]','[x] [T1.1]'));assert(checkProject(p).issues.some(x=>x.includes('완료 근거')));});
for(const result of ['PASS','MANUAL-PASS'])test(`${result} with detailed timestamp is accepted`,t=>{const p=init(t);mark(p,'T1.1','x',result);assert.equal(checkProject(p).ok,true);});
test('latest failure invalidates previous pass',t=>{const p=init(t);mark(p,'T1.1');write(p,read(p)+`\n| T1.1 | FAIL | 실제 재시도에서 오류 발생 확인 | ${STAMP} |\n`);assert(checkProject(p).issues.some(x=>x.includes('T1.1')));});
test('timezone-less evidence rejected',t=>{const p=init(t);mark(p,'T1.1');write(p,read(p).replace(STAMP,'2026-09-16T12:00:00'));assert.equal(checkProject(p).ok,false);});
test('placeholder evidence rejected',t=>{const p=init(t);mark(p,'T1.1','x','PASS','검증 예정: 나중에 제대로 테스트한다.');assert.equal(checkProject(p).ok,false);});
test('general N/A needs recorded reason',t=>{const p=init(t);write(p,read(p).replace('[ ] [T2.1]','[-] [T2.1]'));assert.equal(checkProject(p).ok,false);mark(p,'T2.1','-','N/A','사용자와 합의: 기존 기능이 있어 새 구현 범위에서 제외');assert.equal(checkProject(p).ok,true);assert.equal(projectStatus(p).notApplicable,1);});
test('static webapp can omit unneeded DB and auth',t=>{const p=init(t,'webapp');meta(p,'DIVE_DATA','none');meta(p,'DIVE_AUTH','none');for(const task of parsePlan(read(p)).tasks.filter(t=>/^S[345]\./.test(t.id)||t.id==='S7.2'))mark(p,task.id,'-','N/A','사용자와 합의: 공개 정적 계산기로 서버 저장과 로그인이 없음');assert.equal(checkProject(p).ok,true);});
test('Supabase RLS cannot be marked N/A',t=>{const p=init(t,'webapp');meta(p,'DIVE_DATA','supabase');mark(p,'S3.2','-','N/A','사용자 요청이라는 이유로 보안 검증을 제외하려고 했다');assert(checkProject(p).issues.some(x=>x.includes('제외할 수')));});
test('public Supabase app may omit login but not RLS access tests',t=>{const p=init(t,'webapp');meta(p,'DIVE_DATA','supabase');meta(p,'DIVE_AUTH','none');mark(p,'S5.1','-','N/A','사용자와 합의: 공개 읽기 화면으로 사용자 로그인이 없음');assert.equal(checkProject(p).ok,true);mark(p,'S5.3','-','N/A','사용자와 합의: 공개 읽기 화면으로 사용자 로그인이 없음');assert.equal(checkProject(p).ok,false);});
test('webapp release requires resolved configuration',t=>{const p=init(t,'webapp');complete(p);assert(checkProject(p,'release').issues.some(x=>x.includes('필요 여부')));});
test('general local delivery needs no Git or cloud',t=>{const p=init(t);complete(p);assert.equal(checkProject(p,'release').ok,true);assert.equal(fs.existsSync(path.join(p,'.git')),false);});
test('all N/A cannot claim release',t=>{const p=init(t);meta(p,'PLAN_APPROVAL','approved');for(const t of parsePlan(read(p)).tasks)mark(p,t.id,'-','N/A','사용자와 합의: 이번 작업 범위에 해당하지 않는 항목');assert.equal(checkProject(p,'release').ok,false);});
test('release blocks pending task and unapproved plan',t=>{const p=init(t);assert.equal(checkProject(p,'release').ok,false);complete(p);meta(p,'PLAN_APPROVAL','pending');assert.equal(checkProject(p,'release').ok,false);});
test('webapp release leaves final sharing pending',t=>{const p=init(t,'webapp');meta(p,'DIVE_DATA','supabase');meta(p,'DIVE_AUTH','required');complete(p);write(p,read(p).replace('[x] [S8.4]','[ ] [S8.4]'));assert.equal(checkProject(p,'release').ok,true);});
test('status separates blocked tasks from next candidate',t=>{const p=init(t);write(p,read(p).replace('[ ] [T1.1]','[!] [T1.1]'));assert.deepEqual(projectStatus(p).blocked,['T1.1']);assert.equal(projectStatus(p).next.id,'T2.1');});
test('status and checks do not mutate files',t=>{const p=init(t);const before=read(p);projectStatus(p);checkProject(p);assert.equal(read(p),before);});
test('prepush requires actual Git and ignores',t=>{const p=init(t);assert.equal(checkProject(p,'prepush').ok,false);git(p,['init','-q']);assert.equal(checkProject(p,'prepush').ok,true);});
test('tracked env blocked even with gitignore',t=>{const p=init(t);git(p,['init','-q']);write(p,'DO_NOT_PRINT=this-is-private','.env.local');git(p,['add','-f','.env.local']);const c=checkProject(p,'prepush');assert(c.issues.some(x=>x.includes('추적')));assert.doesNotMatch(JSON.stringify(c),/this-is-private/);});
test('nonempty env example rejected without value echo',t=>{const p=init(t);write(p,'KEY=confidential-value','.env.example');const out=checkProject(p);assert.equal(out.ok,false);assert.doesNotMatch(JSON.stringify(out),/confidential-value/);});
test('scanner covers Python and Vite-style public secret names',t=>{const p=init(t);write(p,'VITE_SERVICE_ROLE_KEY="not-real"','script.py');assert.equal(checkProject(p).ok,false);});
test('large files disclosed as unscanned',t=>{const p=init(t);write(p,'x'.repeat(1024*1024+1),'large.py');assert(checkProject(p).warnings.some(x=>x.includes('1 MiB')));});
test('secrets reported without values',()=>{const secret='sb_'+'secret_'+'a'.repeat(24);const out=secretFindings(secret);assert(out.length);assert.doesNotMatch(JSON.stringify(out),new RegExp(secret));});
test('safe publishable config is not classified as secret',()=>assert.deepEqual(secretFindings('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example'),[]));
test('bundle installs common webapp and compatibility together',t=>{const p=path.join(folder(t),'app');const out=installSkill({project:p});assert.deepEqual(out.skills,BUNDLE);for(const name of BUNDLE)assert(fs.existsSync(path.join(p,'.agents/skills',name,'SKILL.md')));const result=spawnSync(process.execPath,[path.join(p,'.agents/skills/dive-builder/scripts/harness.mjs'),'init','--project',p,'--name','test','--mode','webapp'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);});
test('core-only install works without webapp resources',t=>{const p=path.join(folder(t),'app');installSkill({project:p,coreOnly:true});const script=path.join(p,'.agents/skills/dive-builder/scripts/harness.mjs');assert.equal(spawnSync(process.execPath,[script,'init','--project',p,'--name','test']).status,0);assert.equal(fs.existsSync(path.join(p,'.agents/skills/dive-webapp')),false);});
test('webapp request without installed add-on fails clearly',t=>{const p=path.join(folder(t),'app');installSkill({project:p,coreOnly:true});const out=spawnSync(process.execPath,[path.join(p,'.agents/skills/dive-builder/scripts/harness.mjs'),'init','--project',p,'--name','test','--mode','webapp'],{encoding:'utf8'});assert.equal(out.status,2);assert.match(out.stderr,/dive-webapp/);assert.equal(fs.existsSync(path.join(p,'PROJECT.md')),false);});
test('existing install prevents partial bundle writes',t=>{const p=folder(t);const old=path.join(p,'.agents/skills/school-vibe-builder');fs.mkdirSync(old,{recursive:true});fs.writeFileSync(path.join(old,'note'),'kept');assert.throws(()=>installSkill({project:p}));assert.equal(fs.existsSync(path.join(p,'.agents/skills/dive-builder')),false);assert.equal(fs.readFileSync(path.join(old,'note'),'utf8'),'kept');});
test('installer dry-run creates no destination',t=>{const p=path.join(folder(t),'app');installSkill({project:p,dryRun:true});assert.equal(fs.existsSync(p),false);});
test('installer user scope and exclusive flags',t=>{const home=folder(t);installSkill({user:true,home});assert(fs.existsSync(path.join(home,'.agents/skills/dive-builder/SKILL.md')));assert.throws(()=>installSkill({project:home,user:true}));});
test('legacy CLI still initializes webapp with both skills installed',t=>{const p=path.join(folder(t),'app');installSkill({project:p});const out=spawnSync(process.execPath,[path.join(p,'.agents/skills/school-vibe-builder/scripts/harness.mjs'),'init','--project',p,'--name','test'],{encoding:'utf8'});assert.equal(out.status,0,out.stderr);assert.equal(parsePlan(read(p)).metadata.DIVE_MODE,'webapp');});
test('CLI status and bad args use correct exit codes',t=>{const p=init(t);assert.equal(spawnSync(process.execPath,[SCRIPT,'status','--project',p]).status,0);assert.equal(spawnSync(process.execPath,[SCRIPT,'init','--project',p,'--name','x','--unknown']).status,2);});
test('strict argument parser rejects duplicates missing values and unknown flags',()=>{assert.throws(()=>parseArguments(['--x','1','--x','2']));assert.throws(()=>parseArguments(['--project']));assert.throws(()=>rejectUnknown({wat:true},['project']));});

test('blocked sharing is not silently passed as a release',t=>{const p=init(t,'webapp');meta(p,'DIVE_DATA','supabase');meta(p,'DIVE_AUTH','required');complete(p);write(p,read(p).replace('[x] [S8.4]','[!] [S8.4]'));assert.equal(checkProject(p,'release').ok,false);});
test('static webapp can reach documented release without a database',t=>{const p=init(t,'webapp');meta(p,'DIVE_DATA','none');meta(p,'DIVE_AUTH','none');complete(p);for(const task of parsePlan(read(p)).tasks.filter(t=>/^S[345]\./.test(t.id)||t.id==='S7.2'))mark(p,task.id,'-','N/A','사용자와 합의: 공개 정적 도구로 서버 저장과 로그인이 없음');assert.equal(checkProject(p,'release').ok,true);});
test('blocked-only CLI never reports all work complete',t=>{const p=init(t);write(p,read(p).replaceAll('- [ ]','- [!]'));const out=spawnSync(process.execPath,[SCRIPT,'status','--project',p],{encoding:'utf8'});assert.doesNotMatch(out.stdout,/모든 작업 완료/);assert.match(out.stdout,/차단/);});
