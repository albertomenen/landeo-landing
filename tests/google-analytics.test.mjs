import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const source=await readFile(new URL('../components/GoogleAnalytics.tsx',import.meta.url),'utf8');
const functions=source.slice(source.indexOf('function startAnalytics('),source.indexOf('function startClarity('));
function setup(){
  const scripts=[];const window={};
  const context=vm.createContext({window,document:{querySelector:()=>scripts[0]??null,createElement:()=>({dataset:{}}),head:{appendChild:s=>scripts.push(s)}}});
  vm.runInContext(ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  return{window,scripts,start:()=>context.startAnalytics('G-TEST'),stop:()=>context.stopAnalytics('G-TEST')};
}
test('GA initialization and events use Arguments commands recognized by Google',()=>{
  const h=setup();h.start();h.window.gtag('event','page_view',{page_path:'/'});
  assert.equal(h.scripts.length,1);
  assert.deepEqual(Array.from(h.window.dataLayer,c=>c[0]),['consent','js','config','event']);
  for(const command of h.window.dataLayer)assert.equal(Object.prototype.toString.call(command),'[object Arguments]');
  assert.equal(h.window.dataLayer[2][1],'G-TEST');
});
test('rejecting then accepting restores consent without installing a second tag',()=>{
  const h=setup();h.start();h.stop();assert.equal(h.window['ga-disable-G-TEST'],true);
  h.start();assert.equal(h.window['ga-disable-G-TEST'],false);assert.equal(h.scripts.length,1);
  const last=h.window.dataLayer.at(-1);assert.equal(last[1],'update');assert.equal(last[2].analytics_storage,'granted');
  assert.equal(last[2].ad_storage,'denied');
});
