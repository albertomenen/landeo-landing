import assert from "node:assert/strict";
import test from "node:test";
import {autoApplyGeographyCompatible} from "../supabase/functions/_shared/auto-apply-geography.ts";

test("remote country restrictions require the candidate to be based in an allowed country",()=>{
  const job={metadata:{auto_apply_allowed_countries:["US"]}};
  assert.equal(autoApplyGeographyCompatible(job,{universal_profile:{country:"Estados Unidos"}}),true);
  assert.equal(autoApplyGeographyCompatible(job,{universal_profile:{country:"España"}}),false);
  assert.equal(autoApplyGeographyCompatible(job,{universal_profile:{country:"Colombia"}}),false);
  assert.equal(autoApplyGeographyCompatible(job,{}),false);
  assert.equal(autoApplyGeographyCompatible(job,{location:"Austin, United States"}),true);
  assert.equal(autoApplyGeographyCompatible(job,{location:"New Delhi, India"}),false);
});
test("an explicitly global offer remains eligible regardless of residence",()=>{
  assert.equal(autoApplyGeographyCompatible({metadata:{auto_apply_allowed_countries:[]}},{universal_profile:{country:"México"}}),true);
});
