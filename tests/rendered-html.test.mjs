import assert from "node:assert/strict";
import {access,readFile} from "node:fs/promises";
import test from "node:test";

const root=new URL("../",import.meta.url);

async function render(path="/",requestHeaders={}){
  const workerUrl=new URL("../dist/server/index.js",import.meta.url);
  workerUrl.searchParams.set("test",`${process.pid}-${Date.now()}-${path}`);
  const {default:worker}=await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`,{headers:{accept:"text/html",...requestHeaders}}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});
}

test("server-renders the Landeo landing page and social metadata",async()=>{
  const response=await render();
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-type")??"",/^text\/html\b/i);
  const html=await response.text();
  assert.match(html,/<title>Landeo — Deja los formularios\. Empieza a recibir respuestas<\/title>/i);
  assert.match(html,/Deja de rellenar formularios/);
  assert.match(html,/Automatizar sin perder el control/i);
  assert.match(html,/aria-label="Cambiar idioma"/i);
  assert.match(html,/og-bilingual\.png/);
  assert.match(html,/<meta name="msvalidate\.01" content="8817032EE0ED5D0365743F3506BDC91B"\s*\/>/i);
  assert.doesNotMatch(html,/codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders the English landing page for an English locale",async()=>{
  const response=await render("/",{"accept-language":"en-GB,en;q=0.9"});
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/Stop filling out forms/);
  assert.match(html,/Automation without losing control/i);
  assert.match(html,/aria-label="Change language"/i);
});

test("renders the main product route",async()=>{
  const response=await render("/app/jobs");
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/Empleos para ti/);
  assert.match(html,/Postularme/);
  assert.match(html,/Navegación móvil/);
  assert.match(html,/Consultando el catálogo de Supabase/);
});

test("renders localized legal documents and the Apple addendum",async()=>{
  const englishPrivacy=await render("/privacy?lang=en",{"accept-language":"es-ES"});
  assert.equal(englishPrivacy.status,200);
  const privacyHtml=await englishPrivacy.text();
  assert.match(privacyHtml,/Privacy Policy/);
  assert.match(privacyHtml,/permanently delete your account/);
  assert.match(privacyHtml,/alberto@haired\.app/);

  const spanishTerms=await render("/terms?lang=es",{"accept-language":"en-GB"});
  assert.equal(spanishTerms.status,200);
  const termsHtml=await spanishTerms.text();
  assert.match(termsHtml,/Términos de servicio/);
  assert.match(termsHtml,/Anexo de Apple App Store/);
  assert.match(termsHtml,/Apple Standard EULA/);
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
  await access(new URL("public/og-landing.png",root));
  await access(new URL("public/og-bilingual.png",root));
});
