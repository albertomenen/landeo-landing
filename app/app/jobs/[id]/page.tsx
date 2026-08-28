import Link from "next/link";
import type {Metadata} from "next";
import {jobs} from "../../../../lib/fixtures";
import {Brand} from "../../../../components/Brand";

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;const job=jobs.find(j=>j.id===id)??jobs[0];
  const title=`${job.title} en ${job.company} | Landeo`;
  const description=job.summary;
  return {title,description,openGraph:{title,description,images:[]},twitter:{card:"summary",title,description,images:[]}};
}

export default async function JobDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const job=jobs.find(j=>j.id===id)??jobs[0];
  return <main className="detail-page"><header><Brand/><Link href="/app/jobs">← Volver al feed</Link></header><article><aside><span className="company-initials">{job.company[0]}</span><strong>{job.match}% coincidencia</strong><small>Relevancia según tu perfil</small></aside><section><span className="overline">{job.company} · {job.location}</span><h1>{job.title}</h1><p className="lead">{job.summary}</p><div className="job-detail-meta"><span>{job.workMode}</span><span>{job.contractType}</span><span>{job.seniority}</span></div><hr/><h2>Sobre el puesto</h2><p>{job.description}</p><h2>Habilidades relevantes</h2><ul>{job.skills.map(skill=><li key={skill}>{skill}</li>)}</ul><div className={`capability ${job.applyCapability}`}><b>↗</b><div><strong>{job.applyCapability==="automatic"?"Automática verificada":job.applyCapability==="assisted"?"Candidatura asistida":"Finalización externa"}</strong><small>El estado se actualizará únicamente cuando exista una señal verificable.</small></div></div><div className="sticky-apply"><Link href="/app/jobs" className="button button-ghost">Guardar</Link><Link href="/pricing" className="button button-primary">Postularme →</Link></div></section></article></main>
}
