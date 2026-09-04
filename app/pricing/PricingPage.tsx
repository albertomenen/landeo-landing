"use client";

import {useEffect,useState} from "react";
import Link from "../../components/SafeLink";
import {PricingActions} from "../../components/PricingActions";
import type {LandingLocale} from "../../lib/locale";

const copy={
  es:{
    nav:{home:"Cómo funciona",login:"Entrar",label:"Navegación de precios"},language:"Cambiar idioma",eyebrow:"PRECIOS DE LANZAMIENTO",title:"Elige tu ritmo.",accent:"Nosotros hacemos el trabajo repetitivo.",lead:"Un solo producto, todas las funciones y un límite claro de candidaturas. Sin complementos ni sorpresas.",free:"Puedes crear tu perfil, explorar empleos y guardar oportunidades gratis.",popular:"MÁS ELEGIDO",perMonth:"al mes",threeMonths:"por 3 meses",tax:"Impuestos según país",applications:"candidaturas",equivalent:"Equivale a 29,99 €/mes",select:"Elegir",loading:"Abriendo Stripe…",
    plans:[
      {id:"starter",name:"STARTER",title:"Empieza con foco",price:"14,99 €",period:"perMonth",volume:"50",description:"Para probar el mercado y postularte solo a las oportunidades que más encajan."},
      {id:"pro",name:"PRO",title:"Muévete más rápido",price:"34,99 €",period:"perMonth",volume:"200",description:"Para una búsqueda activa con suficiente volumen para generar entrevistas."},
      {id:"sprint",name:"SPRINT",title:"Ve a por el cambio",price:"89,99 €",period:"threeMonths",volume:"600",description:"Tres meses de búsqueda intensiva con todos los créditos disponibles desde el primer día."},
    ],
    includedTitle:"Todo incluido en cada plan",includedLead:"El precio cambia por el volumen, no por las herramientas que necesitas.",features:["Candidaturas de principio a fin","CV adaptado a cada puesto","Cartas de presentación personalizadas","Modo automático, revisión o asistido","Seguimiento y actualizaciones","Acceso web y móvil"],creditTitle:"Un crédito, una candidatura enviada",creditBody:"Solo descontamos una candidatura cuando el envío se completa correctamente. Las candidaturas fallidas o incompatibles no consumen tu límite.",faqTitle:"Preguntas frecuentes",
    faq:[["¿Puedo usar Landeo gratis?","Sí. Crear el perfil, explorar oportunidades y guardar empleos es gratis. Necesitas un plan cuando quieras enviar candidaturas desde Landeo."],["¿Qué ocurre si no uso todas mis candidaturas?","Mientras mantengas activa tu suscripción, las candidaturas no utilizadas se acumulan para el siguiente ciclo. Al cancelar, caducan al terminar el periodo pagado."],["¿Puedo cancelar cuando quiera?","Sí. Puedes gestionar o cancelar la renovación desde el portal seguro de Stripe."],["¿Landeo garantiza entrevistas?","No. Landeo aumenta tu capacidad para encontrar y enviar candidaturas relevantes, pero los resultados dependen de tu perfil y del mercado."]],
    stripe:"Pago seguro con Stripe",stripeBody:"Stripe gestiona el cobro y la suscripción. Landeo activa el plan únicamente después de recibir una confirmación válida.",footer:"Buscar trabajo, sin repetir tu historia.",privacy:"Privacidad",terms:"Términos",affiliate:"Afiliados",support:"Ayuda",
  },
  en:{
    nav:{home:"How it works",login:"Log in",label:"Pricing navigation"},language:"Change language",eyebrow:"LAUNCH PRICING",title:"Choose your pace.",accent:"We handle the repetitive work.",lead:"One product, every feature and a clear application limit. No add-ons or surprises.",free:"Create your profile, explore jobs and save opportunities for free.",popular:"MOST POPULAR",perMonth:"per month",threeMonths:"for 3 months",tax:"Taxes vary by country",applications:"applications",equivalent:"Equivalent to €29.99/month",select:"Choose",loading:"Opening Stripe…",
    plans:[
      {id:"starter",name:"STARTER",title:"Start with focus",price:"€14.99",period:"perMonth",volume:"50",description:"For testing the market and applying only to the opportunities that fit best."},
      {id:"pro",name:"PRO",title:"Move faster",price:"€34.99",period:"perMonth",volume:"200",description:"For an active search with enough volume to create more interview opportunities."},
      {id:"sprint",name:"SPRINT",title:"Commit to the change",price:"€89.99",period:"threeMonths",volume:"600",description:"Three months of focused searching, with every credit available from day one."},
    ],
    includedTitle:"Everything included in every plan",includedLead:"The price changes with volume, not with the tools you need.",features:["End-to-end applications","A résumé tailored to every role","Personalized cover letters","Automatic, review or assisted mode","Tracking and real-time updates","Web and mobile access"],creditTitle:"One credit, one successful application",creditBody:"An application is only deducted when it is submitted successfully. Failed or unsupported applications do not use your allowance.",faqTitle:"Frequently asked questions",
    faq:[["Can I use Landeo for free?","Yes. Creating your profile, exploring opportunities and saving jobs is free. You need a plan when you want to submit applications through Landeo."],["What happens to unused applications?","As long as your subscription stays active, unused applications roll into the next billing cycle. If you cancel, they expire at the end of the paid period."],["Can I cancel at any time?","Yes. You can manage or cancel your renewal through the secure Stripe portal."],["Does Landeo guarantee interviews?","No. Landeo helps you find and submit more relevant applications, but outcomes depend on your profile and the market."]],
    stripe:"Secure payment with Stripe",stripeBody:"Stripe manages payment and subscriptions. Landeo activates a plan only after receiving a valid confirmation.",footer:"Job hunting, without repeating your story.",privacy:"Privacy",terms:"Terms",affiliate:"Affiliates",support:"Help",
  },
} as const;

