import assert from "node:assert/strict";
import test from "node:test";
import { mergeProtectedJobMetadata } from "../scripts/lib/preserve-job-metadata.mjs";

test("preserves verified company address metadata during a feed refresh", () => {
  const result = mergeProtectedJobMetadata(
    { source_url: "https://new.example/job", market_country: "ES", imported_at: "new" },
    {
      source_url: "https://old.example/job",
      company_office_address: "Calle Mayor 1, Madrid, España",
      company_office_city: "Madrid",
      company_office_address_source_url: "https://company.example/contact",
      company_office_address_verified_at: "2026-10-14",
    },
  );

  assert.equal(result.source_url, "https://new.example/job");
  assert.equal(result.imported_at, "new");
  assert.equal(result.company_office_address, "Calle Mayor 1, Madrid, España");
  assert.equal(result.company_office_city, "Madrid");
  assert.equal(result.company_office_address_verified_at, "2026-10-14");
});

test("does not resurrect unrelated stale metadata", () => {
  const result = mergeProtectedJobMetadata(
    { requirements: ["New requirement"] },
    { requirements: ["Old requirement"], salary_text: "Old salary" },
  );

  assert.deepEqual(result.requirements, ["New requirement"]);
  assert.equal(result.salary_text, undefined);
});
