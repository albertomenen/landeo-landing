import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/landeo.ts',import.meta.url),'utf8');
const row=(id,title,mode='Remoto',market='REMOTE')=>({id,company:'Example',title,work_mode:mode,location:'Remote',metadata:{market_country:market},published_at:'2026-10-26',application_capability:'external'});
async function load(rows,unavailable=[]){
 const key='__fallback'+Math.random().toString(36).slice(2);
 const client={auth:{getSession:async()=>({data:{session:null}})},from(){const q={select(){return q},eq(){return q},in(){return q},or(){return q},gt(){return q},abortSignal(){return q},order(){return q},limit(){return q},then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject)}};return q},functions:{invoke:async(_,{body})=>({data:{jobIds:body.jobIds.filter(id=>!unavailable.includes(id))},error:null})}};
 globalThis[key]=client;
 const isolated=`const createSupabaseBrowserClient=()=>globalThis[${JSON.stringify(key)}];
 const calculateJobMatch=()=>({score:50,reasons:[]});
 const isJobProfessionallyRelevant=row=>row.title==='Developer';
 const isJobWorkAuthorizationCompatible=()=>true;
 const isJobLocationCompatible=job=>job.market!=='US';
 const resolveCountryCode=()=>'';const cityLocationFilter=()=>'';
 const loadSalaryRates=async()=>null;const prioritizeHighSalaryRemote=jobs=>jobs;
 ${source.replace(/^import .*;\s*$/gm,'')}`;
 const {outputText}=ts.transpileModule(isolated,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 try{const api=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));return await api.loadJobs()}finally{delete globalThis[key]}
}
test('keeps profile matches before offering unrelated remote jobs',async()=>{
 const jobs=await load([row('a','Developer'),row('b','Sales')]);assert.deepEqual(jobs.map(j=>j.id),['a']);
});
test('falls back to actionable remote jobs when no profile matches exist',async()=>{
 const jobs=await load([row('a','Sales'),row('b','Finance','Presencial')]);assert.deepEqual(jobs.map(j=>j.id),['a']);assert.equal(jobs[0].metadata.feed_fallback,'remote_general');
});
test('fallback respects country restrictions and requires application targets',async()=>{
 const jobs=await load([row('a','Sales','Remoto','US'),row('b','Finance'),row('c','Marketing')],['b']);assert.deepEqual(jobs.map(j=>j.id),['c']);
});
test('a profile match without a usable target does not block remote fallback',async()=>{
 const jobs=await load([row('a','Developer'),row('b','Sales')],['a']);assert.deepEqual(jobs.map(j=>j.id),['b']);
});
