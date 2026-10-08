import test from 'node:test';
import assert from 'node:assert/strict';
import { prioritizeJobsByLocation, resolveCountryCode, cityLocationFilter } from '../lib/job-location.ts';
const jobs = [
  {id:'city', location:'Mexico City, Mexico', market:'MX', workMode:'onsite'},
  {id:'district', location:'Álvaro Obregón, Ciudad de México', market:'MX', workMode:'hybrid'},
  {id:'cdmx', location:'CDMX', market:'MX', workMode:'onsite'},
  {id:'other', location:'Guadalajara, Mexico', market:'MX', workMode:'onsite'},
  {id:'latam', location:'Remote, Latin America', market:'REMOTE', workMode:'remote'},
  {id:'eu', location:'Europe remote', market:'REMOTE', workMode:'remote'},
  {id:'us', location:'United States remote', market:'US', workMode:'remote'},
];
test('all Mexico City aliases produce the same eligible jobs', () => {
  for (const city of ['CDMX','Ciudad de México','Mexico City','Álvaro Obregón, Ciudad de México']) {
    assert.deepEqual(prioritizeJobsByLocation(jobs, city, 'México').map(j=>j.id), ['city','district','cdmx','latam']);
    assert.equal(resolveCountryCode('', city), 'MX');
    assert.match(cityLocationFilter(city), /Mexico City/);
  }
});
test('explicit country is authoritative and unrelated cities stay excluded', () => {
  assert.equal(resolveCountryCode('US', 'New Mexico'), 'US');
  assert.deepEqual(prioritizeJobsByLocation(jobs, 'Madrid', 'España').map(j=>j.id), ['eu']);
});
