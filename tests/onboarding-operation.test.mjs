import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingOperation,OnboardingOperationError,safeErrorCode,reuseUploadedCv} from '../lib/onboarding-operation.ts';

const fast={locale:'es',timeoutMs:10,wait:async()=>{}};
test('a hung request is aborted and the bounded retry eventually fails',async()=>{
  const signals=[];
  await assert.rejects(onboardingOperation('profile_save',signal=>{signals.push(signal);return new Promise(()=>{})},fast),e=>e instanceof OnboardingOperationError&&e.stage==='profile_save'&&e.code==='timeout');
  assert.equal(signals.length,2);assert.ok(signals.every(s=>s.aborted));
});
test('transient save failure retries and succeeds',async()=>{
  let calls=0;const attempts=[];
  const result=await onboardingOperation('profile_save',async()=>{if(++calls===1)throw new TypeError('Failed to fetch');return 'saved'},{...fast,onAttempt:n=>attempts.push(n)});
  assert.equal(result,'saved');assert.deepEqual(attempts,[1,2]);
});
test('database timeout retries but validation and authorization errors do not',async()=>{
  for(const [code,expected] of [['57014',2],['42501',1],['23514',1],['403',1]]){
    let calls=0;
    await assert.rejects(onboardingOperation('profile_save',async()=>{calls++;throw{code,message:'private information'}},fast),e=>e.code===code&&!e.message.includes('private information'));
    assert.equal(calls,expected);
  }
});
test('upload cache is scoped to File identity and user and only caches success',async()=>{
  const file={};let calls=0;
  const upload=async()=>{calls++;return 'user/cv.pdf'};
  await reuseUploadedCv(file,'user',upload);await reuseUploadedCv(file,'user',upload);assert.equal(calls,1);
  await reuseUploadedCv({},'user',upload);await reuseUploadedCv(file,'another-user',upload);assert.equal(calls,3);
  const failedFile={};await assert.rejects(reuseUploadedCv(failedFile,'user',async()=>{throw Error('failed')}));
  await reuseUploadedCv(failedFile,'user',upload);assert.equal(calls,4);
});
test('telemetry does not include raw messages, emails or arbitrary codes',()=>{
  assert.equal(safeErrorCode({message:'Email private@example.com not found'}),'unknown');
  assert.equal(safeErrorCode({code:'private@example.com'}),'unknown');
  assert.equal(safeErrorCode({code:'over_email_send_rate_limit'}),'over_email_send_rate_limit');
  assert.equal(safeErrorCode(new DOMException('slow','TimeoutError')),'timeout');
});
test('late completion cannot turn a timeout into success',async()=>{
  let resolve;
  const result=onboardingOperation('profile_read',()=>new Promise(r=>{resolve=r}),{...fast,attempts:1});
  await assert.rejects(result,/profile_read\/timeout/);resolve('late');
});
