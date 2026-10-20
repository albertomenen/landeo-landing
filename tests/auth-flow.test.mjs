import assert from "node:assert/strict";
import test from "node:test";
import {authDestination,authErrorCategory,readableAuthError,safeAuthNext} from "../lib/auth-flow.ts";

test("keeps auth destinations local and preserves the requested dashboard route",()=>{
  for(const value of ["https://evil.example","//evil.example","/\\evil.example","/\nevil.example",null])assert.equal(safeAuthNext(value),"/app/jobs");
  assert.equal(safeAuthNext("/app/saved?from=email"),"/app/saved?from=email");
  assert.equal(authDestination("/app/saved",true),"/app/saved");
  assert.equal(authDestination("/onboarding?step=1",true),"/app/jobs");
  assert.equal(authDestination("/app/saved",false),"/onboarding");
  assert.equal(authDestination("/app/saved",null),"/app/jobs");
});
test("gives actionable errors for OTP, PKCE, delivery limits and connection failures",()=>{
  for(const [code,category] of [["otp_expired","expired"],["pkce_code_verifier_not_found","pkce"],["flow_state_not_found","pkce"],["over_email_send_rate_limit","rate_limited"],["signup_disabled","account_missing"],["disallowed_useragent","access_denied"]])assert.equal(authErrorCategory({code}),category);
  assert.match(readableAuthError({code:"pkce_code_verifier_not_found"}),/código/);
  assert.match(readableAuthError(new TypeError("Failed to fetch")),/conexión/);
  assert.match(readableAuthError({code:"over_email_send_rate_limit"}),/minuto/);
});
