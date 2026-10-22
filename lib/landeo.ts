import {FunctionsHttpError,type User} from "@supabase/supabase-js";
import {createSupabaseBrowserClient,getResilientSession} from "./supabase/client";
import type {ApplyCapability,Job} from "./fixtures";
import {prioritizeJobsWithRemoteFallback,resolveCountryCode,cityLocationFilter,isJobLocationCompatible} from "./job-location";
import {loadSalaryRates,prioritizeHighSalaryRemote} from "./job-salary-ranking";
import {requestBillingAcceptance} from "./billing-consent";
import {trackProductEvent} from "./analytics";
import {resumeFormat,uploadCvWithRetry} from "./cv-upload";
import {calculateJobMatch,isJobProfessionallyRelevant,isJobWorkAuthorizationCompatible,type MatchProfile} from "./job-match";

export type SwipeDirection="left"|"right"|"save";
export type ApplicationStatus="queued"|"processing"|"sent"|"action_required"|"viewed"|"interview"|"rejected"|"failed";
export type TrackingStage="applied"|"screening"|"interview"|"offer"|"closed";
export type ApplicationTracking={stage:TrackingStage;notes:string;nextAction:string;nextActionAt:string|null;updatedAt:string|null};
export type ApplyOutcome={status:"queued"|"sent"|"action_required"|"failed";message:string;actionUrl?:string;externalReference?:string};
export type CoverLetterPreview={status:"preview";message:string;coverLetter:string;generatedAt:string;model:string};
export type CoverLetterProfile={
  enabled:boolean;motivation:string;valueProposition:string;achievement:string;companyPreferences:string;
  doNotMention:string;tone:"professional"|"warm"|"direct";reviewBeforeSending:boolean;updatedAt:string;
};
export type UniversalProfile={
  version:1;firstName:string;lastName:string;addressLine:string;city:string;country:string;postalCode:string;
  githubUrl:string;websiteUrl:string;salaryCurrency:string;availability:string;noticePeriod:string;
  workAuthorizationCountries:string[];visaRequirement:string;willingToRelocate:boolean;
  languages:Array<{language:string;level:string}>;lastCompany:string;lastTitle:string;yearsExperience:number;
  generalMotivation:string;openToInternship:boolean;universityAgreement:string;
  privacyConsent:boolean;automaticApplicationConsent:boolean;
  coverLetter?:CoverLetterProfile;
};
export type CandidateProfile={
  id:string;fullName:string;email:string;phone:string;role:string;location:string;skills:string[];workModes:string[];
  minSalary:number|null;maxSalary:number|null;cvPath:string|null;universal:UniversalProfile|null;
  privacyConsentAt:string|null;automaticConsentAt:string|null;onboardingCompletedAt:string|null;
};
export type AutoApplySettings={
  enabled:boolean;roles:string[];locations:string[];workModes:string[];industries:string[];seniorityLevels:string[];
  excludedCompanies:string[];minimumMatch:number;dailyLimit:number;lastRunAt:string|null;nextRunAt:string|null;
};
export type AutoApplyDashboard={
  settings:AutoApplySettings;stats:{matched:number;queued:number;sent:number;delivered:number;actionRequired:number;failed:number};
  lastRun:{status:string;startedAt:string;completedAt:string|null;errorMessage:string|null}|null;
};
export type LiveApplication={
  id:string;jobId:string;status:ApplicationStatus;appliedAt:string;updatedAt:string;actionUrl:string|null;
  errorMessage:string|null;requiredFields:string[];deliveryStatus:string|null;coverLetter:string|null;
  coverLetterGeneratedAt:string|null;coverLetterUsageStatus:string|null;tracking:ApplicationTracking;job:Job;events:ApplicationEvent[];
};
export type ApplicationEvent={id:string;applicationId:string;type:string;message:string;createdAt:string;readAt:string|null};

