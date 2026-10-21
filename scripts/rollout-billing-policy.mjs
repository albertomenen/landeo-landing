// Applies this one additive migration only; never runs unrelated migrations.
import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
const project="eldzbshnxvvaitgvgzbu";
let token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token)token=execFileSync("security",["find-generic-password","-s","Supabase CLI","-a","supabase","-w"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
const apply=process.argv.includes("--apply");
const query=apply?await readFile(new URL("../supabase/migrations/20261021120000_add_billing_acceptances.sql",import.meta.url),"utf8"):"select to_regclass('public.billing_acceptances') is not null as exists, (select relrowsecurity from pg_class where oid=to_regclass('public.billing_acceptances')) as rls;";
const result=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({query})});
if(!result.ok)throw new Error(`Billing migration request failed (${result.status}); no secrets logged.`);
if(apply)console.log("Applied only 20261021120000_add_billing_acceptances.sql.");
else console.log(JSON.stringify(await result.json()));
