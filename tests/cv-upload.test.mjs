import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/cv-upload.ts',import.meta.url),'utf8');
const landeoSource=await readFile(new URL('../lib/landeo.ts',import.meta.url),'utf8');
const fallbackRoute=await readFile(new URL('../app/api/onboarding/cv-upload/route.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {resumeFormat,uploadCvWithRetry}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('retries transient upload failures and stops after success',async()=>{
  let calls=0;const attempts=[];
  await uploadCvWithRetry(async()=>({error:++calls<3?{statusCode:'503'}:null}),'es',n=>attempts.push(n),async()=>{});
  assert.equal(calls,3);assert.deepEqual(attempts,[1,2,3]);
});
test('network failure is bounded and gives an actionable error',async()=>{
  let calls=0;
  await assert.rejects(()=>uploadCvWithRetry(async()=>{calls++;throw new TypeError('Failed to fetch')},'es',undefined,async()=>{}),/3 intentos.*Reintentar/);
  assert.equal(calls,3);
});
test('permanent upload errors are not retried',async()=>{
  for(const status of [401,403,413,400]){let calls=0;await assert.rejects(()=>uploadCvWithRetry(async()=>{calls++;return{error:{statusCode:status}}},'es',undefined,async()=>{}));assert.equal(calls,1);}
});
test('validates files and normalizes mobile MIME types by supported extension',()=>{
  assert.equal(resumeFormat({name:'CV.DOCX',size:123},'es').contentType,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  for(const file of [{name:'CV.jpg',size:123},{name:'CV.pdf',size:0},{name:'CV.pdf',size:10485761}])assert.throws(()=>resumeFormat(file,'es'));
  assert.equal(resumeFormat({name:'CV.pdf',size:10485760},'es').extension,'pdf');
});
test('uses a same-origin fallback only after direct network or timeout failures',()=>{
  assert.match(landeoSource,/\["network","timeout"\]\.includes\(reason\.code\)/);
  assert.match(landeoSource,/fetch\("\/api\/onboarding\/cv-upload"/);
  assert.match(landeoSource,/attempts:2,timeoutMs:45_000/);
});
test('fallback route verifies the user and enforces private CV limits',()=>{
  assert.match(fallbackRoute,/supabase\.auth\.getUser\(token\)/);
  assert.match(fallbackRoute,/MAX_FILE_SIZE=10\*1024\*1024/);
  assert.match(fallbackRoute,/storage\.from\("cvs"\)\.upload/);
  assert.match(fallbackRoute,/`\$\{user\.id\}\/cv\.\$\{extension\}`/);
});
