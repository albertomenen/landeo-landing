import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const source=await readFile(new URL('../components/JobsLoading.tsx',import.meta.url),'utf8');
const key='__landeoLoadingTest';
globalThis[key]=React;
const isolated=`const React=globalThis.${key};const {useEffect,useState}=React;\n${source.replace(/^import .*;\s*$/gm,'')}`;
const {outputText}=ts.transpileModule(isolated,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}});
const {default:JobsLoading}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('loading renders an accessible branded placeholder in both languages',()=>{
  for(const [locale,title] of [['es','Cargando tus oportunidades'],['en','Loading your opportunities']]){
    const html=renderToStaticMarkup(React.createElement(JobsLoading,{locale,onRetry:()=>{}}));
    assert.ok(html.includes(title));assert.match(html,/role="status"/);assert.match(html,/aria-busy="true"/);assert.match(html,/jobs-wait-sheet/);assert.doesNotMatch(html,/\d+%|Todo listo/);
  }
});
test('pending catalogue and errors never render a successful empty state',async()=>{
  const app=await readFile(new URL('../components/ProductApp.tsx',import.meta.url),'utf8');
  assert.ok(app.includes('(loading || refreshing || query.trim()!==debouncedQuery) && !job'));
  assert.ok(app.includes(') : feedError ? ('));
  assert.ok(source.includes('elapsed>=12'));assert.ok(source.includes('elapsed>=25'));assert.ok(source.includes('clearInterval(timer)'));
  const css=await readFile(new URL('../app/globals.css',import.meta.url),'utf8');
  assert.match(css,/@media \(prefers-reduced-motion: reduce\) \{ \.jobs-wait-search/);
});
test('a long wait explains the delay and eventually offers an explicit reload',async()=>{
  for(const elapsed of [12,25]){
    const code=`const React=globalThis.${key};const useEffect=()=>{};const useState=()=>[${elapsed},()=>{}];\n${source.replace(/^import .*;\s*$/gm,'')}`;
    const compiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
    const {default:View}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
    const html=renderToStaticMarkup(React.createElement(View,{locale:'es',onRetry:()=>{}}));
    assert.match(html,/Está tardando un poco más/);
    assert.equal(html.includes('Volver a cargar'),elapsed>=25);
  }
});
