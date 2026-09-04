"use client";

import {useEffect,useState} from "react";
import Link from "../../components/SafeLink";
import type {LandingLocale} from "../../lib/locale";

const supportEmail="alberto@haired.app";

const copy={
  es:{
    nav:{home:"Inicio",pricing:"Precios",login:"Entrar",label:"Navegación de ayuda"},language:"Cambiar idioma",
    eyebrow:"CENTRO DE AYUDA",title:"¿Cómo podemos ayudarte?",lead:"Resuelve las dudas más habituales sobre tu cuenta, los pagos y tus candidaturas. Si algo sigue sin funcionar, escríbenos con los datos mínimos necesarios.",
    contact:"Contactar con soporte",account:"Ir a mi perfil",emailLabel:"SOPORTE POR EMAIL",
    areasTitle:"Empieza por aquí",areasLead:"Elige el área que mejor describe tu problema.",
    areas:[
      {icon:"◎",title:"Cuenta y acceso",text:"Enlaces de acceso, Google, Apple y problemas para entrar.",href:"#cuenta"},
      {icon:"◆",title:"Pagos y planes",text:"Suscripciones, cobros, facturas, cancelaciones y Stripe.",href:"#pagos"},
      {icon:"↗",title:"Candidaturas",text:"Estados, pasos externos, formularios y acciones pendientes.",href:"#candidaturas"},
      {icon:"▣",title:"Privacidad y CV",text:"Actualizar, descargar o solicitar la eliminación de tus datos.",href:"#privacidad"},
    ],
    prepareTitle:"Antes de escribirnos",prepareLead:"Así podremos entender la incidencia sin pedirte información innecesaria.",
    prepare:["Escribe desde el correo asociado a tu cuenta.","Indica qué estabas intentando hacer y en qué página ocurrió.","Incluye el mensaje de error exacto y, si ayuda, una captura sin datos sensibles.","Para cobros, indica fecha, importe y plan; nunca compartas el número completo de tu tarjeta."],
    warningTitle:"No envíes información sensible",warning:"Nunca envíes contraseñas, códigos de acceso, claves API, números completos de tarjeta, documentos de identidad ni CV completos por email. Stripe gestiona los datos de pago y Landeo nunca te pedirá esas credenciales por soporte.",
    faqTitle:"Preguntas frecuentes",faqLead:"Respuestas breves para los casos más comunes.",
    faq:[
      {id:"cuenta",question:"No puedo entrar en mi cuenta",answer:"Solicita un enlace nuevo desde la página de acceso y abre únicamente el más reciente en el mismo navegador. Si sigue fallando, escribe desde el correo de tu cuenta e incluye la URL y el mensaje de error."},
      {id:"pagos",question:"Tengo una duda sobre un cobro o mi suscripción",answer:"Revisa primero el recibo enviado por Stripe. Desde tu perfil puedes abrir el portal de suscripción para consultar o cancelar el plan. Si no puedes acceder, envíanos el correo de la cuenta, fecha, importe y plan. No envíes datos completos de tarjeta."},
      {id:"candidaturas",question:"Una candidatura no aparece como enviada",answer:"Landeo solo muestra una candidatura como enviada cuando existe una confirmación válida. Si aparece “Acción necesaria” o “Finalización externa”, debes completar el paso indicado en la web oficial de la empresa. Landeo no evita CAPTCHAs ni decisiones de terceros."},
      {id:"privacidad",question:"Quiero corregir o eliminar mis datos",answer:"Puedes modificar la información disponible desde tu perfil. Para una solicitud de acceso o eliminación, escribe desde el correo asociado a tu cuenta. Podremos pedir una comprobación razonable de identidad antes de actuar."},
      {id:"respuesta",question:"¿Cuándo recibiré una respuesta?",answer:"Revisamos los mensajes según disponibilidad y prioridad, pero no ofrecemos un plazo de respuesta garantizado. Las incidencias de acceso, seguridad o cobros incorrectos se priorizan cuando contienen información suficiente."},
    ],
    contactTitle:"¿Sigues necesitando ayuda?",contactLead:"Abre un correo con una plantilla breve. La atención se presta exclusivamente por email.",contactButton:"Escribir a soporte",copyEmail:"Copiar email",copied:"Email copiado",
    scopeTitle:"Qué puede hacer soporte",scope:"Podemos investigar problemas técnicos relacionados con Landeo y orientarte sobre el uso de tu cuenta. El soporte se presta con esfuerzos razonables y no garantiza entrevistas, ofertas de trabajo, contrataciones, resultados, reembolsos ni la reversión de decisiones tomadas por empresas, portales, bancos o proveedores externos. Landeo no actúa como empleador, reclutador, representante legal ni entidad financiera.",
    legal:"Al contactar aceptas que tratemos la información necesaria para responder a tu solicitud de acuerdo con nuestra",privacy:"Política de privacidad",terms:"Términos de servicio",footer:"Buscar trabajo, sin repetir tu historia.",
  },
  en:{
    nav:{home:"Home",pricing:"Pricing",login:"Log in",label:"Help navigation"},language:"Change language",
    eyebrow:"HELP CENTRE",title:"How can we help?",lead:"Find answers to common questions about your account, payments and applications. If something still is not working, email us with only the information needed to investigate.",
    contact:"Contact support",account:"Go to my profile",emailLabel:"EMAIL SUPPORT",
    areasTitle:"Start here",areasLead:"Choose the area that best describes your issue.",
    areas:[
      {icon:"◎",title:"Account and access",text:"Magic links, Google, Apple and sign-in issues.",href:"#account"},
      {icon:"◆",title:"Payments and plans",text:"Subscriptions, charges, invoices, cancellations and Stripe.",href:"#payments"},
      {icon:"↗",title:"Applications",text:"Statuses, external steps, forms and actions you need to take.",href:"#applications"},
      {icon:"▣",title:"Privacy and résumé",text:"Update, access or request deletion of your data.",href:"#privacy"},
    ],
    prepareTitle:"Before you email us",prepareLead:"This helps us understand the issue without requesting unnecessary information.",
    prepare:["Write from the email address connected to your account.","Tell us what you were trying to do and which page you were on.","Include the exact error and, if useful, a screenshot with sensitive data hidden.","For billing questions, include the date, amount and plan; never send your full card number."],
    warningTitle:"Do not send sensitive information",warning:"Never email passwords, access codes, API keys, full payment card numbers, identity documents or complete résumés. Stripe handles payment details and Landeo support will never ask you for those credentials.",
    faqTitle:"Frequently asked questions",faqLead:"Short answers for the most common situations.",
    faq:[
      {id:"account",question:"I cannot access my account",answer:"Request a new link from the login page and open only the most recent one in the same browser. If it still fails, email us from your account address and include the URL and exact error."},
      {id:"payments",question:"I have a question about a charge or subscription",answer:"Check the receipt sent by Stripe first. You can open the subscription portal from your profile to review or cancel your plan. If you cannot access it, send us the account email, date, amount and plan. Do not send full card details."},
      {id:"applications",question:"An application is not shown as submitted",answer:"Landeo only marks an application as submitted after receiving valid confirmation. If you see “Action required” or “External completion”, complete the indicated step on the employer’s official website. Landeo does not bypass CAPTCHAs or third-party decisions."},
      {id:"privacy",question:"I want to correct or delete my data",answer:"You can update available information from your profile. For an access or deletion request, email us from the address linked to your account. We may request reasonable identity verification before acting."},
      {id:"response",question:"When will I receive a response?",answer:"We review messages according to availability and priority, but do not offer a guaranteed response time. Access, security and incorrect-charge reports are prioritised when they include enough information."},
    ],
    contactTitle:"Still need help?",contactLead:"Open an email with a short template. Support is provided exclusively by email.",contactButton:"Email support",copyEmail:"Copy email",copied:"Email copied",
    scopeTitle:"What support can do",scope:"We can investigate technical issues involving Landeo and guide you through using your account. Support is provided on a reasonable-efforts basis and does not guarantee interviews, job offers, employment, outcomes, refunds or reversal of decisions made by employers, job platforms, banks or other third parties. Landeo is not an employer, recruiter, legal representative or financial institution.",
    legal:"By contacting us, you agree that we may process the information needed to answer your request under our",privacy:"Privacy Policy",terms:"Terms of Service",footer:"Job hunting, without repeating your story.",
  },
} as const;

