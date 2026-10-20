// Generates codes through the admin API; sends no emails and never prints tokens.
// The randomly named temporary account is removed in the finally block.
import {randomBytes,randomUUID} from "node:crypto";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const adminKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!publicKey||!adminKey)throw new Error("Missing Supabase test configuration");
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:"pkce"}};
const admin=createClient(url,adminKey,options);
const email=`landeo-auth-qa-${randomUUID()}@example.com`;
let temporaryUserId;
try{
  const signup=await admin.auth.admin.generateLink({type:"signup",email,password:randomBytes(32).toString("base64url")});
  if(signup.error)throw signup.error;
  assert.equal(signup.data.user.email,email);
  temporaryUserId=signup.data.user.id;
  const code=signup.data.properties.email_otp;
  assert.match(code,/^\d{8}$/);
  // This client has no PKCE verifier and is different from the requesting client.
  const client=createClient(url,publicKey,options);
  const verified=await client.auth.verifyOtp({email,token:code,type:"email"});
  if(verified.error)throw verified.error;
  assert.equal(verified.data.user.id,temporaryUserId);
  assert.ok(verified.data.session);
  console.log("PASS signup code establishes a session without the original browser");
  const refreshed=await client.auth.refreshSession({refresh_token:verified.data.session.refresh_token});
  if(refreshed.error)throw refreshed.error;
  assert.ok(refreshed.data.session);
  console.log("PASS session refresh");
  const reused=await createClient(url,publicKey,options).auth.verifyOtp({email,token:code,type:"email"});
  assert.ok(reused.error);
  console.log("PASS already used code rejected");
  const magic=await admin.auth.admin.generateLink({type:"magiclink",email});
  if(magic.error)throw magic.error;
  const returning=await createClient(url,publicKey,options).auth.verifyOtp({email,token:magic.data.properties.email_otp,type:"email"});
  if(returning.error)throw returning.error;
  assert.equal(returning.data.user.id,temporaryUserId);
  console.log("PASS returning account code establishes a new session");
}finally{
  if(temporaryUserId){
    const{data,error:lookupError}=await admin.auth.admin.getUserById(temporaryUserId);
    if(lookupError)throw lookupError;
    assert.equal(data.user.email,email);
    const{error}=await admin.auth.admin.deleteUser(temporaryUserId);
    if(error)throw error;
    console.log("PASS temporary QA account removed");
  }
}
