import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

test("shows validated first jobs before slow catalogue queries finish and shares that batch", async () => {
  let finishCatalogue;
  const catalogue = new Promise(resolve => { finishCatalogue = resolve; });
  let broadStarted = false;
  const validatedIds = [];
  const row = {
    id: "38474645-0861-4e43-98e3-2c483433b98b", title: "Developer",
    company: "Example", location: "Remote", work_mode: "Remoto",
    published_at: "2026-10-19T10:00:00Z", metadata: {},
    application_capability: "external",
  };
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }) },
    from() {
      let limit = 0;
      const query = {
        select() { return query; }, eq() { return query; },
        in() { return query; }, or() { return query; },
        order() { return query; }, limit(value) { limit = value; return query; },
        then(resolve, reject) {
          if (limit > 24) broadStarted = true;
          return (limit > 24 ? catalogue : Promise.resolve())
            .then(() => ({ data: [row], error: null })).then(resolve, reject);
        },
      };
      return query;
    },
    functions: { invoke: async (_name, { body }) => {
      validatedIds.push(...body.jobIds);
      return { data: { jobIds: body.jobIds }, error: null };
    } },
  };
  const mockKey = `__jobsTest${Date.now()}`;
  globalThis[mockKey] = client;
  const source = await readFile(new URL("../lib/landeo.ts", import.meta.url), "utf8");
  const isolated = `
    const createSupabaseBrowserClient = () => globalThis[${JSON.stringify(mockKey)}];
    const calculateJobMatch = () => ({score: 80, reasons: []});
    const isJobProfessionallyRelevant = () => true;
    const isJobWorkAuthorizationCompatible = () => true;
    const resolveCountryCode = () => "";
    const cityLocationFilter = () => "";
    const prioritizeJobsWithRemoteFallback = jobs => jobs;
    ${source.replace(/^import .*;\s*$/gm, "")}
  `;
  const { outputText } = ts.transpileModule(isolated, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  try {
    const { loadJobs } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
    let firstBatch;
    const initial = new Promise(resolve => { firstBatch = resolve; });
    let completed = false;
    const pending = loadJobs(120, {}, firstBatch).then(jobs => { completed = true; return jobs; });
    assert.deepEqual((await initial).map(job => job.id), [row.id]);
    assert.equal(completed, false);
    assert.deepEqual(validatedIds, [row.id]);
    let shared;
    const second = loadJobs(120, {}, jobs => { shared = jobs; });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(shared?.[0]?.id, row.id);
    assert.equal(broadStarted, true);
    finishCatalogue();
    assert.deepEqual((await pending).map(job => job.id), [row.id]);
    assert.deepEqual(await second, await pending);
  } finally {
    finishCatalogue();
    delete globalThis[mockKey];
  }
});
