import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/landeo.ts',import.meta.url),'utf8');
const input={enabled:true,roles:[' Full Stack Developer ','Frontend Engineer','Full Stack Developer'],locations:['Barcelona'],workModes:['Remoto'],industries:[],seniorityLevels:['Junior'],excludedCompanies:[],minimumMatch:75,dailyLimit:1,lastRunAt:null,nextRunAt:null};
async function harness({dbError=null,runError=null,networkFailure=false}={}){
  const writes=[],invocations=[];
  const client={from:()=>({upsert:async row=>{writes.push(row);return{error:dbError}}}),functions:{invoke:async(name,body)=>{invocations.push({name,body});if(networkFailure)throw new Error('offline');return{error:runError,data:{processed:1}}}}};
  const key=`__autoSettings${Math.random().toString(36).slice(2)}`;globalThis[key]=client;
  const isolated=`const createSupabaseBrowserClient=()=>globalThis[${JSON.stringify(key)}];const getResilientSession=async()=>({user:{id:'test-user'}});class FunctionsHttpError extends Error{};\n${source.replace(/^import .*;\s*$/gm,'')}`;
  const{outputText}=ts.transpileModule(isolated,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
  const api=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  return{...api,writes,invocations,cleanup:()=>delete globalThis[key]};
}
test('saving a complete configuration normalizes roles and runs only after persistence',async()=>{
  const h=await harness();try{
    const result=await h.saveAutoApplySettings(input);
    assert.deepEqual(h.writes[0].roles,['Full Stack Developer','Frontend Engineer']);
    assert.equal(h.writes[0].enabled,true);assert.equal(h.invocations.length,1);assert.equal(result.runWarning,null);
  }finally{h.cleanup()}
});
test('first-run errors do not misreport a successful settings write as a failed save',async()=>{
  for(const options of [{runError:new Error('timeout')},{networkFailure:true}]){
    const h=await harness(options);try{const result=await h.saveAutoApplySettings(input);assert.equal(h.writes[0].enabled,true);assert.ok(result.runWarning)}finally{h.cleanup()}
  }
});
test('a database failure never invokes the application runner',async()=>{
  const h=await harness({dbError:new Error('write denied')});try{await assert.rejects(()=>h.saveAutoApplySettings(input),/write denied/);assert.equal(h.invocations.length,0)}finally{h.cleanup()}
});
test('activation requires a nonblank role but pausing is always possible',async()=>{
  const h=await harness();try{
    await assert.rejects(()=>h.saveAutoApplySettings({...input,roles:[' ']}),/puesto objetivo/);
    assert.equal(h.writes.length,0);
    await h.saveAutoApplySettings({...input,enabled:false,roles:[]});
    assert.equal(h.writes[0].enabled,false);assert.equal(h.invocations.length,0);
  }finally{h.cleanup()}
});
test('UI preserves draft text, synchronises enabled state and explains unmet activation requirements',async()=>{
  const ui=await readFile(new URL('../components/ProductApp.tsx',import.meta.url),'utf8');
  assert.match(ui,/value=\{drafts.roles\}/);assert.doesNotMatch(ui,/value=\{form.roles.join/);
  assert.match(ui,/enabled:next.settings.enabled/);assert.match(ui,/consentRef.current\?\.focus/);
  assert.match(ui,/if\(enabled&&\(!pro\|\|!readiness.ready\)\)/);
  assert.doesNotMatch(ui,/disabled=\{saving \|\| !form \|\| !pro/);
  assert.match(ui,/auto-apply-section-heading/);
});
