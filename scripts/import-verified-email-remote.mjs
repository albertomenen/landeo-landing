// Dry-run first; --write enables only officially published email application targets.
import {readFile} from "node:fs/promises";
import {createHash,randomUUID} from "node:crypto";
import {resolveMx} from "node:dns/promises";
import {createClient} from "@supabase/supabase-js";

const write=process.argv.includes("--write");
const rows=JSON.parse(await readFile(new URL("./verified-email-remote-2026-10-20.json",import.meta.url),"utf8"));
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const now=new Date().toISOString(),batch="verified-email-remote-2026-10-20";
const pages=new Map(),domains=new Map();
const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
async function officialPage(url){
  if(!pages.has(url))pages.set(url,(async()=>{
    const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`Official source failed: ${response.status} ${url}`);
    if(new URL(response.url).pathname.replace(/\/$/,"")!==new URL(url).pathname.replace(/\/$/,""))throw new Error(`Vacancy redirected: ${url}`);
    const html=await response.text();
    const protectedEmails=[...html.matchAll(/(?:data-cfemail="|email-protection#)([0-9a-f]+)/gi)].map(match=>{
      const key=parseInt(match[1].slice(0,2),16);return Buffer.from(match[1].slice(2),"hex").map(byte=>byte^key).toString();
    });
    return{html:`${html} ${protectedEmails.join(" ")}`,text:normalize(html.replace(/<[^>]*>/g," "))};
  })());
  return pages.get(url);
}
const report={mode:write?"write":"dry-run",batch,reviewed:rows.length,newJobs:0,upgradedJobs:0,alreadyAutomatic:0,closedSkipped:0,verified:[]};
for(const entry of rows){
  const page=await officialPage(entry.url);
  if(!page.text.includes(normalize(entry.verifyTitle||entry.title)))throw new Error(`Role not found: ${entry.company} ${entry.title}`);
  if(!page.text.includes(normalize(entry.evidence)))throw new Error(`Application instructions not found: ${entry.company}`);
  if(!page.html.toLowerCase().includes(entry.email.toLowerCase()))throw new Error(`Published email not found: ${entry.company}`);
  const domain=entry.email.split("@")[1];
  if(!domains.has(domain))domains.set(domain,resolveMx(domain));
  const mx=await domains.get(domain);if(!mx.some(row=>row.exchange&&row.exchange!=="."))throw new Error(`No mail exchange: ${domain}`);
  const{data:existing,error}=await db.from("jobs").select("id,title,status,location,metadata,application_capability").eq("company",entry.company);if(error)throw error;
  const old=existing.find(row=>normalize(row.title)===normalize(entry.title)||
    (row.metadata?.source_url===entry.url&&normalize(row.title)===normalize(entry.verifyTitle||entry.title)));
  if(old&&old.status!=="active"){report.closedSkipped++;continue;}
  const id=old?.id||randomUUID();
  const metadata={...old?.metadata,source_url:entry.url,canonical_apply_url:entry.url,apply_provider:"email",market_country:entry.market,
    auto_apply_allowed_countries:entry.allowedCountries,remote_scope:entry.allowedCountries.length?"country":"unspecified",
    verified_email_application:true,official_company_board:true,verified_at:now,import_batch:batch,posting_language:"en",
    application_subject:entry.subject,publication_date_unknown:!entry.publishedAt,...(entry.currency?{salary_currency:entry.currency,salary_interval:"year"}:{})};
  const{data:oldTarget,error:targetLookupError}=await db.from("job_application_targets").select("*").eq("job_id",id).maybeSingle();if(targetLookupError)throw targetLookupError;
  if(oldTarget?.mode==="email"&&oldTarget.apply_email&&oldTarget.apply_email.toLowerCase()!==entry.email.toLowerCase())throw new Error(`Existing recipient differs: ${entry.company}`);
  report.verified.push({company:entry.company,title:entry.title,email:entry.email,url:entry.url,allowedCountries:entry.allowedCountries});
  if(!write)continue;
  if(!old){
    const externalId=createHash("sha256").update(`${entry.url}|${entry.title}`).digest("hex");
    const{error:insertError}=await db.from("jobs").insert({id,source:"Official email verified",external_id:externalId,company:entry.company,title:entry.title,
      location:entry.location,work_mode:"Remoto",summary:entry.description,description:entry.description,
      salary_min:entry.salaryMin||null,salary_max:entry.salaryMax||null,contract_type:entry.contractType||null,seniority:entry.seniority||null,
      industry:entry.industry,status:"closed",published_at:entry.publishedAt||null,apply_mode:"direct",application_capability:"automatic",application_provider:"email",metadata});
    if(insertError)throw insertError;
  }
  const target={job_id:id,mode:"email",provider:"email",apply_email:entry.email,apply_url:entry.url,email_authorized:true,email_authorized_at:now,email_source_url:entry.url,
    metadata:{...oldTarget?.metadata,application_subject:entry.subject,verified_at:now,source_url:entry.url,import_batch:batch,internal_intake:false,
      authorization_basis:"The official vacancy explicitly accepts applications by email to this published recipient."}};
  const{error:targetError}=await db.from("job_application_targets").upsert(target,{onConflict:"job_id"});if(targetError)throw targetError;
  const{error:updateError}=await db.from("jobs").update({status:"active",apply_mode:"direct",application_capability:"automatic",application_provider:"email",metadata}).eq("id",id);if(updateError)throw updateError;
  if(!old)report.newJobs++;else if(old.application_capability==="automatic")report.alreadyAutomatic++;else report.upgradedJobs++;
}
console.log(JSON.stringify(report,null,2));
