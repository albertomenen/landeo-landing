import type {ReactNode} from "react";
import Link from "./SafeLink";
import {Brand} from "./Brand";
import {SITE_ORIGIN,type Faq} from "../lib/seo-content";

export function JsonLd({data}:{data:unknown}){
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}}/>;
}

export function faqLd(faqs:Faq[]){
  return {"@context":"https://schema.org","@type":"FAQPage",mainEntity:faqs.map(f=>({"@type":"Question",name:f.q,acceptedAnswer:{"@type":"Answer",text:f.a}}))};
}

export function breadcrumbLd(items:Array<{name:string;path:string}>){
  return {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:items.map((item,i)=>({"@type":"ListItem",position:i+1,name:item.name,item:`${SITE_ORIGIN}${item.path}`}))};
}

export function articleLd(input:{title:string;description:string;path:string;updated:string}){
  return {"@context":"https://schema.org","@type":"Article",headline:input.title,description:input.description,inLanguage:"es",dateModified:input.updated,datePublished:input.updated,mainEntityOfPage:`${SITE_ORIGIN}${input.path}`,author:{"@type":"Organization",name:"Landeo",url:SITE_ORIGIN},publisher:{"@type":"Organization",name:"Landeo",url:SITE_ORIGIN}};
}

export function FaqSection({faqs}:{faqs:Faq[]}){
  return <section className="seo-faq"><h2>Preguntas frecuentes</h2>{faqs.map(f=><details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</section>;
}

export function SeoCta({title,text}:{title:string;text:string}){
  return <aside className="seo-cta"><h2>{title}</h2><p>{text}</p><Link href="/signup" className="seo-cta-button">Crear mi perfil gratis →</Link></aside>;
}

export default function SeoPage({crumbs,children}:{crumbs:Array<{name:string;href?:string}>;children:ReactNode}){
  return (
    <main className="seo-page" lang="es">
      <header>
        <Brand/>
        <nav aria-label="Navegación principal"><Link href="/carta-de-presentacion">Cartas de presentación</Link><Link href="/comparativas">Comparativas</Link><Link href="/pricing">Precios</Link><Link href="/signup" className="seo-nav-cta">Empezar gratis</Link></nav>
      </header>
      <article>
        <nav className="seo-crumbs" aria-label="Migas de pan">{crumbs.map((c,i)=><span key={c.name}>{c.href?<Link href={c.href}>{c.name}</Link>:c.name}{i<crumbs.length-1&&" › "}</span>)}</nav>
        {children}
      </article>
      <footer>
        <Link href="/">Inicio</Link><Link href="/carta-de-presentacion">Cartas de presentación</Link><Link href="/comparativas">Comparativas</Link><Link href="/pricing">Precios</Link><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link><Link href="/support">Ayuda</Link>
      </footer>
    </main>
  );
}
