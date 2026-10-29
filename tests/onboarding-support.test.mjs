import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../components/Onboarding.tsx',import.meta.url),'utf8');

test('support report requires a useful description and preserves the technical error',()=>{
  assert.match(source,/reportDescription\.trim\(\)\.length>=10/);
  assert.match(source,/Descripción:\\n\$\{reportDescription\.trim\(\)\}/);
  assert.match(source,/Mensaje técnico:\\n\$\{error\|\|"Sin mensaje visible"\}/);
  assert.match(source,/href=\{reportReady\?supportHref:undefined\}/);
});

test('support report provides an accessible in-app explanation field',()=>{
  assert.match(source,/role="dialog" aria-modal="true"/);
  assert.match(source,/id="onboarding-report-description"/);
  assert.match(source,/No incluyas contraseñas/);
});
