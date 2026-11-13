import type {Metadata} from "next";
import Link from "../../components/SafeLink";
import SeoPage,{JsonLd,breadcrumbLd} from "../../components/SeoPage";
import {comparisons} from "../../lib/seo-content";

const path="/comparativas";
const title="Comparativas de herramientas para buscar trabajo";
const description="Landeo frente a InfoJobs, LinkedIn y otras herramientas de candidaturas: qué hace cada una y cuándo conviene usarla.";
export const metadata:Metadata={title,description,alternates:{canonical:path},openGraph:{title,description,locale:"es_ES",url:path},twitter:{title,description}};

export default function ComparisonsHub(){
  return (
    <SeoPage crumbs={[{name:"Inicio",href:"/"},{name:"Comparativas"}]}>
      <JsonLd data={breadcrumbLd([{name:"Inicio",path:"/"},{name:"Comparativas",path}])}/>
      <h1>Comparativas de herramientas para buscar trabajo</h1>
      <p className="lead">Portales, redes profesionales y herramientas de candidaturas con IA resuelven problemas distintos. Estas comparativas explican en qué se diferencian y cuándo conviene cada una, incluso cuando la mejor opción no es Landeo.</p>
      <ul className="seo-cards">{comparisons.map(c=><li key={c.slug}><Link href={`${path}/${c.slug}`}><strong>{c.title}</strong><span>{c.metaDescription}</span></Link></li>)}</ul>
    </SeoPage>
  );
}
