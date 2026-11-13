import type {Metadata} from "next";
import {notFound} from "next/navigation";
import Link from "../../../components/SafeLink";
import SeoPage,{FaqSection,JsonLd,SeoCta,articleLd,breadcrumbLd,faqLd} from "../../../components/SeoPage";
import {SEO_UPDATED,SEO_UPDATED_LABEL,comparisonBySlug,comparisons} from "../../../lib/seo-content";

type Props={params:Promise<{slug:string}>};

export function generateStaticParams(){return comparisons.map(c=>({slug:c.slug}));}

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const c=comparisonBySlug((await params).slug);
  if(!c)return {};
  const path=`/comparativas/${c.slug}`;
  return {title:c.metaTitle,description:c.metaDescription,alternates:{canonical:path},openGraph:{title:c.metaTitle,description:c.metaDescription,type:"article",locale:"es_ES",url:path},twitter:{title:c.metaTitle,description:c.metaDescription}};
}

export default async function ComparisonPage({params}:Props){
  const c=comparisonBySlug((await params).slug);
  if(!c)notFound();
  const path=`/comparativas/${c.slug}`;
  return (
    <SeoPage crumbs={[{name:"Inicio",href:"/"},{name:"Comparativas",href:"/comparativas"},{name:`Landeo vs ${c.name}`}]}>
      <JsonLd data={articleLd({title:c.title,description:c.metaDescription,path,updated:SEO_UPDATED})}/>
      <JsonLd data={breadcrumbLd([{name:"Inicio",path:"/"},{name:"Comparativas",path:"/comparativas"},{name:c.title,path}])}/>
      <JsonLd data={faqLd(c.faqs)}/>
      <span className="overline">COMPARATIVA · ACTUALIZADA EL {SEO_UPDATED_LABEL.toUpperCase()}</span>
      <h1>{c.title}</h1>
      <p className="lead">{c.intro}</p>
      <p><strong>Qué es {c.name}.</strong> {c.what}</p>

      <section>
        <h2>Landeo y {c.name}, criterio por criterio</h2>
        <div className="seo-table-wrap"><table>
          <thead><tr><th scope="col">Criterio</th><th scope="col">Landeo</th><th scope="col">{c.name}</th></tr></thead>
          <tbody>{c.rows.map(([k,a,b])=><tr key={k}><th scope="row">{k}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
        </table></div>
        <p className="seo-note">Información pública revisada el {SEO_UPDATED_LABEL}. Las funciones y los precios de {c.name} pueden cambiar: consulta su web antes de decidir.</p>
      </section>

      <section><h2>Cuándo te conviene {c.name}</h2><ul>{c.chooseOther.map(t=><li key={t}>{t}</li>)}</ul></section>
      <section><h2>Cuándo te conviene Landeo</h2><ul>{c.chooseLandeo.map(t=><li key={t}>{t}</li>)}</ul></section>

      <SeoCta title="Pruébalo sin compromiso" text="Crear tu perfil y explorar ofertas en Landeo es gratis. Tú decides cuándo enviar candidaturas."/>
      <FaqSection faqs={c.faqs}/>
      <section><h2>Más comparativas</h2><ul className="seo-links">{comparisons.filter(x=>x.slug!==c.slug).map(x=><li key={x.slug}><Link href={`/comparativas/${x.slug}`}>{x.title}</Link></li>)}<li><Link href="/carta-de-presentacion">Guía: cómo escribir una carta de presentación</Link></li></ul></section>
    </SeoPage>
  );
}
