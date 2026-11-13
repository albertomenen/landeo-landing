import type {Metadata} from "next";
import Link from "../../components/SafeLink";
import SeoPage,{FaqSection,JsonLd,SeoCta,articleLd,breadcrumbLd,faqLd} from "../../components/SeoPage";
import {SEO_UPDATED,SEO_UPDATED_LABEL,coverLetterGeneral,coverLetterRoles} from "../../lib/seo-content";

const path="/carta-de-presentacion";
const title="Carta de presentación: guía, estructura y ejemplos por profesión";
const description="Cómo escribir una carta de presentación que se lea: estructura paso a paso y ejemplos para camarero, administrativo, enfermería, programador, marketing y más.";

export const metadata:Metadata={title,description,alternates:{canonical:path},openGraph:{title,description,type:"article",locale:"es_ES",url:path},twitter:{title,description}};

export default function CoverLetterHub(){
  return (
    <SeoPage crumbs={[{name:"Inicio",href:"/"},{name:"Carta de presentación"}]}>
      <JsonLd data={articleLd({title,description,path,updated:SEO_UPDATED})}/>
      <JsonLd data={breadcrumbLd([{name:"Inicio",path:"/"},{name:"Carta de presentación",path}])}/>
      <JsonLd data={faqLd(coverLetterGeneral.faqs)}/>
      <span className="overline">GUÍA · ACTUALIZADA EL {SEO_UPDATED_LABEL.toUpperCase()}</span>
      <h1>Carta de presentación: cómo escribirla y ejemplos por profesión</h1>
      <p className="lead">Una carta de presentación es un mensaje breve que acompaña a tu CV y explica por qué eres buena opción para ese puesto concreto. Aquí tienes la estructura que funciona y ejemplos completos que puedes adaptar.</p>

      <section>
        <h2>La estructura de una buena carta, en cinco partes</h2>
        <ol className="seo-steps">{coverLetterGeneral.structure.map(([name,text])=><li key={name}><strong>{name}.</strong> {text}</li>)}</ol>
        <p>Mantén la carta entre 150 y 300 palabras, con un tono natural y profesional. Cambia siempre el nombre de la empresa, el puesto y al menos un detalle específico de la oferta: es lo que separa una carta útil de una plantilla.</p>
      </section>

      <section>
        <h2>Ejemplos de carta de presentación por profesión</h2>
        <ul className="seo-cards">{coverLetterRoles.map(r=><li key={r.slug}><Link href={`${path}/${r.slug}`}><strong>{r.title.replace(": ejemplo y guía","")}</strong><span>{r.audience}</span></Link></li>)}</ul>
      </section>

      <section>
        <h2>Errores que más restan</h2>
        <ul>
          <li>Enviar la misma carta a todas las ofertas.</li>
          <li>Repetir el currículum en vez de destacar lo más relevante para el puesto.</li>
          <li>Hablar solo de lo que tú quieres, sin explicar qué aportas.</li>
          <li>Faltas de ortografía o un tono demasiado rígido o demasiado informal.</li>
        </ul>
      </section>

      <SeoCta title="¿Quieres una carta adaptada a cada oferta?" text="Landeo prepara tu CV y una carta de presentación para cada oferta a partir de un único perfil. Tú revisas y decides."/>
      <FaqSection faqs={coverLetterGeneral.faqs}/>
    </SeoPage>
  );
}