function emailHref(locale:LandingLocale){
  const subject=locale==="es"?"Ayuda con mi cuenta de Landeo":"Help with my Landeo account";
  const body=locale==="es"?"Hola, necesito ayuda con Landeo.%0D%0A%0D%0ACorreo de mi cuenta:%0D%0ATipo de problema:%0D%0APágina donde ocurrió:%0D%0AMensaje de error:%0D%0ADescripción:%0D%0A%0D%0ANo he incluido contraseñas ni datos completos de tarjeta.":"Hello, I need help with Landeo.%0D%0A%0D%0AMy account email:%0D%0AIssue type:%0D%0APage where it happened:%0D%0AError message:%0D%0ADescription:%0D%0A%0D%0AI have not included passwords or full card details.";
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${body}`;
}

export default function SupportPage({initialLocale}:{initialLocale:LandingLocale}){
  const[locale,setLocale]=useState<LandingLocale>(initialLocale);const[copied,setCopied]=useState(false);const text=copy[locale];
  useEffect(()=>{const saved=window.localStorage.getItem("landeo-locale");if(saved==="es"||saved==="en")queueMicrotask(()=>setLocale(saved))},[]);
  useEffect(()=>{document.documentElement.lang=locale},[locale]);
  function changeLocale(next:LandingLocale){setLocale(next);setCopied(false);window.localStorage.setItem("landeo-locale",next)}
  async function copyAddress(){await navigator.clipboard.writeText(supportEmail);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}
  return <main className="support-page">
    <header className="support-header"><Link className="brand" href="/" aria-label="Landeo"><span className="brand-mark">L</span><span>Landeo</span></Link><nav aria-label={text.nav.label}><Link href="/">{text.nav.home}</Link><Link href="/pricing">{text.nav.pricing}</Link><Link href="/login">{text.nav.login}</Link><div className="language-switcher" role="group" aria-label={text.language}><span aria-hidden="true">◎</span><button type="button" className={locale==="es"?"active":""} aria-pressed={locale==="es"} onClick={()=>changeLocale("es")}>ES</button><i/><button type="button" className={locale==="en"?"active":""} aria-pressed={locale==="en"} onClick={()=>changeLocale("en")}>EN</button></div></nav></header>
    <section className="support-hero"><span className="affiliate-kicker">{text.eyebrow}</span><h1>{text.title}</h1><p>{text.lead}</p><div><a className="button button-primary" href={emailHref(locale)}>{text.contact} →</a><Link className="support-secondary" href="/app/profile">{text.account}</Link></div><small>{text.emailLabel} · {supportEmail}</small></section>
    <section className="support-areas"><div className="support-section-title"><span>01</span><div><h2>{text.areasTitle}</h2><p>{text.areasLead}</p></div></div><div className="support-area-grid">{text.areas.map(area=><a href={area.href} key={`${locale}-${area.title}`}><i>{area.icon}</i><h3>{area.title}</h3><p>{area.text}</p><b>→</b></a>)}</div></section>
    <section className="support-preparation"><div><span className="affiliate-kicker">{text.prepareTitle}</span><h2>{text.prepareLead}</h2></div><ol>{text.prepare.map((item,index)=><li key={item}><b>{String(index+1).padStart(2,"0")}</b><span>{item}</span></li>)}</ol></section>
    <aside className="support-warning"><b>!</b><div><strong>{text.warningTitle}</strong><p>{text.warning}</p></div></aside>
    <section className="support-faq"><div><span className="affiliate-kicker">LANDEO SUPPORT</span><h2>{text.faqTitle}</h2><p>{text.faqLead}</p></div><div>{text.faq.map(item=><details id={item.id} key={`${locale}-${item.question}`}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</div></section>
    <section className="support-contact"><div><span className="affiliate-kicker">{text.emailLabel}</span><h2>{text.contactTitle}</h2><p>{text.contactLead}</p></div><div><a className="button button-lime" href={emailHref(locale)}>{text.contactButton} →</a><button type="button" onClick={copyAddress}>{copied?text.copied:text.copyEmail}</button><small>{supportEmail}</small></div></section>
    <section className="support-scope"><h2>{text.scopeTitle}</h2><p>{text.scope}</p><small>{text.legal} <Link href="/privacy">{text.privacy}</Link> · <Link href="/terms">{text.terms}</Link>.</small></section>
    <footer className="support-footer"><div><Link className="brand" href="/"><span className="brand-mark">L</span><span>Landeo</span></Link><p>{text.footer}</p></div><nav><Link href="/pricing">{text.nav.pricing}</Link><Link href="/privacy">{text.privacy}</Link><Link href="/terms">{text.terms}</Link></nav><small>© 2026 Landeo</small></footer>
  </main>;
}
