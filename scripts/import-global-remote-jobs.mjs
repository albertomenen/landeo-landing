// Official live ATS boards. Dry-run by default; inserts only, never reopens or overwrites jobs.
// node --env-file=.env.local scripts/import-global-remote-jobs.mjs --write
import {randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";

const write=process.argv.includes("--write");
const batch=`global-remote-${new Date().toISOString().slice(0,10)}`;
const cutoff=Date.now()-90*24*60*60*1000;
const boards=[
  ["Ashby","supabase","Supabase"],["Ashby","ashby","Ashby"],
  ["Ashby","posthog","PostHog"],["Ashby","n8n","n8n"],
  ["Ashby","buffer","Buffer"],["Ashby","testgorilla","TestGorilla"],
  ["Ashby","oyster","Oyster"],["Ashby","zapier","Zapier"],
  ["Ashby","docker","Docker"],["Ashby","elevenlabs","ElevenLabs"],
  ["Ashby","linear","Linear"],
  ["Greenhouse","gitlab","GitLab"],["Greenhouse","canonical","Canonical"],
  ["Greenhouse","grafanalabs","Grafana Labs"],["Greenhouse","wikimedia","Wikimedia Foundation"],
  ["Greenhouse","hubspotjobs","HubSpot"],
];
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error("Supabase configuration required");
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const report={batch,mode:write?"write":"dry-run",sources:[],candidateJobs:0,existing:0,duplicates:0,selected:0,added:0,targets:0,active:0,companies:{},scopes:{},markets:{},sectors:{},seniority:{},examples:[]};
const remotePattern=/\b(remote|worldwide|anywhere|home[ -]?based|work from home)\b/i;
const fingerprint=row=>[row.company,row.title,row.location].map(v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()).join("|");
const clean=value=>String(value||"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
const aliases=[
  ["US",/united states|\bUS\b|\busa\b|\bu\.s\.?\b|san francisco|bay area|new york|boston|california|washington state|texas|florida|virginia|new jersey|massachusetts|colorado/i],["GB",/united kingdom|\buk\b|england/i],
  ["ES",/spain|españa|madrid|barcelona/i],["MX",/m[eé]xico/i],["CO",/colombia/i],
  ["AR",/argentina/i],["BR",/brazil|brasil/i],["CA",/canada/i],["DE",/germany|berlin/i],
  ["FR",/france/i],["PT",/portugal/i],["NL",/netherlands/i],["IE",/ireland/i],
  ["PL",/poland/i],["RO",/romania/i],["HU",/hungary/i],["AU",/australia/i],
  ["IN",/india/i],["JP",/japan/i],["SG",/singapore/i],["ZA",/south africa/i],
  ["SE",/sweden/i],["CH",/switzerland/i],["DK",/denmark/i],["NO",/norway/i],
  ["FI",/finland/i],["IT",/italy/i],["AT",/austria/i],["BE",/belgium/i],
  ["EE",/estonia/i],["CZ",/czech/i],["LT",/lithuania/i],["LV",/latvia/i],
  ["UA",/ukraine/i],["NZ",/new zealand/i],["AE",/united arab emirates|dubai/i],
  ["IL",/israel/i],["KR",/south korea/i],["PH",/philippines/i],["TH",/thailand/i],
  ["VN",/vietnam/i],["NG",/nigeria/i],["KE",/kenya/i],["EG",/egypt/i],
  ["PK",/pakistan/i],["BD",/bangladesh/i],["ID",/indonesia/i],["MY",/malaysia/i],
  ["TR",/turkey|türkiye/i],["CL",/chile/i],["PE",/peru|perú/i],
];
function geography(location,title){
  const text=`${location} ${title}`;
  const countries=aliases.filter(([,pattern])=>pattern.test(text)).map(([code])=>code);
  const regional=/\b(EMEA|APAC|LATAM|AMER|NAMER|EU|EEA|Europe|European|Americas|Asia|Africa|UTC|time.?zone)\b/i.test(text);
  const worldwide=/\b(worldwide|global|anywhere|any location)\b/i.test(location)&&countries.length===0&&!regional;
  return{market:countries.length===1&&!regional?countries[0]:"REMOTE",scope:worldwide?"worldwide":regional||countries.length>1?"regional":countries.length===1?"country":"unspecified",countries};
}
function sector(title,department){
  const text=`${title} ${department}`;
  if(/customer success|customer support|technical support|customer experience/i.test(text))return "Customer Success & Support";
  if(/marketing|growth|content|communications|demand generation/i.test(text))return "Marketing";
  if(/sales|account executive|business development|partnership/i.test(text))return "Sales";
  if(/design|designer|\bux\b|\bui\b/i.test(text))return "Design";
  if(/finance|accounting|payroll|financial|accounts payable/i.test(text))return "Finance";
  if(/people|talent|recruit|human resources/i.test(text))return "Human Resources";
  if(/product manager|product management/i.test(text))return "Product";
  if(/data|analytics|machine learning/i.test(text))return "Data & AI";
  if(/engineer|developer|software|security|infrastructure/i.test(text))return "Engineering";
  return clean(department)||"Operations";
}
function level(title){
  if(/\b(intern|internship|trainee|apprentice)\b|prácticas/i.test(title))return "Internship";
  if(/\b(junior|graduate|entry.level|new.grad)\b/i.test(title))return "Entry level";
  if(/\b(chief|director|head|vice president|vp)\b/i.test(title))return "Leadership";
  if(/\b(senior|staff|principal|lead|sr)\b/i.test(title))return "Senior";
  return null;
}
async function fetchBoard([source,board,company]){
  const endpoint=source==="Ashby"?`https://api.ashbyhq.com/posting-api/job-board/${board}`:`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`${company}: HTTP ${response.status}`);
  const payload=await response.json();
  const rows=[];
  for(const job of payload.jobs||[]){
    if(!job.id||!job.title||job.isListed===false)continue;
    if(/talent community|talent pool|future opportunities|future.*(?:openings|roles)|expressions? of interest|register.*interest|general application/i.test(job.title))continue;
    const original=source==="Ashby"?[job.location,...(job.secondaryLocations||[]).map(x=>x.location)].filter(Boolean).join(" · "):job.location?.name||"";
    const explicit=job.workplaceType?.toLowerCase()==="remote"||job.isRemote===true;
    if(job.workplaceType?.toLowerCase()==="hybrid"||(!explicit&&!remotePattern.test(original)))continue;
    const published=source==="Ashby"?job.publishedAt:job.first_published||job.first_published_at;
    if(published&&(!Number.isFinite(Date.parse(published))||Date.parse(published)<cutoff||Date.parse(published)>Date.now()+86400000))continue;
    const apply=job.applyUrl||job.absolute_url;
    if(!apply)continue;
    const applicationUrl=new URL(apply);
    if(applicationUrl.protocol!=="https:"||!/(^|\.)(ashbyhq\.com|greenhouse\.io)$/.test(applicationUrl.hostname))continue;
    const location=remotePattern.test(original)?original:`Remote · ${original||"Location not specified"}`;
    const geo=geography(location,job.title),description=clean(job.descriptionPlain||job.descriptionHtml||job.content).slice(0,16000);
    const department=job.department||(job.departments||[]).map(x=>x.name).join(" · ");
    rows.push({id:randomUUID(),source,external_id:`${board}:${job.id}`,company,title:clean(job.title),description,summary:description.slice(0,520),location,
      work_mode:"Remoto",salary_min:null,salary_max:null,contract_type:level(job.title)==="Internship"?"Internship":job.employmentType||null,
      seniority:level(job.title),industry:sector(job.title,department),apply_mode:"external",status:"closed",published_at:published||null,
      application_capability:"external",application_provider:"external",
      metadata:{source_url:apply,canonical_apply_url:apply,official_company_board:true,job_board:board,market_country:geo.market,
        remote_scope:geo.scope,listed_countries:geo.countries,source_locations:original,geographic_restrictions:original,
        verified_at:new Date().toISOString(),import_batch:batch,publication_date_unknown:!published,source_updated_at:job.updated_at||null}});
  }
  report.sources.push({company,board,listed:(payload.jobs||[]).length,remoteRecent:rows.length});
  return rows;
}
const all=[];
// Keep requests bounded to avoid loading the database or public boards in a burst.
for(let i=0;i<boards.length;i+=4){
  const results=await Promise.allSettled(boards.slice(i,i+4).map(fetchBoard));
  for(const result of results){if(result.status==="fulfilled")all.push(...result.value);else report.sources.push({error:result.reason.message})}
}
report.candidateJobs=all.length;
const selected=[],seen=new Set();
for(const company of new Set(all.map(x=>x.company))){
  const existing=[];
  for(let start=0;;start+=1000){
    const{data,error}=await db.from("jobs").select("id,source,external_id,company,title,location").eq("company",company).range(start,start+999);
    if(error)throw error;existing.push(...data);if(data.length<1000)break;
  }
  const identities=new Set(existing.map(x=>`${x.source}:${x.external_id}`)),fingerprints=new Set(existing.map(fingerprint));
  const current=all.filter(x=>x.company===company).sort((a,b)=>Date.parse(b.published_at||0)-Date.parse(a.published_at||0));
  let companyCount=0;
  for(const row of current){
    if(identities.has(`${row.source}:${row.external_id}`)){report.existing++;continue}
    const fp=fingerprint(row);
    if(fingerprints.has(fp)||seen.has(fp)){report.duplicates++;continue}
    if(companyCount>=80||selected.length>=600)continue;
    seen.add(fp);selected.push(row);companyCount++;
  }
}
report.selected=selected.length;
for(const row of selected){
  for(const[field,value]of[["companies",row.company],["scopes",row.metadata.remote_scope],["markets",row.metadata.market_country],["sectors",row.industry],["seniority",row.seniority||"Not specified"]])report[field][value]=(report[field][value]||0)+1;
}
report.examples=[...new Set(selected.map(x=>x.company))].map(company=>selected.find(x=>x.company===company)).slice(0,12).map(x=>({company:x.company,title:x.title,location:x.location,url:x.metadata.source_url}));
if(write){
  for(let start=0;start<selected.length;start+=50){
    const rows=selected.slice(start,start+50);
    const{data:inserted,error}=await db.from("jobs").upsert(rows,{onConflict:"source,external_id",ignoreDuplicates:true}).select("id");
    if(error)throw error;
    const ids=new Set(inserted.map(x=>x.id)),created=rows.filter(x=>ids.has(x.id));
    report.added+=created.length;
    if(!created.length)continue;
    const targets=created.map(row=>({job_id:row.id,mode:"external",apply_url:row.metadata.canonical_apply_url,metadata:{board_token:row.metadata.job_board,verified_at:row.metadata.verified_at,import_batch:batch}}));
    const{error:targetError}=await db.from("job_application_targets").insert(targets);if(targetError)throw targetError;
    report.targets+=targets.length;
    const{data:activated,error:activeError}=await db.from("jobs").update({status:"active"}).in("id",created.map(x=>x.id)).select("id");
    if(activeError)throw activeError;report.active+=activated.length;
  }
}
console.log(JSON.stringify(report,null,2));
