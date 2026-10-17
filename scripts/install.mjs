#!/usr/bin/env node
/** Local-only bundle installer. No network, overwrite, or host configuration edits. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { assertSafePath, validateProjectRoot, parseArguments, rejectUnknown, isMain } from '../skills/dive-builder/scripts/harness.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const BUNDLE=['dive-builder','dive-webapp','school-vibe-builder'];
function filesIn(folder) {
  const result=[];
  function walk(dir) {
    for(const e of fs.readdirSync(dir,{withFileTypes:true})) {
      const f=path.join(dir,e.name);
      if(e.isSymbolicLink()) throw new Error('심볼릭 링크가 있는 스킬 원본은 설치하지 않습니다.');
      if(e.isDirectory()) walk(f);
      else if(e.isFile()) result.push(path.relative(folder,f));
      else throw new Error('일반 파일이 아닌 리소스가 있습니다.');
    }
  }
  walk(folder);return result.sort();
}
export const AGENT_DIRS={codex:['.agents','skills'],claude:['.claude','skills']};
export function agentTargets(agent='both') {
  if(agent==='both') return ['codex','claude'];
  if(!Object.hasOwn(AGENT_DIRS,agent)) throw new Error('--agent는 codex, claude, both 중 하나입니다.');
  return [agent];
}
export function installSkill({project,user=false,coreOnly=false,dryRun=false,agent='both',home=os.homedir()}) {
  if(Boolean(project)===Boolean(user)) throw new Error('--project <폴더> 또는 --user 하나만 지정하세요.');
  const base=user?assertSafePath(home):validateProjectRoot(project);
  const agents=agentTargets(agent);
  const names=coreOnly?['dive-builder']:BUNDLE;
  const manifests=[];
  const warnings=[];
  for(const host of agents) {
    const parent=assertSafePath(path.join(base,...AGENT_DIRS[host]));
    for(const name of names) {
      const source=assertSafePath(path.join(ROOT,'skills',name));
      const destination=assertSafePath(path.join(parent,name));
      if(fs.existsSync(destination)) throw new Error(`${path.join(...AGENT_DIRS[host],name)}이 이미 설치되어 있습니다. 기존 설치를 별도 백업·비교한 뒤 교체하세요. 덮어쓰지 않았습니다.`);
      const files=filesIn(source);
      if(!files.includes('SKILL.md')) throw new Error(`${name}/SKILL.md 누락`);
      manifests.push({host,name,parent,source,destination,files});
    }
    if(coreOnly && fs.existsSync(assertSafePath(path.join(parent,'school-vibe-builder')))) warnings.push(`${path.join(...AGENT_DIRS[host])}: 구버전 school-vibe-builder와 중복 활성화되지 않도록 migration 안내를 확인하세요.`);
  }
  if(!dryRun) {
    const stagings=new Map();
    const installed=[];
    try {
      for(const host of agents) {
        const parent=manifests.find(m=>m.host===host).parent;
        fs.mkdirSync(parent,{recursive:true});
        stagings.set(host,fs.mkdtempSync(path.join(parent,'.dive-install-')));
      }
      for(const m of manifests) {
        for(const relative of m.files) {
          const target=path.join(stagings.get(m.host),m.name,relative);
          fs.mkdirSync(path.dirname(target),{recursive:true});
          fs.copyFileSync(path.join(m.source,relative),target,fs.constants.COPYFILE_EXCL);
        }
      }
      for(const m of manifests) {
        assertSafePath(m.destination);
        if(fs.existsSync(m.destination)) throw new Error('설치 중 대상이 생겼습니다. 중단합니다.');
        fs.renameSync(path.join(stagings.get(m.host),m.name),m.destination); installed.push(m.destination);
      }
    } catch(e) {
      for(const dest of installed.reverse()) fs.rmSync(dest,{recursive:true});
      throw e;
    } finally { for(const staging of stagings.values()) fs.rmSync(staging,{recursive:true,force:true}); }
  }
  const notes=[];
  if(agents.includes('codex')) notes.push('Codex: 앱 폴더를 열고 $dive-builder, 웹앱은 $dive-webapp으로 시작합니다. 보이지 않으면 /skills 확인 후 재시작하세요.');
  if(agents.includes('claude')) notes.push('Claude Code: 같은 앱 폴더에서 새 대화를 열고 /dive-builder, 웹앱은 /dive-webapp으로 시작합니다. 보이지 않으면 /skills를 확인하세요.');
  return {action:dryRun?'dry-run':'installed',scope:user?'user':'project',agents,skills:names,warnings,
    destinations:manifests.map(m=>m.destination),files:manifests.reduce((n,m)=>n+m.files.length,0),
    note:notes.join(' ')};
}
function cli(argv) {
  if(!argv.length || argv.includes('--help')) {
    console.log('node scripts/install.mjs --project "../my-project" [--agent both|codex|claude] [--core-only] [--dry-run]\nnode scripts/install.mjs --user [--agent both|codex|claude] [--core-only] [--dry-run]\n기본: 공통+웹앱+구 이름 호환 스킬을 Codex(.agents/skills)와 Claude Code(.claude/skills)에 함께 설치합니다. 기존 설치/프로젝트 문서는 덮어쓰지 않습니다.');return;
  }
  const o=parseArguments(argv,new Set(['user','core-only','dry-run']));
  rejectUnknown(o,['project','user','core-only','dry-run','agent']);
  console.log(JSON.stringify(installSkill({project:o.project,user:o.user,coreOnly:o['core-only'],dryRun:o['dry-run'],agent:o.agent??'both'}),null,2));
}
if(isMain(import.meta.url)) {
  try {cli(process.argv.slice(2));} catch(e) {console.error(`ERROR: ${e.message}`);process.exitCode=2;}
}
