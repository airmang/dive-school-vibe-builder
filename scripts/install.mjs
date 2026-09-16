#!/usr/bin/env node
/** Local-only bundle installer. No network, overwrite, or host configuration edits. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertSafePath, validateProjectRoot, parseArguments, rejectUnknown } from '../skills/dive-builder/scripts/harness.mjs';
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
export function installSkill({project,user=false,coreOnly=false,dryRun=false,home=os.homedir()}) {
  if(Boolean(project)===Boolean(user)) throw new Error('--project <폴더> 또는 --user 하나만 지정하세요.');
  const base=user?assertSafePath(home):validateProjectRoot(project);
  const parent=assertSafePath(path.join(base,'.agents','skills'));
  const names=coreOnly?['dive-builder']:BUNDLE;
  const manifests=names.map(name=>{
    const source=assertSafePath(path.join(ROOT,'skills',name));
    const destination=assertSafePath(path.join(parent,name));
    if(fs.existsSync(destination)) throw new Error(`${name}이 이미 설치되어 있습니다. 기존 설치를 별도 백업·비교한 뒤 교체하세요. 덮어쓰지 않았습니다.`);
    const files=filesIn(source);
    if(!files.includes('SKILL.md')) throw new Error(`${name}/SKILL.md 누락`);
    return {name,source,destination,files};
  });
  const warnings=[];
  if(coreOnly && fs.existsSync(assertSafePath(path.join(parent,'school-vibe-builder')))) warnings.push('구버전 school-vibe-builder와 중복 활성화되지 않도록 migration 안내를 확인하세요.');
  if(!dryRun) {
    fs.mkdirSync(parent,{recursive:true});
    const staging=fs.mkdtempSync(path.join(parent,'.dive-install-'));
    const installed=[];
    try {
      for(const m of manifests) {
        for(const relative of m.files) {
          const target=path.join(staging,m.name,relative);
          fs.mkdirSync(path.dirname(target),{recursive:true});
          fs.copyFileSync(path.join(m.source,relative),target,fs.constants.COPYFILE_EXCL);
        }
      }
      for(const m of manifests) {
        assertSafePath(m.destination);
        if(fs.existsSync(m.destination)) throw new Error('설치 중 대상이 생겼습니다. 중단합니다.');
        fs.renameSync(path.join(staging,m.name),m.destination); installed.push(m.destination);
      }
    } catch(e) {
      for(const dest of installed.reverse()) fs.rmSync(dest,{recursive:true});
      throw e;
    } finally { fs.rmSync(staging,{recursive:true,force:true}); }
  }
  return {action:dryRun?'dry-run':'installed',scope:user?'user':'project',skills:names,warnings,
    destinations:manifests.map(m=>m.destination),files:manifests.reduce((n,m)=>n+m.files.length,0),
    note:'프로젝트 폴더에서 Codex를 열고 $dive-builder를 사용하세요. 웹앱 모드는 $dive-webapp으로 시작합니다. 보이지 않으면 /skills 확인 후 재시작하세요.'};
}
function cli(argv) {
  if(!argv.length || argv.includes('--help')) {
    console.log('node scripts/install.mjs --project "../my-project" [--core-only] [--dry-run]\nnode scripts/install.mjs --user [--core-only] [--dry-run]\n기본: 공통+웹앱+구 이름 호환 스킬. 기존 설치/프로젝트 문서는 덮어쓰지 않습니다.');return;
  }
  const o=parseArguments(argv,new Set(['user','core-only','dry-run']));
  rejectUnknown(o,['project','user','core-only','dry-run']);
  console.log(JSON.stringify(installSkill({project:o.project,user:o.user,coreOnly:o['core-only'],dryRun:o['dry-run']}),null,2));
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {cli(process.argv.slice(2));} catch(e) {console.error(`ERROR: ${e.message}`);process.exitCode=2;}
}
