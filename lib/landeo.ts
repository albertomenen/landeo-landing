import {FunctionsHttpError,type User} from "@supabase/supabase-js";
import {createSupabaseBrowserClient} from "./supabase/client";
import type {ApplyCapability,Job} from "./fixtures";
import {prioritizeJobsByLocation,resolveCountryCode} from "./job-location";

export type SwipeDirection="left"|"right"|"save";
export type ApplicationStatus="queued"|"processing"|"sent"|"action_required"|"viewed"|"interview"|"rejected"|"failed";
export type ApplyOutcome={status:"queued"|"sent"|"action_required"|"failed";message:string;actionUrl?:string;externalReference?:string};
export type CoverLetterProfile={
  enabled:boolean;motivation:string;valueProposition:string;achievement:string;companyPreferences:string;
  doNotMention:string;tone:"professional"|"warm"|"direct";updatedAt:string;
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
export type LiveApplication={
  id:string;jobId:string;status:ApplicationStatus;appliedAt:string;updatedAt:string;actionUrl:string|null;
  errorMessage:string|null;requiredFields:string[];deliveryStatus:string|null;coverLetter:string|null;
  coverLetterGeneratedAt:string|null;job:Job;events:ApplicationEvent[];
};
export type ApplicationEvent={id:string;applicationId:string;type:string;message:string;createdAt:string;readAt:string|null};

type JobRow={
  id:string;external_id:string|null;source:string;company:string;title:string;summary:string|null;description:string|null;
  location:string|null;work_mode:string|null;salary_min:number|null;salary_max:number|null;contract_type:string|null;
  seniority:string|null;industry:string|null;apply_mode:string|null;published_at:string|null;metadata:Record<string,unknown>|null;
  application_capability:string|null;application_provider:string|null;
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultUniversal=(user?:User|null):UniversalProfile=>({version:1,firstName:String(user?.user_metadata?.full_name??"").split(/\s+/)[0]??"",lastName:String(user?.user_metadata?.full_name??"").split(/\s+/).slice(1).join(" "),addressLine:"",city:"",country:"España",postalCode:"",githubUrl:"",websiteUrl:"",salaryCurrency:"EUR",availability:"",noticePeriod:"",workAuthorizationCountries:["España"],visaRequirement:"No necesito visado",willingToRelocate:false,languages:[],lastCompany:"",lastTitle:"",yearsExperience:0,generalMotivation:"",openToInternship:false,universityAgreement:"No aplica",privacyConsent:false,automaticApplicationConsent:false});

function workMode(value:string|null):Job["workMode"]{const normalized=(value??"").toLowerCase();if(normalized.includes("remot"))return"remote";if(normalized.includes("híbr")||normalized.includes("hybrid"))return"hybrid";return"onsite"}
function capability(value:string|null):ApplyCapability{return value==="automatic"||value==="assisted"?value:"external"}
function currency(metadata:Record<string,unknown>|null){return typeof metadata?.salary_currency==="string"?metadata.salary_currency:"EUR"}
function match(row:JobRow){const metadata=row.metadata??{};return typeof metadata.match_score==="number"?Math.min(98,Math.round(metadata.match_score)):row.application_capability==="automatic"?92:row.application_capability==="assisted"?86:78}
function mapJob(row:JobRow):Job{const meta=row.metadata??{};return{id:row.id,company:row.company,title:row.title,summary:clean(row.summary)||"Consulta los detalles completos de esta oportunidad.",description:clean(row.description)||clean(row.summary)||"",location:row.location||"Ubicación no indicada",market:typeof meta.market_country==="string"?meta.market_country:"",workMode:workMode(row.work_mode),salaryMin:row.salary_min,salaryMax:row.salary_max,salaryCurrency:currency(meta),contractType:row.contract_type||"No indicado",seniority:row.seniority||"No indicado",industry:row.industry||"Otros",applyCapability:capability(row.application_capability),match:match(row),publishedAt:row.published_at||new Date().toISOString(),skills:Array.isArray(meta.requirements)?meta.requirements.filter((x):x is string=>typeof x==="string").slice(0,3):[],source:row.source,applyProvider:row.application_provider||"external",applyMode:row.apply_mode||"external",metadata:meta}}
function clean(value:string|null){return(value??"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim()}

export async function currentUser(){const {data,error}=await createSupabaseBrowserClient().auth.getUser();if(error)return null;return data.user}

export async function loadJobs(limit=120){
  const client=createSupabaseBrowserClient();
  const {data:session}=await client.auth.getSession();
  let hidden=new Set<string>();let candidateCity="",candidateCountry="";
  if(session.session?.user){
    const[{data:swipes},{data:applications},{data:profile}]=await Promise.all([
      client.from("swipes").select("job_id").eq("user_id",session.session.user.id).eq("direction","left"),
      client.from("applications").select("job_id").eq("user_id",session.session.user.id),
      client.from("profiles").select("location,universal_profile").eq("id",session.session.user.id).maybeSingle(),
    ]);
    hidden=new Set([...(swipes??[]).map((row:{job_id:string})=>row.job_id),...(applications??[]).map((row:{job_id:string})=>row.job_id)]);
    const universal=profile?.universal_profile as Partial<UniversalProfile>|null;candidateCity=universal?.city||profile?.location||"";candidateCountry=universal?.country||"";
  }
  const select="id,external_id,source,company,title,summary,description,location,work_mode,salary_min,salary_max,contract_type,seniority,industry,apply_mode,published_at,metadata,application_capability,application_provider";
  const recent=client.from("jobs").select(select).eq("status","active").order("published_at",{ascending:false}).limit(limit);
  const candidateMarket=resolveCountryCode(candidateCountry,candidateCity);
  const focused=candidateMarket?[
    client.from("jobs").select(select).eq("status","active").eq("work_mode","Remoto").eq("metadata->>market_country",candidateMarket).order("published_at",{ascending:false}).limit(120),
    client.from("jobs").select(select).eq("status","active").eq("work_mode","Remoto").eq("metadata->>market_country","REMOTE").order("published_at",{ascending:false}).limit(120),
    client.from("jobs").select(select).eq("status","active").eq("work_mode","Híbrido").eq("metadata->>market_country",candidateMarket).order("published_at",{ascending:false}).limit(80),
  ]:[
    client.from("jobs").select(select).eq("status","active").eq("work_mode","Remoto").order("published_at",{ascending:false}).limit(180),
    client.from("jobs").select(select).eq("status","active").eq("work_mode","Híbrido").order("published_at",{ascending:false}).limit(100),
  ];
  const results=await Promise.all([recent,...focused]);
  const failed=results.find(result=>result.error);
  if(failed?.error)throw failed.error;
  const rows=[...new Map(results.flatMap(result=>(result.data??[])as JobRow[]).map(row=>[row.id,row])).values()];
  const rank:Record<ApplyCapability,number>={automatic:0,assisted:1,external:2};
  const available=rows.map(mapJob).filter(job=>!hidden.has(job.id)).sort((a,b)=>rank[a.applyCapability]-rank[b.applyCapability]||Number(b.metadata?.feed_priority??0)-Number(a.metadata?.feed_priority??0)||new Date(b.publishedAt).getTime()-new Date(a.publishedAt).getTime());
  return candidateCity?prioritizeJobsByLocation(available,candidateCity,candidateCountry):available;
}

export async function recordSwipe(jobId:string,direction:SwipeDirection){
  if(!UUID.test(jobId))throw new Error("Oferta no válida.");
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para guardar tu decisión.");
  const {error}=await client.from("swipes").upsert({user_id:user.id,job_id:jobId,direction},{onConflict:"user_id,job_id"});if(error)throw error;
}

export async function submitApplication(jobId:string,answers:Record<string,unknown>={}):Promise<ApplyOutcome>{
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para postularte.");
  await recordSwipe(jobId,"right");
  const {data,error}=await client.functions.invoke("submit-application",{body:{jobId,answers,platform:"web"}});
  if(error instanceof FunctionsHttpError){const payload=await error.context.json().catch(()=>null)as{message?:string}|null;throw new Error(payload?.message||"El servidor no pudo procesar la candidatura.")}
  if(error)throw new Error(error.message||"No se pudo conectar con el servidor de candidaturas.");
  return data as ApplyOutcome;
}

export async function loadProfile():Promise<CandidateProfile|null>{
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)return null;
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
}

export function coverLetterReadiness(profile:CandidateProfile|null){
  const cover=profile?.universal?.coverLetter;const checks=[Boolean(cover?.motivation?.trim()),Boolean(cover?.valueProposition?.trim()),Boolean(cover?.achievement?.trim()),Boolean(cover?.companyPreferences?.trim()),Boolean(cover?.enabled)];
  return{ready:checks.every(Boolean),percentage:Math.round(checks.filter(Boolean).length/checks.length*100),missing:["motivación","valor profesional","logro real","empresa ideal","autorización para generar"].filter((_,index)=>!checks[index])};
}

export async function saveCoverLetterProfile(input:Omit<CoverLetterProfile,"updatedAt">){
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error("Inicia sesión para guardar tu carta.");
  const current=await loadProfile();const clean=(value:string,max:number)=>value.replace(/\s+/g," ").trim().slice(0,max);
  const coverLetter:CoverLetterProfile={enabled:input.enabled,motivation:clean(input.motivation,1500),valueProposition:clean(input.valueProposition,1500),achievement:clean(input.achievement,1500),companyPreferences:clean(input.companyPreferences,1000),doNotMention:clean(input.doNotMention,700),tone:input.tone,updatedAt:new Date().toISOString()};
  if(!coverLetter.motivation||!coverLetter.valueProposition||!coverLetter.achievement||!coverLetter.companyPreferences)throw new Error("Responde las cuatro preguntas principales antes de guardar.");
  const universal:UniversalProfile={...(current?.universal??defaultUniversal(user)),coverLetter,version:1};
  const{error}=await client.from("profiles").upsert({id:user.id,email:current?.email||user.email||null,universal_profile:universal,updated_at:new Date().toISOString()},{onConflict:"id"});if(error)throw error;
}

export type WebOnboardingAnswers={
  search:string;priorities:string[];apps:string;category:string;categoryLabel:string;specialties:string[];specialtyLabels:string[];
  experience:string;city:string;currency:string;salaryMin:number;salaryMax:number;goal:string;interviews:number;deadline:string;
  blocker:string;outcome:string;source:string;promoCode:string;
};

export async function completeWebOnboarding(input:{answers:WebOnboardingAnswers;resume:File;locale:"es"|"en"}){
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)throw new Error(input.locale==="es"?"Tu sesión ha caducado. Vuelve a iniciar sesión.":"Your session has expired. Please log in again.");
  if(input.resume.size>10*1024*1024)throw new Error(input.locale==="es"?"El CV no puede superar 10 MB.":"Your résumé must be 10 MB or smaller.");
  const lower=input.resume.name.toLowerCase();const extension=lower.endsWith(".docx")?"docx":lower.endsWith(".doc")?"doc":"pdf";
  const allowed=["pdf","doc","docx"];if(!allowed.includes(extension))throw new Error(input.locale==="es"?"El CV debe ser PDF, DOC o DOCX.":"Your résumé must be a PDF, DOC or DOCX file.");
  const cvPath=`${user.id}/cv.${extension}`;const{error:uploadError}=await client.storage.from("cvs").upload(cvPath,input.resume,{contentType:input.resume.type||"application/pdf",upsert:true});if(uploadError)throw uploadError;
  const{data:existing,error:profileError}=await client.from("profiles").select("full_name,email,phone,universal_profile,privacy_consent_at,automatic_application_consent_at").eq("id",user.id).maybeSingle();if(profileError)throw profileError;
  const metadataName=String(user.user_metadata?.full_name??user.user_metadata?.name??"");const fullName=existing?.full_name||metadataName;
  const experienceYears:Record<string,number>={internship:0,entry:0,junior:2,mid:4,senior:7,expert:10};
  const previous=(existing?.universal_profile as UniversalProfile|null)??defaultUniversal(user);
  const universal:UniversalProfile={...previous,city:input.answers.city,country:previous.country||(input.locale==="es"?"España":""),salaryCurrency:input.answers.currency,yearsExperience:experienceYears[input.answers.experience]??0,version:1};
  const now=new Date().toISOString();const onboardingAnswers={...input.answers,promoCode:input.answers.promoCode.trim().toUpperCase(),locale:input.locale,completedFrom:"web",completedAt:now};
  const{error}=await client.from("profiles").upsert({id:user.id,full_name:fullName,email:existing?.email||user.email||null,phone:existing?.phone||null,role:input.answers.specialtyLabels.join(", ")||input.answers.categoryLabel,location:input.answers.city,skills:input.answers.specialtyLabels,work_modes:input.answers.priorities.includes("remote")?["Remoto","Híbrido"]:[],min_salary:input.answers.salaryMin,max_salary:input.answers.salaryMax,cv_path:cvPath,universal_profile:universal,onboarding_answers:onboardingAnswers,onboarding_completed_at:now,updated_at:now},{onConflict:"id"});if(error)throw error;
}

export function profileReadiness(profile:CandidateProfile|null){const u=profile?.universal;const checks=[Boolean(u?.firstName),Boolean(u?.lastName),Boolean(profile?.email),Boolean(profile?.phone),Boolean(u?.city),Boolean(u?.country),Boolean(profile?.cvPath),Boolean(u?.workAuthorizationCountries?.length),Boolean(u?.privacyConsent),Boolean(u?.automaticApplicationConsent)];return{ready:checks.every(Boolean),percentage:Math.round(checks.filter(Boolean).length/checks.length*100),missing:["nombre","apellidos","email","teléfono","ciudad","país","CV","permiso de trabajo","consentimiento de privacidad","autorización de candidatura"].filter((_,i)=>!checks[i])}}

export async function loadApplications():Promise<LiveApplication[]>{
  const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)return[];
  const{data:rows,error}=await client.from("applications").select("id,job_id,status,applied_at,updated_at,action_url,error_message,required_fields,delivery_status,answers").eq("user_id",user.id).order("updated_at",{ascending:false});if(error)throw error;if(!rows?.length)return[];
  const typedRows=rows as Array<{id:string;job_id:string;status:string;applied_at:string;updated_at:string;action_url:string|null;error_message:string|null;required_fields:unknown;delivery_status:string|null;answers:Record<string,unknown>|null}>;
  const jobIds=[...new Set(typedRows.map(row=>row.job_id))];const appIds=typedRows.map(row=>row.id);
  const[{data:jobRows},{data:eventRows}]=await Promise.all([client.from("jobs").select("id,external_id,source,company,title,summary,description,location,work_mode,salary_min,salary_max,contract_type,seniority,industry,apply_mode,published_at,metadata,application_capability,application_provider").in("id",jobIds),client.from("application_events").select("id,application_id,event_type,message,created_at,read_at").in("application_id",appIds).order("created_at",{ascending:true})]);
  const byJob=new Map(((jobRows??[])as JobRow[]).map(row=>[row.id,mapJob(row)]));
  const events=((eventRows??[]) as Array<{id:string;application_id:string;event_type:string;message:string;created_at:string;read_at:string|null}>).map(row=>({id:row.id,applicationId:row.application_id,type:row.event_type,message:row.message,createdAt:row.created_at,readAt:row.read_at}));
  return typedRows.flatMap(row=>{const job=byJob.get(row.job_id);const letter=typeof row.answers?.generatedCoverLetter==="string"?row.answers.generatedCoverLetter:null;const generatedAt=typeof row.answers?.coverLetterGeneratedAt==="string"?row.answers.coverLetterGeneratedAt:null;return job?[{id:row.id,jobId:row.job_id,status:row.status as ApplicationStatus,appliedAt:row.applied_at,updatedAt:row.updated_at,actionUrl:row.action_url,errorMessage:row.error_message,requiredFields:Array.isArray(row.required_fields)?row.required_fields.filter((field):field is string=>typeof field==="string"):[],deliveryStatus:row.delivery_status,coverLetter:letter,coverLetterGeneratedAt:generatedAt,job,events:events.filter(event=>event.applicationId===row.id)}]:[]});
}

export async function loadSavedJobs(){const client=createSupabaseBrowserClient();const user=await currentUser();if(!user)return[];const{data}=await client.from("swipes").select("job_id").eq("user_id",user.id).eq("direction","save").order("created_at",{ascending:false});if(!data?.length)return[];const{data:rows,error}=await client.from("jobs").select("id,external_id,source,company,title,summary,description,location,work_mode,salary_min,salary_max,contract_type,seniority,industry,apply_mode,published_at,metadata,application_capability,application_provider").in("id",data.map((row:{job_id:string})=>row.job_id));if(error)throw error;return((rows??[])as JobRow[]).map(mapJob)}

export async function startStripe(action:"checkout"|"portal"="checkout",plan?:"starter"|"pro"|"sprint"){const client=createSupabaseBrowserClient();let promotionCode="";const storedPlan=typeof window!=="undefined"?window.localStorage.getItem("landeo-selected-plan"):null;const selectedPlan=plan??(storedPlan==="starter"||storedPlan==="pro"||storedPlan==="sprint"?storedPlan:"pro");const locale=typeof window!=="undefined"&&window.localStorage.getItem("landeo-locale")==="en"?"en":"es";if(action==="checkout"){const user=await currentUser();if(user){const{data}=await client.from("profiles").select("onboarding_answers").eq("id",user.id).maybeSingle();const answers=data?.onboarding_answers as Record<string,unknown>|null;promotionCode=typeof answers?.promoCode==="string"?answers.promoCode:""}}const{data,error}=await client.functions.invoke("create-stripe-checkout",{body:{action,promotionCode,plan:selectedPlan,locale}});if(error instanceof FunctionsHttpError){const payload=await error.context.json().catch(()=>null)as{message?:string}|null;throw new Error(payload?.message||"No se pudo iniciar Stripe.")}if(error)throw error;if(!data?.url)throw new Error(data?.message||"Stripe no devolvió un enlace.");window.location.assign(data.url)}

export async function hasWebPro(){const user=await currentUser();if(!user)return false;const{data}=await createSupabaseBrowserClient().from("stripe_subscriptions").select("status,current_period_end").eq("user_id",user.id).in("status",["active","trialing"]).maybeSingle();return Boolean(data&&(!data.current_period_end||new Date(data.current_period_end).getTime()>Date.now()))}