type JobRow={
  id:string;external_id:string|null;source:string;company:string;title:string;summary:string|null;description:string|null;
  location:string|null;work_mode:string|null;salary_min:number|null;salary_max:number|null;contract_type:string|null;
  seniority:string|null;industry:string|null;apply_mode:string|null;published_at:string|null;metadata:Record<string,unknown>|null;
  application_capability:string|null;application_provider:string|null;
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JOB_CACHE_MS=60_000;
const DASHBOARD_CACHE_MS=30_000;
type TimedPromise<T>={expiresAt:number;value:Promise<T>};
type JobCacheEntry=TimedPromise<Job[]>&{initialJobs?:Job[];listeners:Set<(jobs:Job[])=>void>};
const jobsCache=new Map<string,JobCacheEntry>();
const applicationsCache=new Map<string,TimedPromise<LiveApplication[]>>();
const savedJobsCache=new Map<string,TimedPromise<Job[]>>();
type JobLoadOptions={includeDismissed?:boolean;includeWorldwide?:boolean;search?:string;careerLevel?:"internship"|"junior"};
function cacheKey(limit:number,options:JobLoadOptions){
  return JSON.stringify({limit,includeDismissed:Boolean(options.includeDismissed),includeWorldwide:Boolean(options.includeWorldwide),search:options.search?.trim().toLowerCase()??"",careerLevel:options.careerLevel??"all"});
}
function clearDashboardCaches(){jobsCache.clear();applicationsCache.clear();savedJobsCache.clear()}
const defaultUniversal=(user?:User|null):UniversalProfile=>({version:1,firstName:String(user?.user_metadata?.full_name??"").split(/\s+/)[0]??"",lastName:String(user?.user_metadata?.full_name??"").split(/\s+/).slice(1).join(" "),addressLine:"",city:"",country:"España",postalCode:"",githubUrl:"",websiteUrl:"",salaryCurrency:"EUR",availability:"",noticePeriod:"",workAuthorizationCountries:["España"],visaRequirement:"No necesito visado",willingToRelocate:false,languages:[],lastCompany:"",lastTitle:"",yearsExperience:0,generalMotivation:"",openToInternship:false,universityAgreement:"No aplica",privacyConsent:false,automaticApplicationConsent:false});

function workMode(value:string|null):Job["workMode"]{const normalized=(value??"").toLowerCase();if(normalized.includes("remot"))return"remote";if(normalized.includes("híbr")||normalized.includes("hybrid"))return"hybrid";return"onsite"}
function capability(value:string|null):ApplyCapability{return value==="automatic"||value==="assisted"?value:"external"}
function currency(metadata:Record<string,unknown>|null){return typeof metadata?.salary_currency==="string"?metadata.salary_currency:"EUR"}
function mapJobForProfile(row:JobRow,profile:MatchProfile|null):Job{const meta=row.metadata??{};const result=calculateJobMatch(row,profile);return{id:row.id,company:row.company,title:row.title,summary:clean(row.summary)||"Consulta los detalles completos de esta oportunidad.",description:clean(row.description)||clean(row.summary)||"",location:row.location||"Ubicación no indicada",market:typeof meta.market_country==="string"?meta.market_country:"",workMode:workMode(row.work_mode),salaryMin:row.salary_min,salaryMax:row.salary_max,salaryCurrency:currency(meta),contractType:row.contract_type||"No indicado",seniority:row.seniority||"No indicado",industry:row.industry||"Otros",applyCapability:capability(row.application_capability),match:result.score,publishedAt:row.published_at||new Date().toISOString(),skills:Array.isArray(meta.requirements)?meta.requirements.filter((x):x is string=>typeof x==="string").slice(0,3):[],source:row.source,applyProvider:row.application_provider||"external",applyMode:row.apply_mode||"external",metadata:{...meta,match_reason_keys:result.reasons}}}
function mapJob(row:JobRow):Job{return mapJobForProfile(row,null)}
function clean(value:string|null){return(value??"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim()}
function fingerprintPart(value:string|null|undefined){return(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function jobFingerprint(job:Pick<JobRow,"company"|"title"|"location">|Pick<Job,"company"|"title"|"location">){return[fingerprintPart(job.company),fingerprintPart(job.title),fingerprintPart(job.location)].join("|")}
function chunks<T>(values:T[],size=120){const result:T[][]=[];for(let start=0;start<values.length;start+=size)result.push(values.slice(start,start+size));return result}

const jobSearchGroups:Array<{match:RegExp;terms:string[]}>= [
  {match:/marketing|mercadotecnia|comunicacion/i,terms:["marketing","growth","brand","content","communications","demand generation","acquisition","lifecycle","seo"]},
  {match:/software|ingenier|developer|programador|frontend|backend|full.?stack|web developer/i,terms:["software","engineer","developer","frontend","backend","full stack","fullstack","platform","devops","web"]},
  {match:/product|producto/i,terms:["product","product manager","product owner","product operations"]},
  {match:/design|disen|ux|ui/i,terms:["design","designer","ux","ui","product design","research"]},
  {match:/sales|ventas|comercial/i,terms:["sales","account executive","business development","partnerships","revenue"]},
  {match:/data|datos|analytics/i,terms:["data","analytics","analyst","machine learning","artificial intelligence"]},
  {match:/human resources|recursos humanos|talent|people/i,terms:["recruiting","recruiter","talent","people","human resources"]},
];
function searchTerms(value:string){
  const safe=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[%_,().]/g," ").replace(/\s+/g," ").trim().slice(0,80);
  if(!safe)return[];
  const group=jobSearchGroups.find(item=>item.match.test(safe));
  return Array.from(new Set([safe,...(group?.terms??[])]));
}
function jobSearchFilter(value:string){
  return searchTerms(value).flatMap(term=>["title","company","industry"].map(field=>`${field}.ilike.%${term}%`)).join(",");
}
function featuredScore(job:Job){
  const company=job.company.toLowerCase().replace(/[^a-z0-9]/g,"");
  const flagship=["openai","anthropic","google","meta","apple","microsoft","netflix","airbnb","stripe","cloudflare"];
  const brandBoost=flagship.includes(company)?14:job.metadata?.top_company===true||job.metadata?.top_company==="true"?9:0;
  const feedBoost=Math.max(0,Math.min(8,Number(job.metadata?.feed_priority??0)));
  return job.match+brandBoost+feedBoost+(job.applyCapability==="automatic"?3:0);
}

export async function currentUser(){try{return(await getResilientSession())?.user??null}catch{return null}}

export async function deleteCurrentAccount(){const client=createSupabaseBrowserClient();const{data:session}=await client.auth.getSession();if(session.session){const supportRemoval=await fetch("/api/support",{method:"DELETE",headers:{authorization:`Bearer ${session.session.access_token}`}});if(!supportRemoval.ok)throw new Error("No pudimos eliminar el historial de soporte. Reintenta la eliminación de la cuenta.");}const{data,error}=await client.functions.invoke("delete-account",{body:{confirmation:"delete"}});if(error instanceof FunctionsHttpError){const payload=await error.context.json().catch(()=>null)as{message?:string}|null;throw new Error(payload?.message||"No se pudo eliminar la cuenta.")}if(error)throw new Error(error.message||"No se pudo eliminar la cuenta.");if(!data?.deleted)throw new Error(data?.message||"No se pudo confirmar la eliminación.");clearDashboardCaches();await client.auth.signOut({scope:"local"}).catch(()=>undefined)}

async function loadJobsFresh(limit=120,options:JobLoadOptions={},onInitialJobs?:(jobs:Job[])=>void){
  const client=createSupabaseBrowserClient();
  const salaryRatesPromise=loadSalaryRates();
  const {data:session}=await client.auth.getSession();
  let hidden=new Set<string>();let hiddenFingerprints=new Set<string>();let candidateCity="",candidateCountry="";let matchProfile:MatchProfile|null=null;
  if(session.session?.user){
    const[{data:swipes},{data:applications},{data:profile}]=await Promise.all([
      client.from("swipes").select("job_id,direction").eq("user_id",session.session.user.id).neq("direction","save"),
      client.from("applications").select("job_id").eq("user_id",session.session.user.id),
      client.from("profiles").select("role,location,skills,work_modes,min_salary,max_salary,universal_profile").eq("id",session.session.user.id).maybeSingle(),
    ]);
    const hiddenSwipeIds=(swipes??[]).filter((row:{job_id:string;direction:string})=>row.direction==="right"||!options.includeDismissed).map((row:{job_id:string})=>row.job_id);
    hidden=new Set([...hiddenSwipeIds,...(applications??[]).map((row:{job_id:string})=>row.job_id)]);
    const hiddenIds=[...hidden];
    if(hiddenIds.length){
      const hiddenResults=await Promise.all(chunks(hiddenIds).map(ids=>client.from("jobs").select("company,title,location").in("id",ids)));
      const hiddenError=hiddenResults.find(result=>result.error)?.error;if(hiddenError)throw hiddenError;
      hiddenFingerprints=new Set(hiddenResults.flatMap(result=>(result.data??[])as Array<Pick<JobRow,"company"|"title"|"location">>).map(jobFingerprint));
    }
    const universal=profile?.universal_profile as Partial<UniversalProfile>|null;candidateCity=universal?.city||profile?.location||"";candidateCountry=universal?.country||"";
    matchProfile={role:profile?.role||"",location:candidateCity,skills:Array.isArray(profile?.skills)?profile.skills:[],workModes:Array.isArray(profile?.work_modes)?profile.work_modes:[],minSalary:profile?.min_salary??null,maxSalary:profile?.max_salary??null,yearsExperience:Number(universal?.yearsExperience??0),country:candidateCountry,workAuthorizationCountries:Array.isArray(universal?.workAuthorizationCountries)?universal.workAuthorizationCountries:[],visaRequirement:universal?.visaRequirement||""};
  }
  // The feed only needs card-sized data. Full descriptions are loaded by the
  // job detail route when a person opens an offer. This keeps Supabase egress
  // and Postgres work bounded even when the catalogue contains many jobs.
  const select="id,external_id,source,company,title,summary,location,work_mode,salary_min,salary_max,contract_type,seniority,industry,apply_mode,published_at,metadata,application_capability,application_provider";
  const excludedIds=[...hidden].filter(id=>UUID.test(id)).slice(-150);
  const activeJobs=()=>{
    const query=client.from("jobs").select(select).eq("status","active");
    return excludedIds.length?query.not("id","in",`(${excludedIds.join(",")})`):query;
  };
  const recent=activeJobs().order("published_at",{ascending:false}).limit(Math.min(limit,80));
  const automatic=activeJobs().eq("application_capability","automatic").order("published_at",{ascending:false}).limit(50);
  const roleFilter=matchProfile?.role?jobSearchFilter(matchProfile.role):"";
  const requestedFilter=options.search?jobSearchFilter(options.search):"";
  const roleFocused=roleFilter?activeJobs().or(roleFilter).order("published_at",{ascending:false}).limit(160):null;
  const requestedSearch=requestedFilter?activeJobs().or(requestedFilter).order("published_at",{ascending:false}).limit(100):null;
  const internshipFilter="seniority.ilike.%Internship%,title.ilike.%intern%,title.ilike.%práctic%,title.ilike.%practicante%,title.ilike.%beca%,title.ilike.%trainee%,title.ilike.%apprentice%,title.ilike.%working student%,title.ilike.%co-op%,title.ilike.%placement%,contract_type.ilike.%intern%";
  const juniorFilter="seniority.ilike.%Entry%,title.ilike.%junior%,title.ilike.%graduate%,title.ilike.%new grad%,title.ilike.%entry level%,title.ilike.%emerging talent%";
  const earlyCareer=activeJobs().or(`${internshipFilter},${juniorFilter}`).order("published_at",{ascending:false}).limit(80);
  const careerFocused=options.careerLevel
    ? activeJobs().or(options.careerLevel==="internship"?internshipFilter:juniorFilter).order("published_at",{ascending:false}).limit(180)
    : null;
  const remoteFilter="work_mode.ilike.%remot%,location.ilike.%remote%,location.ilike.%remoto%";
  const remoteJobs=activeJobs().or(remoteFilter).order("published_at",{ascending:false}).limit(120);
  const candidateMarket=resolveCountryCode(candidateCountry,candidateCity);
  const cityFilter=cityLocationFilter(candidateCity);
  // A general recent sample can contain hundreds of jobs while still leaving
  // only a handful after role and location filters. Query those intersections
  // explicitly so Barcelona, CDMX and other large markets do not look empty.
  const localRoleFocused=roleFilter&&cityFilter
    ? activeJobs().or(roleFilter).or(cityFilter).order("published_at",{ascending:false}).limit(160)
    : null;
  const marketRoleFocused=roleFilter&&candidateMarket
    ? activeJobs().or(roleFilter).in("metadata->>market_country",[candidateMarket,"REMOTE"]).order("published_at",{ascending:false}).limit(180)
    : null;
  const remoteRoleFocused=roleFilter
    ? activeJobs().or(roleFilter).or(remoteFilter).order("published_at",{ascending:false}).limit(140)
    : null;
  const localQueries=cityFilter?[
    activeJobs().or(cityFilter).order("published_at",{ascending:false}).limit(80),
  ]:[];
  const focused=candidateMarket?[
    activeJobs().in("metadata->>market_country",[candidateMarket,"REMOTE"]).order("published_at",{ascending:false}).limit(80),
  ]:[
    activeJobs().in("work_mode",["Remoto","Híbrido"]).order("published_at",{ascending:false}).limit(60),
  ];
  const defaultQueries=[recent,automatic,earlyCareer,remoteJobs,...focused,...localQueries,...(roleFocused?[roleFocused]:[]),...(localRoleFocused?[localRoleFocused]:[]),...(marketRoleFocused?[marketRoleFocused]:[]),...(remoteRoleFocused?[remoteRoleFocused]:[]),...(requestedSearch?[requestedSearch]:[])];
  const salaryQueries=["USD","EUR","GBP"].map(currency=>{
    let query=activeJobs().or(remoteFilter).gt("salary_min",0).eq("metadata->>salary_currency",currency).in("metadata->>salary_interval",["year","yearly","annual","annually","per-year-salary","month","monthly","per-month-salary","week","weekly"]);
    if(candidateMarket)query=query.in("metadata->>market_country",[candidateMarket,"REMOTE"]);
    if(requestedFilter||roleFilter)query=query.or(requestedFilter||roleFilter);
    if(options.careerLevel)query=query.or(options.careerLevel==="internship"?internshipFilter:juniorFilter);
    // Salary discovery is optional: a slow/unavailable query must not block
    // the normal first batch or hide otherwise available jobs.
    return Promise.resolve(query.order("salary_min",{ascending:false}).limit(8).abortSignal(AbortSignal.timeout(1800))).then(result=>result.error?{data:[],error:null}:result).catch(()=>({data:[],error:null}));
  });
  const primaryQueries=careerFocused?[careerFocused.limit(36),...salaryQueries]:requestedFilter?[
    activeJobs().or(requestedFilter).order("published_at",{ascending:false}).limit(36),
    ...salaryQueries,
  ]:roleFilter?[
    ...(cityFilter?[activeJobs().or(roleFilter).or(cityFilter).order("published_at",{ascending:false}).limit(24)]:[]),
    activeJobs().or(roleFilter).or(remoteFilter).order("published_at",{ascending:false}).limit(24),
    ...salaryQueries,
  ]:[activeJobs().order("published_at",{ascending:false}).limit(24),activeJobs().or(remoteFilter).order("published_at",{ascending:false}).limit(24),...salaryQueries];
  const primaryResults=await Promise.all(primaryQueries);
  const prepareJobs=async(results:typeof primaryResults)=>{
  const failed=results.find(result=>result.error);
  if(failed?.error)throw failed.error;
  const rows=[...new Map(results.flatMap(result=>(result.data??[])as JobRow[]).map(row=>[row.id,row])).values()]
    .filter(row=>!hidden.has(row.id)&&!hiddenFingerprints.has(jobFingerprint(row)))
    .filter(row=>isJobWorkAuthorizationCompatible(row,matchProfile))
    .filter(row=>isJobLocationCompatible({location:row.location||"",market:String(row.metadata?.market_country||""),workMode:workMode(row.work_mode),metadata:row.metadata??{}},candidateCity,candidateCountry))
    .filter(row=>Boolean(options.search||options.careerLevel)||isJobProfessionallyRelevant(row,matchProfile));
  const targetResults=await Promise.all(chunks(rows.map(row=>row.id)).map(ids=>client.functions.invoke("available-job-targets",{body:{jobIds:ids}})));
  const targetError=targetResults.find(result=>result.error)?.error;if(targetError)throw targetError;
  const targetIds=new Set(targetResults.flatMap(result=>Array.isArray(result.data?.jobIds)?result.data.jobIds:[]) as string[]);
  const rank:Record<ApplyCapability,number>={automatic:0,assisted:1,external:2};
  const seenFingerprints=new Set<string>();
  const available=rows.filter(row=>targetIds.has(row.id)).map(row=>mapJobForProfile(row,matchProfile)).sort((a,b)=>featuredScore(b)-featuredScore(a)||b.match-a.match||rank[a.applyCapability]-rank[b.applyCapability]||new Date(b.publishedAt).getTime()-new Date(a.publishedAt).getTime()).filter(job=>{const fingerprint=jobFingerprint(job);if(seenFingerprints.has(fingerprint))return false;seenFingerprints.add(fingerprint);return true});
  if(candidateCity){
    return prioritizeHighSalaryRemote(prioritizeJobsWithRemoteFallback(available,candidateCity,candidateCountry,Boolean(options.includeWorldwide||options.search)),candidateCity,candidateCountry,await salaryRatesPromise).slice(0,limit);
  }
  return available.slice(0,limit);
  };
  const initialJobs=await prepareJobs(primaryResults);
  if(initialJobs.length)onInitialJobs?.(initialJobs);
  // Expand only after the first cards are ready, so broad catalogue queries
  // cannot hold up the first useful result on a slower connection.
  try{
    const results=await Promise.all(careerFocused?[
      activeJobs().or(options.careerLevel==="internship"?internshipFilter:juniorFilter).order("published_at",{ascending:false}).limit(180),
    ]:defaultQueries);
    return await prepareJobs([...primaryResults,...results]);
  }catch(error){if(initialJobs.length)return initialJobs;throw error}
}

export async function loadJobs(limit=120,options:JobLoadOptions={},onInitialJobs?:(jobs:Job[])=>void){
  const{data}=await createSupabaseBrowserClient().auth.getSession();
  const key=`${data.session?.user.id??"anonymous"}:${cacheKey(limit,options)}`;const cached=jobsCache.get(key);
  if(cached&&cached.expiresAt>Date.now()){
    if(onInitialJobs){if(cached.initialJobs)onInitialJobs(cached.initialJobs);else cached.listeners.add(onInitialJobs)}
    return cached.value;
  }
  const listeners=new Set<(jobs:Job[])=>void>(onInitialJobs?[onInitialJobs]:[]);
  const entry:JobCacheEntry={expiresAt:Date.now()+JOB_CACHE_MS,listeners,value:loadJobsFresh(limit,options,jobs=>{
    entry.initialJobs=jobs;for(const listener of listeners)listener(jobs);listeners.clear();
  }).catch(error=>{if(jobsCache.get(key)===entry)jobsCache.delete(key);throw error}).finally(()=>listeners.clear())};
  jobsCache.set(key,entry);return entry.value;
}

export async function recordSwipe(jobId:string,direction:SwipeDirection){
  if(!UUID.test(jobId))throw new Error("Oferta no válida.");
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para guardar tu decisión.");
  const {error}=await client.from("swipes").upsert({user_id:user.id,job_id:jobId,direction},{onConflict:"user_id,job_id"});if(error)throw error;
  clearDashboardCaches();
}

export async function submitApplication(jobId:string,answers:Record<string,unknown>={}):Promise<ApplyOutcome>{
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para postularte.");
  await recordSwipe(jobId,"right");
  const {data,error}=await client.functions.invoke("submit-application",{body:{jobId,answers,platform:"web"}});
  if(error instanceof FunctionsHttpError){const payload=await error.context.json().catch(()=>null)as{message?:string}|null;throw new Error(payload?.message||"El servidor no pudo procesar la candidatura.")}
  if(error)throw new Error(error.message||"No se pudo conectar con el servidor de candidaturas.");
  clearDashboardCaches();return data as ApplyOutcome;
}

export async function prepareCoverLetter(jobId:string):Promise<CoverLetterPreview>{
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para preparar tu carta.");
  const{data,error}=await client.functions.invoke("submit-application",{body:{jobId,intent:"preview",platform:"web"}});
  if(error instanceof FunctionsHttpError){const payload=await error.context.json().catch(()=>null)as{message?:string}|null;throw new Error(payload?.message||"No se pudo generar la carta.")}
  if(error)throw new Error(error.message||"No se pudo conectar con el generador de cartas.");
  if(!data?.coverLetter)throw new Error(data?.message||"No se pudo generar la carta.");
  return data as CoverLetterPreview;
}

export async function loadProfile(knownUser?:User|null):Promise<CandidateProfile|null>{
  const client=createSupabaseBrowserClient();const user=knownUser??await currentUser();if(!user)return null;
  const {data,error}=await client.from("profiles").select("id,full_name,email,phone,role,location,skills,work_modes,min_salary,max_salary,cv_path,universal_profile,privacy_consent_at,automatic_application_consent_at,onboarding_completed_at").eq("id",user.id).maybeSingle();
  if(error)throw error;if(!data)return null;
  return{id:data.id,fullName:data.full_name||"",email:data.email||user.email||"",phone:data.phone||"",role:data.role||"",location:data.location||"",skills:Array.isArray(data.skills)?data.skills:[],workModes:Array.isArray(data.work_modes)?data.work_modes:[],minSalary:data.min_salary,maxSalary:data.max_salary,cvPath:data.cv_path,universal:(data.universal_profile as UniversalProfile|null)??null,privacyConsentAt:data.privacy_consent_at,automaticConsentAt:data.automatic_application_consent_at,onboardingCompletedAt:data.onboarding_completed_at};
}

export async function saveProfile(input:{firstName:string;lastName:string;email:string;phone:string;city:string;country:string;role:string;authorizationCountry:string;privacyConsent:boolean;automaticConsent:boolean;cv?:File|null}){
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para guardar tu perfil.");
  const previous=await loadProfile();let cvPath=previous?.cvPath??null;
  if(input.cv){if(input.cv.size>8*1024*1024)throw new Error("El CV no puede superar 8 MB.");const extension=input.cv.name.toLowerCase().endsWith(".docx")?"docx":input.cv.name.toLowerCase().endsWith(".doc")?"doc":"pdf";cvPath=`${user.id}/cv.${extension}`;const{error}=await client.storage.from("cvs").upload(cvPath,input.cv,{contentType:input.cv.type||"application/pdf",upsert:true});if(error)throw error}
  const universal:UniversalProfile={...(previous?.universal??defaultUniversal(user)),firstName:input.firstName,lastName:input.lastName,city:input.city,country:input.country,workAuthorizationCountries:[input.authorizationCountry],privacyConsent:input.privacyConsent,automaticApplicationConsent:input.automaticConsent,version:1};
  const now=new Date().toISOString();const{error}=await client.from("profiles").upsert({id:user.id,full_name:`${input.firstName} ${input.lastName}`.trim(),email:input.email,phone:input.phone,role:input.role,location:input.city,cv_path:cvPath,universal_profile:universal,privacy_consent_at:input.privacyConsent?now:null,automatic_application_consent_at:input.automaticConsent?now:null,universal_profile_completed_at:input.privacyConsent&&input.automaticConsent?now:null,updated_at:now},{onConflict:"id"});if(error)throw error;
  clearDashboardCaches();
}

export function coverLetterReadiness(profile:CandidateProfile|null){
  const cover=profile?.universal?.coverLetter;const checks=[Boolean(cover?.motivation?.trim()),Boolean(cover?.valueProposition?.trim()),Boolean(cover?.achievement?.trim()),Boolean(cover?.companyPreferences?.trim()),Boolean(cover?.enabled)];
  return{ready:checks.every(Boolean),percentage:Math.round(checks.filter(Boolean).length/checks.length*100),missing:["motivación","valor profesional","logro real","empresa ideal","autorización para generar"].filter((_,index)=>!checks[index])};
}

export async function saveCoverLetterProfile(input:Omit<CoverLetterProfile,"updatedAt">){
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para guardar tu carta.");
  const current=await loadProfile();const clean=(value:string,max:number)=>value.replace(/\s+/g," ").trim().slice(0,max);
  const coverLetter:CoverLetterProfile={enabled:input.enabled,motivation:clean(input.motivation,1500),valueProposition:clean(input.valueProposition,1500),achievement:clean(input.achievement,1500),companyPreferences:clean(input.companyPreferences,1000),doNotMention:clean(input.doNotMention,700),tone:input.tone,reviewBeforeSending:input.reviewBeforeSending,updatedAt:new Date().toISOString()};
  if(!coverLetter.motivation||!coverLetter.valueProposition||!coverLetter.achievement||!coverLetter.companyPreferences)throw new Error("Responde las cuatro preguntas principales antes de guardar.");
  const universal:UniversalProfile={...(current?.universal??defaultUniversal(user)),coverLetter,version:1};
  const{error}=await client.from("profiles").upsert({id:user.id,email:current?.email||user.email||null,universal_profile:universal,updated_at:new Date().toISOString()},{onConflict:"id"});if(error)throw error;
}

export type WebOnboardingAnswers={
  search:string;priorities:string[];apps:string;category:string;categoryLabel:string;specialties:string[];specialtyLabels:string[];
  experience:string;city:string;workAuthorization:string;currency:string;salaryMin:number;salaryMax:number;goal:string;interviews:number;deadline:string;
  blocker:string;outcome:string;source:string;promoCode:string;
};

export async function completeWebOnboarding(input:{answers:WebOnboardingAnswers;resume:File;locale:"es"|"en";onUploadAttempt?:(attempt:number)=>void}){
  const client=createSupabaseBrowserClient();
  let session:Awaited<ReturnType<typeof getResilientSession>>;
  try{session=await getResilientSession(600)}catch{throw new Error(input.locale==="es"?"No hemos podido verificar tu sesión ahora mismo. Tus respuestas siguen guardadas; espera unos segundos y vuelve a intentarlo.":"We couldn't verify your session right now. Your answers are still saved; wait a few seconds and try again.")}
  const user=session?.user;if(!user)throw new Error(input.locale==="es"?"Tu sesión ha caducado. Vuelve a iniciar sesión.":"Your session has expired. Please log in again.");
  const {extension,contentType}=resumeFormat(input.resume,input.locale);
  const cvPath=`${user.id}/cv.${extension}`;
  await uploadCvWithRetry(()=>client.storage.from("cvs").upload(cvPath,input.resume,{contentType,upsert:true}),input.locale,input.onUploadAttempt);
  input.onUploadAttempt?.(0);
  const{data:existing,error:profileError}=await client.from("profiles").select("full_name,email,phone,universal_profile,privacy_consent_at,automatic_application_consent_at").eq("id",user.id).maybeSingle();if(profileError)throw profileError;
  const metadataName=String(user.user_metadata?.full_name??user.user_metadata?.name??"");const fullName=existing?.full_name||metadataName;
  const experienceYears:Record<string,number>={internship:0,entry:0,junior:2,mid:4,senior:7,expert:10};
  const previous=(existing?.universal_profile as UniversalProfile|null)??defaultUniversal(user);
  const targetCountry=input.answers.city.split(",").map(value=>value.trim()).filter(Boolean).at(-1)||(input.locale==="es"?"País seleccionado":"Selected country");
  const authorized=["citizen","permit"].includes(input.answers.workAuthorization);
  const visaRequirement=input.answers.workAuthorization==="sponsorship"?"Requires sponsorship":input.answers.workAuthorization==="unsure"?"Unknown":"No sponsorship required";
  const universal:UniversalProfile={...previous,city:input.answers.city,country:targetCountry,salaryCurrency:input.answers.currency,yearsExperience:experienceYears[input.answers.experience]??0,workAuthorizationCountries:authorized?[targetCountry]:[],visaRequirement,version:1};
  const now=new Date().toISOString();const onboardingAnswers={...input.answers,promoCode:input.answers.promoCode.trim().toUpperCase(),locale:input.locale,completedFrom:"web",completedAt:now};
  const{error}=await client.from("profiles").upsert({id:user.id,full_name:fullName,email:existing?.email||user.email||null,phone:existing?.phone||null,role:input.answers.specialtyLabels.join(", ")||input.answers.categoryLabel,location:input.answers.city,skills:input.answers.specialtyLabels,work_modes:input.answers.priorities.includes("remote")?["Remoto","Híbrido"]:[],min_salary:input.answers.salaryMin,max_salary:input.answers.salaryMax,cv_path:cvPath,universal_profile:universal,onboarding_answers:onboardingAnswers,onboarding_completed_at:now,updated_at:now},{onConflict:"id"});if(error)throw error;
  clearDashboardCaches();
}

export function profileReadiness(profile:CandidateProfile|null){const u=profile?.universal;const checks=[Boolean(u?.firstName),Boolean(u?.lastName),Boolean(profile?.email),Boolean(profile?.phone),Boolean(u?.city),Boolean(u?.country),Boolean(profile?.cvPath),Boolean(u?.workAuthorizationCountries?.length),Boolean(u?.privacyConsent),Boolean(u?.automaticApplicationConsent)];return{ready:checks.every(Boolean),percentage:Math.round(checks.filter(Boolean).length/checks.length*100),missing:["nombre","apellidos","email","teléfono","ciudad","país","CV","permiso de trabajo","consentimiento de privacidad","autorización de candidatura"].filter((_,i)=>!checks[i])}}

async function loadApplicationsFresh():Promise<LiveApplication[]>{
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)return[];
  const{data:rows,error}=await client.from("applications").select("id,job_id,status,applied_at,updated_at,action_url,error_message,required_fields,delivery_status,answers").eq("user_id",user.id).order("updated_at",{ascending:false});if(error)throw error;if(!rows?.length)return[];
  const typedRows=rows as Array<{id:string;job_id:string;status:string;applied_at:string;updated_at:string;action_url:string|null;error_message:string|null;required_fields:unknown;delivery_status:string|null;answers:Record<string,unknown>|null}>;
  const jobIds=[...new Set(typedRows.map(row=>row.job_id))];const appIds=typedRows.map(row=>row.id);
  const[{data:jobRows},{data:eventRows}]=await Promise.all([client.from("jobs").select("id,external_id,source,company,title,summary,description,location,work_mode,salary_min,salary_max,contract_type,seniority,industry,apply_mode,published_at,metadata,application_capability,application_provider").in("id",jobIds),client.from("application_events").select("id,application_id,event_type,message,created_at,read_at").in("application_id",appIds).order("created_at",{ascending:true})]);
  const byJob=new Map(((jobRows??[])as JobRow[]).map(row=>[row.id,mapJob(row)]));
  const events=((eventRows??[]) as Array<{id:string;application_id:string;event_type:string;message:string;created_at:string;read_at:string|null}>).map(row=>({id:row.id,applicationId:row.application_id,type:row.event_type,message:row.message,createdAt:row.created_at,readAt:row.read_at}));
  const stages=new Set<TrackingStage>(["applied","screening","interview","offer","closed"]);
  return typedRows.flatMap(row=>{const job=byJob.get(row.job_id);const letter=typeof row.answers?.generatedCoverLetter==="string"?row.answers.generatedCoverLetter:null;const generatedAt=typeof row.answers?.coverLetterGeneratedAt==="string"?row.answers.coverLetterGeneratedAt:null;const usage=typeof row.answers?.coverLetterUsageStatus==="string"?row.answers.coverLetterUsageStatus:null;const storedStage=row.answers?.trackingStage;const fallbackStage:TrackingStage=row.status==="interview"?"interview":row.status==="rejected"||row.status==="failed"?"closed":row.status==="viewed"?"screening":"applied";const tracking:ApplicationTracking={stage:typeof storedStage==="string"&&stages.has(storedStage as TrackingStage)?storedStage as TrackingStage:fallbackStage,notes:typeof row.answers?.trackingNotes==="string"?row.answers.trackingNotes:"",nextAction:typeof row.answers?.trackingNextAction==="string"?row.answers.trackingNextAction:"",nextActionAt:typeof row.answers?.trackingNextActionAt==="string"?row.answers.trackingNextActionAt:null,updatedAt:typeof row.answers?.trackingUpdatedAt==="string"?row.answers.trackingUpdatedAt:null};return job?[{id:row.id,jobId:row.job_id,status:row.status as ApplicationStatus,appliedAt:row.applied_at,updatedAt:row.updated_at,actionUrl:row.action_url,errorMessage:row.error_message,requiredFields:Array.isArray(row.required_fields)?row.required_fields.filter((field):field is string=>typeof field==="string"):[],deliveryStatus:row.delivery_status,coverLetter:letter,coverLetterGeneratedAt:generatedAt,coverLetterUsageStatus:usage,tracking,job,events:events.filter(event=>event.applicationId===row.id)}]:[]});
}

export async function loadApplications():Promise<LiveApplication[]>{
  const{data}=await createSupabaseBrowserClient().auth.getSession();const key=data.session?.user.id??"anonymous";
  const cached=applicationsCache.get(key);if(cached&&cached.expiresAt>Date.now())return cached.value;
  const value=loadApplicationsFresh().catch(error=>{applicationsCache.delete(key);throw error});
  applicationsCache.set(key,{expiresAt:Date.now()+DASHBOARD_CACHE_MS,value});return value;
}

export async function updateApplicationTracking(applicationId:string,input:{stage:TrackingStage;notes:string;nextAction:string;nextActionAt:string|null}){
  if(!UUID.test(applicationId))throw new Error("Candidatura no válida.");
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para actualizar tu seguimiento.");
  const{data:existing,error:readError}=await client.from("applications").select("answers").eq("id",applicationId).eq("user_id",user.id).maybeSingle();if(readError)throw readError;if(!existing)throw new Error("No encontramos esta candidatura.");
  const now=new Date().toISOString();const previous=existing.answers&&typeof existing.answers==="object"?existing.answers as Record<string,unknown>:{};
  const answers={...previous,trackingStage:input.stage,trackingNotes:input.notes.trim().slice(0,4000),trackingNextAction:input.nextAction.trim().slice(0,240),trackingNextActionAt:input.nextActionAt||null,trackingUpdatedAt:now};
  const{error}=await client.from("applications").update({answers,updated_at:now}).eq("id",applicationId).eq("user_id",user.id);if(error)throw error;
  applicationsCache.delete(user.id);
}

async function loadSavedJobsFresh(){const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)return[];const{data}=await client.from("swipes").select("job_id").eq("user_id",user.id).eq("direction","save").order("created_at",{ascending:false});if(!data?.length)return[];const{data:rows,error}=await client.from("jobs").select("id,external_id,source,company,title,summary,description,location,work_mode,salary_min,salary_max,contract_type,seniority,industry,apply_mode,published_at,metadata,application_capability,application_provider").in("id",data.map((row:{job_id:string})=>row.job_id));if(error)throw error;return((rows??[])as JobRow[]).map(row=>mapJob(row))}

export async function loadSavedJobs(){
  const{data}=await createSupabaseBrowserClient().auth.getSession();const key=data.session?.user.id??"anonymous";
  const cached=savedJobsCache.get(key);if(cached&&cached.expiresAt>Date.now())return cached.value;
  const value=loadSavedJobsFresh().catch(error=>{savedJobsCache.delete(key);throw error});
  savedJobsCache.set(key,{expiresAt:Date.now()+DASHBOARD_CACHE_MS,value});return value;
}

export async function startStripe(action:"checkout"|"portal"="checkout",plan?:"starter"|"pro"|"sprint"){
  const client=createSupabaseBrowserClient();
  const storedPlan=typeof window!=="undefined"?window.localStorage.getItem("landeo-selected-plan"):null;
  const selectedPlan=plan??(storedPlan==="starter"||storedPlan==="pro"||storedPlan==="sprint"?storedPlan:"pro");
  const locale=typeof window!=="undefined"&&window.localStorage.getItem("landeo-locale")==="en"?"en":"es";
  const returnTo=typeof window!=="undefined"?`${window.location.pathname}${window.location.search}${window.location.hash}`:"/pricing";
  let promotionCode="";
  const acceptance=action==="checkout"?await requestBillingAcceptance(selectedPlan,locale):null;
  if(action==="checkout"&&!acceptance)return false;
  if(action==="checkout"){
    const user=await currentUser();
    if(user){const{data}=await client.from("profiles").select("onboarding_answers").eq("id",user.id).maybeSingle();const answers=data?.onboarding_answers as Record<string,unknown>|null;promotionCode=typeof answers?.promoCode==="string"?answers.promoCode:""}
  }
  const{data,error}=await client.functions.invoke("create-stripe-checkout",{body:{action,promotionCode,plan:selectedPlan,locale,returnTo,acceptance}});
  if(error instanceof FunctionsHttpError){const payload=await error.context.json().catch(()=>null)as{message?:string}|null;throw new Error(payload?.message||"No se pudo iniciar Stripe.")}
  if(error)throw error;
  if(!data?.url)throw new Error(data?.message||"Stripe no devolvió un enlace.");
  try{const marker=JSON.stringify({at:Date.now(),action,returnTo});window.sessionStorage.setItem("landeo-stripe-return-pending",marker);window.localStorage.setItem("landeo-stripe-return-pending",marker)}catch{/* Session recovery marker is optional. */}
  if(action==="checkout")trackProductEvent("stripe_checkout_started",{plan:selectedPlan,source:"billing_confirmation"});
  window.location.assign(data.url);return true;
}

export async function hasWebPro(knownUser?:User|null){const user=knownUser??await currentUser();if(!user)return false;const{data}=await createSupabaseBrowserClient().from("stripe_subscriptions").select("status,current_period_end").eq("user_id",user.id).in("status",["active","trialing"]).maybeSingle();return Boolean(data&&(!data.current_period_end||new Date(data.current_period_end).getTime()>Date.now()))}

const defaultAutoApplySettings=(profile?:CandidateProfile|null):AutoApplySettings=>({
  enabled:false,
  roles:profile?.role?profile.role.split(",").map(value=>value.trim()).filter(Boolean):[],
  locations:profile?.universal?.city?[profile.universal.city]:profile?.location?[profile.location]:[],
  workModes:profile?.workModes??[],industries:[],seniorityLevels:[],excludedCompanies:[],minimumMatch:75,dailyLimit:3,
  lastRunAt:null,nextRunAt:null,
});

export async function loadAutoApplyDashboard(profile?:CandidateProfile|null):Promise<AutoApplyDashboard>{
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para usar Auto Apply.");
  const[{data:settings,error:settingsError},{data:applications,error:applicationsError},{data:runs,error:runsError}]=await Promise.all([
    client.from("auto_apply_settings").select("*").eq("user_id",user.id).maybeSingle(),
    client.from("applications").select("status,delivery_status,answers").eq("user_id",user.id).contains("answers",{autoApply:true}),
    client.from("auto_apply_runs").select("status,matched_count,started_at,completed_at,error_message").eq("user_id",user.id).order("started_at",{ascending:false}).limit(1),
  ]);
  if(settingsError)throw settingsError;if(applicationsError)throw applicationsError;if(runsError)throw runsError;
  const fallback=defaultAutoApplySettings(profile);const row=settings as Record<string,unknown>|null;
  const mapped:AutoApplySettings=row?{
    enabled:Boolean(row.enabled),roles:Array.isArray(row.roles)?row.roles as string[]:fallback.roles,locations:Array.isArray(row.locations)?row.locations as string[]:fallback.locations,
    workModes:Array.isArray(row.work_modes)?row.work_modes as string[]:[],industries:Array.isArray(row.industries)?row.industries as string[]:[],seniorityLevels:Array.isArray(row.seniority_levels)?row.seniority_levels as string[]:[],
    excludedCompanies:Array.isArray(row.excluded_companies)?row.excluded_companies as string[]:[],minimumMatch:Number(row.minimum_match??75),dailyLimit:Number(row.daily_limit??3),
    lastRunAt:typeof row.last_run_at==="string"?row.last_run_at:null,nextRunAt:typeof row.next_run_at==="string"?row.next_run_at:null,
  }:fallback;
  const rows=(applications??[]) as Array<{status:string;delivery_status:string|null}>;const latest=(runs??[])[0] as Record<string,unknown>|undefined;
  return{settings:mapped,stats:{matched:Number(latest?.matched_count??0),queued:rows.filter(item=>item.status==="queued"||item.status==="processing").length,sent:rows.filter(item=>item.status==="sent").length,delivered:rows.filter(item=>item.delivery_status==="delivered").length,actionRequired:rows.filter(item=>item.status==="action_required").length,failed:rows.filter(item=>item.status==="failed").length},lastRun:latest?{status:String(latest.status),startedAt:String(latest.started_at),completedAt:typeof latest.completed_at==="string"?latest.completed_at:null,errorMessage:typeof latest.error_message==="string"?latest.error_message:null}:null};
}

export async function saveAutoApplySettings(input:AutoApplySettings){
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para configurar Auto Apply.");
  const clean=(values:string[])=>Array.from(new Set(values.map(value=>value.trim()).filter(Boolean))).slice(0,20);
  if(input.enabled&&!clean(input.roles).length)throw new Error("Añade al menos un puesto objetivo.");
  const now=new Date().toISOString();const{error}=await client.from("auto_apply_settings").upsert({user_id:user.id,enabled:input.enabled,roles:clean(input.roles),locations:clean(input.locations),work_modes:clean(input.workModes),industries:clean(input.industries),seniority_levels:clean(input.seniorityLevels),excluded_companies:clean(input.excludedCompanies),minimum_match:Math.max(50,Math.min(100,Math.round(input.minimumMatch))),daily_limit:Math.max(1,Math.min(10,Math.round(input.dailyLimit))),next_run_at:input.enabled?now:null,updated_at:now},{onConflict:"user_id"});if(error)throw error;
  // Saving and running are separate outcomes. An invocation failure must not
  // pretend that the settings were rolled back after the successful upsert.
  if(input.enabled){
    try{
      const{data,error:runError}=await client.functions.invoke("auto-apply-runner",{body:{source:"dashboard"}});
      if(runError instanceof FunctionsHttpError){const payload=await runError.context.json().catch(()=>null)as{message?:string}|null;return{runWarning:payload?.message||"No se pudo completar la primera búsqueda."}}
      if(runError)return{runWarning:runError.message||"No se pudo completar la primera búsqueda."};
      return{runWarning:null,result:data};
    }catch{return{runWarning:"La configuración se guardó, pero no se pudo conectar con la primera búsqueda."}}
  }
  return{runWarning:null};
}

export async function runAutoApplyNow(){
  const client=createSupabaseBrowserClient();const{data,error}=await client.functions.invoke("auto-apply-runner",{body:{source:"manual"}});if(error instanceof FunctionsHttpError){const payload=await error.context.json().catch(()=>null)as{message?:string}|null;throw new Error(payload?.message||"No se pudo ejecutar Auto Apply.")}if(error)throw error;return data as{processed:number};
}
