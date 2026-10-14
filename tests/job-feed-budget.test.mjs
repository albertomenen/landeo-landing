import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source=await readFile(new URL("../lib/landeo.ts",import.meta.url),"utf8");

test("job feed does not transfer full descriptions",()=>{
  const select=source.match(/const select="([^"]+)"/)?.[1]??"";
  assert.ok(select.includes("summary"));
  assert.ok(!select.includes("description"));
});

test("job feed keeps each source query bounded",()=>{
  const section=source.slice(source.indexOf("const recent="),source.indexOf("const failed="));
  const limits=[...section.matchAll(/\.limit\((\d+)\)/g)].map(match=>Number(match[1]));
  assert.ok(limits.length>=4);
  assert.ok(limits.every(limit=>limit<=100));
  assert.ok(!section.includes("topCompanies"));
});
