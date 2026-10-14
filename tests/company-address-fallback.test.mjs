import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/company-address.ts", import.meta.url), "utf8");

test("the production address helper contains a fallback for every enriched Spanish company", () => {
  for (const company of ["Fever","Celonis","Cabify","Aircall","Job&Talent","Typeform","Wallapop","Octopus Energy","domestiko.com","Welocalize","NEORIS","Sofico","El Corte Ingles","Contentsquare","SIXT Spain","Stellantis","Factorial","Microsoft","Decathlon","Amazon","Concentrix"]) {
    assert.match(source, new RegExp(company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `Missing fallback for ${company}`);
  }
  assert.match(source, /companyOfficeAddressFromMetadata\(metadata[^)]*company/);
});