export default function PricingPage({initialLocale}:{initialLocale:LandingLocale}){
  const[locale,setLocale]=useState<LandingLocale>(initialLocale);const text=copy[locale];
  useEffect(()=>{const saved=window.localStorage.getItem("landeo-locale");if(saved==="es"||saved==="en")queueMicrotask(()=>setLocale(saved))},[]);
  useEffect(()=>{document.documentElement.lang=locale},[locale]);
  function changeLocale(next:LandingLocale){setLocale(next);window.localStorage.setItem("landeo-locale",next)}
  return <main className="pricing-page-new">
    <header className="pricing-header"><Link className="brand" href="/" aria-label="Landeo"><span className="brand-mark">L</span><span>Landeo</span></Link><nav aria-label={text.nav.label}><Link href="/">{text.nav.home}</Link><Link href="/login">{text.nav.login}</Link><div className="language-switcher" role="group" aria-label={text.language}><span aria-hidden="true">◎</span><button type="button" className={locale==="es"?"active":""} aria-pressed={locale==="es"} onClick={()=>changeLocale("es")}>ES</button><i/><button type="button" className={locale==="en"?"active":""} aria-pressed={locale==="en"} onClick={()=>changeLocale("en")}>EN</button></div></nav></header>
    <section className="pricing-launch-hero"><span className="affiliate-kicker">{text.eyebrow}</span><h1>{text.title}<br/><em>{text.accent}</em></h1><p>{text.lead}</p><small>✓ {text.free}</small></section>
    <section className="pricing-plans" aria-label={text.nav.label}>{text.plans.map((plan,index)=><article key={plan.id} className={index===1?"featured":""}>{index===1&&<span className="pricing-popular">{text.popular}</span>}<span className="plan-name">{index===1?"✦ ":""}{plan.name}</span><h2>{plan.title}</h2><p className="pricing-description">{plan.description}</p><div className="pricing-price"><strong>{plan.price}</strong><span>{text[plan.period]}<small>{text.tax}</small></span></div><div className="pricing-volume"><strong>{plan.volume}</strong><span>{text.applications}</span></div>{plan.id==="sprint"&&<small className="pricing-equivalent">{text.equivalent}</small>}<PricingActions plan={plan.id} label={`${text.select} ${plan.name}`} loadingLabel={text.loading} locale={locale}/></article>)}</section>
    <section className="pricing-included"><div><span className="affiliate-kicker">LANDEO</span><h2>{text.includedTitle}</h2><p>{text.includedLead}</p></div><ul>{text.features.map(feature=><li key={feature}><span>✓</span>{feature}</li>)}</ul></section>
    <section className="pricing-credit"><span>01</span><div><h2>{text.creditTitle}</h2><p>{text.creditBody}</p></div></section>
    <section className="pricing-faq"><h2>{text.faqTitle}</h2><div>{text.faq.map(([question,answer])=><details key={`${locale}-${question}`}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="pricing-stripe"><b>◆</b><div><strong>{text.stripe}</strong><p>{text.stripeBody}</p></div></section>
    <footer className="pricing-footer"><div><Link className="brand" href="/"><span className="brand-mark">L</span><span>Landeo</span></Link><p>{text.footer}</p></div><nav><Link href="/support">{text.support}</Link><Link href="/affiliate-program">{text.affiliate}</Link><Link href="/privacy">{text.privacy}</Link><Link href="/terms">{text.terms}</Link></nav><small>© 2026 Landeo</small></footer>
  </main>;
}
