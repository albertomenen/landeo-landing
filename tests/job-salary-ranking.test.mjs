import test from 'node:test';
import assert from 'node:assert/strict';
import {salaryAnnualEuros,prioritizeHighSalaryRemote} from '../lib/job-salary-ranking.ts';
import {remoteLocationEligibility} from '../lib/job-location.ts';
const rates={date:'2026-10-21',rates:{EUR:1,USD:1.1,MXN:22}};
const job=(id,minimum,currency='EUR',period='year',extra={})=>({id,location:'Worldwide remote',market:'REMOTE',workMode:'remote',match:90,salaryMin:minimum,salaryMax:minimum*1.2,salaryCurrency:currency,metadata:{salary_interval:period},...extra});
test('compares published minimums across currencies and explicit periods',()=>{
  assert.equal(salaryAnnualEuros(job('monthly',5000,'EUR','month'),rates),60000);
  assert.equal(salaryAnnualEuros(job('pesos',1320000,'MXN'),rates),60000);
  assert.equal(salaryAnnualEuros(job('hourly',100,'USD','per-hour-wage'),rates),null);
  assert.equal(salaryAnnualEuros(job('unknown',100000,'EUR',''),rates),null);
  assert.equal(salaryAnnualEuros(job('estimated',100000,'EUR','year',{metadata:{salary_interval:'year',salary_estimated:true}}),rates),null);
});
test('highlights at most three compatible strong matches without losing other jobs',()=>{
  const jobs=[job('low',30000),job('best',100000),job('second',90000),job('third',80000),job('irrelevant',200000,'EUR','year',{match:50}),job('us',300000,'EUR','year',{location:'United States remote',market:'US'})];
  const sorted=prioritizeHighSalaryRemote(jobs,'Barcelona','España',rates);
  assert.deepEqual(sorted.slice(0,3).map(j=>j.id),['best','second','third']);
  assert.equal(sorted.filter(j=>j.metadata.salary_featured).length,3);
  assert.equal(sorted.length,jobs.length);
  assert.deepEqual(prioritizeHighSalaryRemote(jobs,'Barcelona','España',null),jobs);
});
test('country restrictions override promotion and ordinary words are not country codes',()=>{
  assert.equal(remoteLocationEligibility(job('eu',100000,'EUR','year',{location:'Remote in Europe'}),'Delhi','India'),false);
  assert.equal(remoteLocationEligibility(job('eu',100000,'EUR','year',{location:'Remote in Europe'}),'Barcelona','España'),true);
  assert.equal(remoteLocationEligibility(job('restricted',100000,'EUR','year',{metadata:{listed_countries:['US','CA']}}),'Barcelona','España'),false);
  assert.equal(remoteLocationEligibility(job('unknown',100000,'EUR','year',{location:'Remote'}),'Barcelona','España'),null);
});
