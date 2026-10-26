// Updates the two email templates and subjects, and optionally the code length:
//   node scripts/configure-email-otp.mjs            # templates only
//   node scripts/configure-email-otp.mjs --length=6 # also switch the code to 6 digits
// The site accepts 6 and 8 digits, so publish the site first. Never prints credentials.
import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";

const project="eldzbshnxvvaitgvgzbu";
let token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token){
  token=execFileSync("security",["find-generic-password","-s","Supabase CLI","-a","supabase","-w"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
}
const endpoint=`https://api.supabase.com/v1/projects/${project}/config/auth`;
const headers={authorization:`Bearer ${token}`,"content-type":"application/json"};
const previous=await fetch(endpoint,{headers});
if(!previous.ok)throw new Error(`Could not read auth configuration (${previous.status})`);
const current=await previous.json();
const requested=(process.argv.find(arg=>arg.startsWith("--length="))||"").split("=")[1];
if(requested&&!["6","8"].includes(requested))throw new Error("--length must be 6 or 8");
if(![6,8].includes(current.mailer_otp_length)||current.mailer_otp_exp!==3600)throw new Error("Review the configured OTP length/expiry before updating templates");
if(current.hook_send_email_enabled)throw new Error("An email hook overrides these templates; review it first");
const content=await readFile(new URL("../supabase/templates/email-code.html",import.meta.url),"utf8");
const response=await fetch(endpoint,{method:"PATCH",headers,body:JSON.stringify({
  ...(requested?{mailer_otp_length:Number(requested)}:{}),
  mailer_templates_confirmation_content:content,
  mailer_templates_magic_link_content:content,
  mailer_subjects_confirmation:"Tu código para crear tu perfil en Landeo",
  mailer_subjects_magic_link:"Tu código de acceso a Landeo",
})});
if(!response.ok)throw new Error(`Could not update auth templates (${response.status})`);
const result=await response.json();
if(result.mailer_templates_confirmation_content!==content||result.mailer_templates_magic_link_content!==content)throw new Error("Email template update could not be verified");
if(requested&&result.mailer_otp_length!==Number(requested))throw new Error("Code length update could not be verified");
console.log(`Verified: signup and sign-in emails now carry a ${result.mailer_otp_length}-digit code plus the one-click link.`);
