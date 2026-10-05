import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installSkill } from '../scripts/install.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SCRIPT=path.join(ROOT,'skills/dive-builder/scripts/doctor.sh');
function fixture(t,commands={}) {
  const p=fs.mkdtempSync(path.join(os.tmpdir(),'dive-doctor-'));
  t.after(()=>fs.rmSync(p,{recursive:true,force:true}));
  for(const [name,{version='1.0.0',exit=0}] of Object.entries(commands)) {
    fs.writeFileSync(path.join(p,name),`#!/bin/sh\nprintf '%s\\n' '${version}'\nexit ${exit}\n`,{mode:0o755});
  }
  return p;
}
function probe(p,args=[],script=SCRIPT) {
  return spawnSync('/bin/sh',[script,...args],{encoding:'utf8',env:{...process.env,PATH:p},timeout:5000});
}
const native={skip:process.platform==='win32'};
test('doctor runs with no Node/npm/Git and reports missing tools',native,t=>{
  const out=probe(fixture(t),['--webapp']);
  assert.equal(out.status,1);assert.match(out.stdout,/node=missing/);assert.match(out.stdout,/npm=missing/);assert.match(out.stdout,/git=missing/);
});
test('compatible tools pass without writes or an installer',native,t=>{
  const p=fixture(t,{node:{version:'v24.1.0'},npm:{},git:{}}),before=fs.readdirSync(p);
  const out=probe(p,['--webapp']);assert.equal(out.status,0,out.stderr);assert.match(out.stdout,/READY:/);
  assert.deepEqual(fs.readdirSync(p),before);
});
test('Node 20.8 works for installer but not default webapp',native,t=>{
  const p=fixture(t,{node:{version:'v20.8.0'},npm:{},git:{}});
  assert.equal(probe(p).status,0);assert.equal(probe(p,['--webapp']).status,1);
});
test('Node 20.9 meets default webapp minimum',native,t=>{
  assert.equal(probe(fixture(t,{node:{version:'v20.9.0'},npm:{},git:{}}),['--webapp']).status,0);
});
test('Git is optional for local general projects',native,t=>{
  const p=fixture(t,{node:{version:'v22.22.2'},npm:{}});
  assert.equal(probe(p).status,0);assert.equal(probe(p,['--webapp']).status,1);
});
for(const version of ['v18.20.0','v20','v20..9','unexpected output']) {
  test(`old or invalid Node version cannot claim readiness: ${version}`,native,t=>{
    const out=probe(fixture(t,{node:{version},npm:{},git:{}}),['--webapp']);assert.equal(out.status,1);
  });
}
test('found but failing tools cannot claim readiness',native,t=>{
  for(const failed of ['node','npm','git']) {
    const commands={node:{version:'v24.1.0'},npm:{},git:{}};
    commands[failed]={...commands[failed],exit:1};
    assert.equal(probe(fixture(t,commands),['--webapp']).status,1);
  }
});
test('unknown doctor arguments fail before running tools',native,t=>{
  assert.equal(probe(fixture(t),['--typo']).status,2);
  assert.equal(probe(fixture(t),['--webapp','extra']).status,2);
});
test('installed core bundle contains a working Node-free doctor',native,t=>{
  const p=path.join(fixture(t),'app');installSkill({project:p,coreOnly:true});
  const doctor=path.join(p,'.agents/skills/dive-builder/scripts/doctor.sh');
  const ps=path.join(p,'.agents/skills/dive-builder/scripts/doctor.ps1');
  assert(fs.existsSync(ps));
  const result=probe(fixture(t),[],doctor);assert.equal(result.status,1);assert.match(result.stdout,/node=missing/);
});

// Optional cross-platform PowerShell validation. This does not install PowerShell,
// execute Windows installers, or alter ExecutionPolicy; use an existing test host.
const powershell=process.env.DIVE_TEST_PWSH;
const psAvailable={skip:!powershell};
const psMock={skip:!powershell||process.platform==='win32'};
const PS_SCRIPT=path.join(ROOT,'skills/dive-builder/scripts/doctor.ps1');
function psProbe(p,webapp=true) {
  return spawnSync(powershell,['-NoLogo','-NoProfile','-NonInteractive','-File',PS_SCRIPT,...(webapp?['-Webapp']:[])],
    {encoding:'utf8',env:{...process.env,PATH:p},timeout:15000});
}
function psFixture(t,commands) {
  return fixture(t,Object.fromEntries(Object.entries(commands).map(([name,value])=>[name==='npm'?'npm.cmd':`${name}.exe`,value])));
}
test('PowerShell doctor diagnoses no native tools without Node',psAvailable,t=>{
  const out=psProbe(fixture(t));assert.equal(out.status,1,out.stderr);assert.match(out.stdout,/node=missing/);assert.match(out.stdout,/npm=missing/);assert.match(out.stdout,/git=missing/);
});
test('PowerShell doctor runs native executables including npm.cmd',psMock,t=>{
  const out=psProbe(psFixture(t,{node:{version:'v24.1.0'},npm:{},git:{}}));
  assert.equal(out.status,0,out.stderr);assert.match(out.stdout,/READY:/);
});
test('PowerShell doctor distinguishes installer and webapp Node minimums',psMock,t=>{
  const p=psFixture(t,{node:{version:'v20.8.0'},npm:{},git:{}});
  assert.equal(psProbe(p,false).status,0);assert.equal(psProbe(p).status,1);
});
test('PowerShell doctor accepts Node 20.9 webapp minimum',psMock,t=>{
  assert.equal(psProbe(psFixture(t,{node:{version:'v20.9.0'},npm:{},git:{}})).status,0);
});
test('PowerShell doctor does not require Git for general tools',psMock,t=>{
  const p=psFixture(t,{node:{version:'v24.1.0'},npm:{}});
  assert.equal(psProbe(p,false).status,0);assert.equal(psProbe(p).status,1);
});
for(const version of ['v18.20.0','v20','unexpected output']) {
  test(`PowerShell doctor rejects old or malformed Node: ${version}`,psMock,t=>{
    assert.equal(psProbe(psFixture(t,{node:{version},npm:{},git:{}})).status,1);
  });
}
test('PowerShell doctor rejects failing native tools',psMock,t=>{
  for(const failed of ['node','npm','git']) {
    const commands={node:{version:'v24.1.0'},npm:{},git:{}};commands[failed]={...commands[failed],exit:1};
    assert.equal(psProbe(psFixture(t,commands)).status,1);
  }
});
