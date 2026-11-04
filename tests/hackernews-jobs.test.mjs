import test from 'node:test';
import assert from 'node:assert/strict';
import {hnPostToJob} from '../supabase/functions/_shared/hackernews-jobs.ts';
const helpers={targetMarket:v=>/germany|berlin/i.test(v)?'DE':/seattle|chicago|new york/i.test(v)?'US':null,inferredSeniority:t=>/senior/i.test(t)?'Senior':null};
const post=(text,id=1)=>hnPostToJob({id,text,created_at:'2026-11-01T10:00:00Z'},helpers);
test('imports a remote post with a clearly stated application email',()=>{
  const job=post('Acme | Senior Backend Engineer | REMOTE (worldwide) | Full-time<p>Send your CV and a short note to jobs@acme.dev to apply for this position.');
  assert.equal(job.title,'Senior Backend Engineer');assert.equal(job.work_mode,'Remoto');assert.equal(job.target.apply_email,'jobs@acme.dev');
  assert.equal(job.target.email_authorized,true);assert.match(job.target.email_source_url,/news\.ycombinator\.com\/item\?id=1$/);assert.equal(job.metadata.auto_apply_allowed_countries,undefined);
});
test('residence restrictions are carried over, including U.S. citizens',()=>{
  assert.deepEqual(post('GovStar | Security Engineer | Remote (U.S. Eastern/Central Time), U.S. Citizens<p>Email your resume to careers@govstar.us to apply for the job.').metadata.auto_apply_allowed_countries,['US']);
  assert.deepEqual(post('Foo | Software Engineer | Remote (US only)<p>Send your CV to hr@foo.io to apply for this vacancy.').metadata.auto_apply_allowed_countries,['US']);
  assert.equal(post('Bar | Software Engineer | Remote (US/EU timezones preferred)<p>Apply by sending your CV to jobs@bar.io for this position.').metadata.auto_apply_allowed_countries,undefined);
});
test('on-site posts are limited to their country and need a known one',()=>{
  assert.deepEqual(post('Baz | Software Engineer | Berlin | ONSITE<p>Please email your CV to jobs@baz.de to apply for this job position.').metadata.auto_apply_allowed_countries,['DE']);
  assert.equal(post('Qux | Software Engineer | Atlantis | ONSITE<p>Please email your CV to jobs@qux.com to apply for this job position.'),null);
});
test('posts without a verifiable application email, or asking for an online form, are skipped',()=>{
  assert.equal(post('Acme | Software Engineer | REMOTE<p>Apply at https://acme.com/jobs'),null);
  assert.equal(post('Acme | Software Engineer | REMOTE<p>Contact press@acme.com for media questions only.'),null);
  assert.equal(post('Acme | Software Engineer | REMOTE<p>Apply online through our application form at https://acme.com/apply or email jobs@acme.com with your CV for this job.'),null);
  assert.equal(post('[dead]'),null);
});
test('free-mail domains are never used as the company domain',()=>{
  assert.equal(post('Solo | Software Engineer | REMOTE (worldwide)<p>Send your CV to hiring.solo@gmail.com to apply for this position.').metadata.company_domain,null);
});
