#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION, parsePlan } from '../skills/dive-builder/scripts/harness.mjs';
import { BUNDLE } from './install.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];
function check(ok,msg){if(!ok)errors.push(msg);}
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
for(const p of ['README.md','START_HERE.md','AGENTS.md','LICENSE','SECURITY.md','CHANGELOG.md','.gitignore','.gitattributes','docs/migration-v0.2.md','docs/testing-report.md'])check(fs.existsSync(path.join(root,p)),`Missing: ${p}`);
for(const name of BUNDLE){
  const p=`skills/${name}`;
  const skill=read(`${p}/SKILL.md`);
  check(skill.startsWith('---\n'),`${name}: missing front matter`);
  check(new RegExp(`^name: ${name}$`,'m').test(skill),`${name}: wrong name`);
  check(/^description: .+$/m.test(skill),`${name}: no description`);
  check(skill.split('\n').length<500,`${name}: SKILL too long`);
  check(read(`${p}/agents/openai.yaml`).includes(`$${name}`),`${name}: default prompt`);
}
check(/allow_implicit_invocation: false/.test(read('skills/school-vibe-builder/agents/openai.yaml')),'Alias must be explicit-only');
const pkg=JSON.parse(read('package.json'));
check(pkg.version===VERSION,'Version mismatch');
check(!pkg.dependencies&&!pkg.devDependencies,'Must remain dependency-free');
const ids=JSON.parse(read('skills/dive-webapp/assets/required-tasks.json'));
check(JSON.stringify(parsePlan(read('skills/dive-webapp/assets/PLAN.md')).tasks.map(t=>t.id))===JSON.stringify(ids),'Webapp plan / task IDs mismatch');
check(!/Supabase|Vercel|Next\.js/.test(read('skills/dive-builder/assets/templates/PLAN.md')),'General plan must not require web stack');
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(['.git','node_modules'].includes(e.name))continue;
  const f=path.join(dir,e.name);check(!e.isSymbolicLink(),`Symlink: ${f}`);
  if(e.isDirectory())walk(f);else if(e.isFile())files.push(f);
}}
walk(root);
for(const file of files.filter(f=>f.endsWith('.md'))){
  const text=fs.readFileSync(file,'utf8');
  check(!text.includes('\uFFFD'),`Encoding: ${file}`);
  check(text.split('\n').filter(l=>l.trimStart().startsWith('```')).length%2===0,`Unbalanced fence: ${file}`);
  for(const m of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)){
    if(/^(https?:|mailto:|#)/.test(m[1]))continue;
    check(fs.existsSync(path.resolve(path.dirname(file),m[1].split('#')[0])),`Broken link ${path.relative(root,file)}: ${m[1]}`);
  }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${files.length} files, 3 skill entries, versions, webapp IDs, neutral general template, local links and fences.\nStructural validation only; no Codex/cloud end-to-end claim.`);
