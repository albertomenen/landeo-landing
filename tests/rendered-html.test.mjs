import assert from "node:assert/strict";
import {access,readFile} from "node:fs/promises";
import test from "node:test";

const root=new URL("../",import.meta.url);

async function render(path="/"){
  const workerUrl=new URL("../dist/server/index.js",import.meta.url);
  workerUrl.searchParams.set("test",`${process.pid}-${Date.now()}-${path}`);
  const {default:worker}=await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`,{headers:{accept:"text/html"}}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});
}

test("server-renders the Landeo landing page and social metadata",async()=>{
  const response=await render();
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-type")??"",/^text\/html\b/i);
  const html=await response.text();
  assert.match(html,/<title>Landeo — Tu próximo trabajo empieza con un sí<\/title>/i);
  assert.match(html,/Tu próximo trabajo empieza con un/);
  assert.match(html,/og\.png/);
  assert.doesNotMatch(html,/codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders the main product route",async()=>{
  const response=await render("/app/jobs");
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/Empleos para ti/);
  assert.match(html,/Postularme/);
  assert.match(html,/Consultando el catálogo de Supabase/);
});

test("removes the disposable starter and keeps integration contracts",async()=>{
  const packageJson=await readFile(new URL("package.json",root),"utf8");
  const contracts=await readFile(new URL("lib/supabase/contracts.ts",root),"utf8");
  assert.doesNotMatch(packageJson,/react-loading-skeleton/);
  assert.match(packageJson,/@supabase\/ssr/);
  assert.doesNotMatch(packageJson,/@revenuecat\/purchases-js/);
  assert.match(contracts,/platform:"web"/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx",root)));
  await access(new URL("public/og.png",root));
});
