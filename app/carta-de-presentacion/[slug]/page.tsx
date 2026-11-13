import type {Metadata} from "next";
import {notFound} from "next/navigation";
import Link from "../../../components/SafeLink";
import SeoPage,{FaqSection,JsonLd,SeoCta,articleLd,breadcrumbLd,faqLd} from "../../../components/SeoPage";
import {SEO_UPDATED,SEO_UPDATED_LABEL,coverLetterGeneral,coverLetterRoles,roleBySlug} from "../../../lib/seo-content";

type Props={params:Promise<{slug:string}>};

export function generateStaticParams(){return coverLetterRoles.map(r=>({slug:r.slug}));}

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const role=roleBySlug((await params).slug);
  if(!role)return {};
  const path=`/carta-de-presentacion/${role.slug}`;
  return {title:role.metaTitle,description:role.metaDescription,alternates:{canonical:path},openGraph:{title:role.metaTitle,description:role.metaDescription,type:"article",locale:"es_ES",url:path},twitter:{title:role.metaTitle,description:role.metaDescription}};
}

export default async function CoverLetterRolePage({params}:Props){
  const role=roleBySlug((await params).slug);
  if(!role)notFound();
  const path=`/carta-de-presentacion/${role.slug}`;
  const faqs=[...role.faqs,coverLetterGeneral.faqs[0]];
  const related=coverLetterRoles.filter(r=>r.slug!==role.slug).slice(0,4);
  return (
    <SeoPage crumbs={[{name:"Inicio",href:"/"},{name:"Carta de presentación",href:"/carta-de-presentacion"},{name:role.role}]}>
      <JsonLd data={articleLd({title:role.title,description:role.metaDescription,path,updated:SEO_UPDATED})}/>
      <JsonLd data={breadcrumbLd([{name:"Inicio",path:"/"},{name:"Carta de presentación",path:"/carta-de-presentacion"},{name:role.title,path}])}/>
      <JsonLd data={faqLd(faqs)}/>
      <span className="overline">EJEMPLO · ACTUALIZADO EL {SEO_UPDATED_LABEL.toUpperCase()}</span>
      <h1>{role.title}</h1>
      <p className="lead">{role.intro}</p>
      <p>{role.audience}</p>

      <section>
        <h2>Ejemplo de carta de presentación para {role.role}</h2>
        <p>Sustituye lo que aparece entre corchetes por tus datos reales y elimina lo que no se ajuste a tu caso.</p>
        <blockquote className="seo-letter">{role.letter.map((p,i)=><p key={i}>{p.split("\n").map((line,j)=><span key={j}>{line}<br/></span>)}</p>)}</blockquote>
      </section>

      <section>
        <h2>Cómo adaptarla a tu caso</h2>
        <ul>{role.tips.map(t=><li key={t}>{t}</li>)}</ul>
      </section>

      <section>
        <h2>Errores que debes evitar</h2>
        <ul>{role.mistakes.map(t=><li key={t}>{t}</li>)}</ul>
      </section>

      <SeoCta title={`Prepara tu carta de ${role.role} en minutos`} text="Landeo usa tu perfil para preparar un CV y una carta adaptados a cada oferta. Tú revisas antes de enviar."/>
      <FaqSection faqs={faqs}/>

      <section>
        <h2>Otros ejemplos de carta de presentación</h2>
        <ul className="seo-links">{related.map(r=><li key={r.slug}><Link href={`/carta-de-presentacion/${r.slug}`}>{r.title.replace(": ejemplo y guía","")}</Link></li>)}<li><Link href="/carta-de-presentacion">Guía completa: cómo escribir una carta de presentación</Link></li></ul>
      </section>
    </SeoPage>
  );
}
