import Link from "next/link";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {cache} from "react";
import {createClient} from "@supabase/supabase-js";
import {Brand} from "../../../../components/Brand";

type JobDetailRow={
  id:string;company:string;title:string;summary:string|null;description:string|null;location:string|null;work_mode:string|null;
  contract_type:string|null;seniority:string|null;application_capability:string|null;metadata:Record<string,unknown>|null;
};

const clean=(value:string|null)=>(value??"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const loadJob=cache(async(id:string)=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return null;
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data,error}=await client.from("jobs").select("id,company,title,summary,description,location,work_mode,contract_type,seniority,application_capability,metadata").eq("id",id).eq("status","active").maybeSingle();
  if(error)return null;return data as JobDetailRow|null;
});

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const{id}=await params;const job=await loadJob(id);if(!job)return{title:"Oferta | Landeo"};
  const title=`${job.title} en ${job.company} | Landeo`;const description=clean(job.summary)||"Descubre esta oportunidad en Landeo.";
  return{title,description,openGraph:{title,description,images:[]},twitter:{card:"summary",title,description,images:[]}};
}

export default async function JobDetail({params}:{params:Promise<{id:string}>}){
  const{id}=await params;const job=await loadJob(id);if(!job)notFound();
  const metadata=job.metadata??{};const requirements=Array.isArray(metadata.requirements)?metadata.requirements.filter((item):item is string=>typeof item==="string").slice(0,8):[];
  const match=typeof metadata.match_score==="number"?Math.min(98,Math.round(metadata.match_score)):job.application_capability==="automatic"?92:job.application_capability==="assisted"?86:78;
  const capability=job.application_capability==="automatic"?"automatic":job.application_capability==="assisted"?"assisted":"external";
  return <main className="detail-page"><header><Brand/><Link href="/app/jobs">← Volver al feed</Link></header><article><aside><span className="company-initials">{job.company[0]}</span><strong>{match}% coincidencia</strong><small>Relevancia según tu perfil</small></aside><section><span className="overline">{job.company} · {job.location||"Ubicación no indicada"}</span><h1>{job.title}</h1><p className="lead">{clean(job.summary)||"Consulta todos los detalles de esta oportunidad."}</p><div className="job-detail-meta"><span>{job.work_mode||"Modalidad no indicada"}</span><span>{job.contract_type||"Contrato no indicado"}</span><span>{job.seniority||"Nivel no indicado"}</span></div><hr/><h2>Sobre el puesto</h2><p>{clean(job.description)||clean(job.summary)}</p>{requirements.length>0&&<><h2>Requisitos destacados</h2><ul>{requirements.map(skill=><li key={skill}>{skill}</li>)}</ul></>}<div className={`capability ${capability}`}><b>↗</b><div><strong>{capability==="automatic"?"Automática verificada":capability==="assisted"?"Candidatura asistida":"Finalización externa"}</strong><small>El estado se actualizará únicamente cuando exista una señal verificable.</small></div></div><div className="sticky-apply"><Link href="/app/jobs" className="button button-ghost">Volver</Link><Link href="/app/jobs" className="button button-primary">Ir al feed y postularme →</Link></div></section></article></main>;
}
