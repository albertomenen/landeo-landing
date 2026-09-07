"use client";

import {useEffect,useState} from "react";
import Link from "../components/SafeLink";
import type {LandingLocale} from "../lib/locale";

const copy={
  es:{
    nav:{how:"Cómo funciona",pricing:"Precios",login:"Entrar",start:"Empezar gratis",label:"Navegación principal"},
    hero:{
      eyebrow:"Tu búsqueda de empleo, por fin en movimiento",
      title:"Deja de rellenar formularios.",
      accent:"Empieza a recibir respuestas.",
      lead:"Landeo encuentra ofertas que encajan contigo y convierte un gesto en una candidatura preparada con tu perfil. Tú eliges el trabajo; nosotros quitamos lo repetitivo.",
      primary:"Crear mi perfil gratis",secondary:"Ver cómo funciona",
      trust:["Explorar es gratis","Tú apruebas cada decisión","Sin promesas vacías"],
    },
    product:{
      found:"Oferta compatible encontrada",discover:"DESCUBRIR",one:"Una oferta cada vez",match:"94% encaje",
      aria:"Vista de ejemplo del feed de empleos",companyMeta:"Tecnología · Madrid · Híbrido",sample:"VISTA DE EJEMPLO",
      description:"Convierte problemas complejos en experiencias simples para miles de personas.",
      tags:["Producto","€50k–€65k","3+ años"],ready:"Lista para revisar",readyText:"Tu perfil cubre la información necesaria.",
      apply:"Sí, me interesa",hint:"Izquierda para pasar · Derecha para avanzar",reused:"Perfil reutilizado. Formulario evitado.",
      save:"Guardar oferta",pass:"Pasar oferta",
    },
    dashboard:{
      kicker:"TODO TU PROCESO, EN UNA SOLA VISTA",title:"De candidatura a entrevista.",accent:"Sin perder el hilo.",
      text:"Landeo organiza cada oportunidad y te enseña qué está pasando, qué viene después y cuándo necesitas actuar.",
      aria:"Vista de ejemplo del panel de candidaturas de Landeo",example:"VISTA DE PRODUCTO",heading:"Mis candidaturas",
      nav:["Empleos","Candidaturas","Perfil"],settings:"Ajustes",help:"Ayuda",
      columns:[
        {title:"Enviadas",count:"2",jobs:[
          {role:"Product Designer",company:"Notion",location:"Remoto",activity:"Candidatura enviada hoy",status:"En revisión",logo:"/company-logos/notion.webp"},
          {role:"Strategy Associate",company:"McKinsey",location:"Madrid",activity:"Enviada hace 4 días",status:"Esperando respuesta",logo:"/company-logos/mckinsey.png"},
        ]},
        {title:"Entrevistas",count:"1",jobs:[
          {role:"Customer Success Lead",company:"HubSpot",location:"Remoto",activity:"Entrevista en 3 días",status:"Entrevista",logo:"/company-logos/hubspot.png"},
        ]},
        {title:"Resultados",count:"1",jobs:[
          {role:"AI Product Manager",company:"Anthropic",location:"Londres",activity:"Respuesta recibida hoy",status:"Oferta",logo:"/company-logos/anthropic.webp"},
        ]},
      ],
    },
    social:{
      title:"Candidatos de Landeo han conseguido puestos en empresas líderes",
      subtitle:"Desde recién graduados hasta profesionales con experiencia.",
      note:"Los logotipos identifican empleadores mencionados por usuarios y no implican colaboración o respaldo de estas empresas.",
    },
    outcomes:["Menos formularios","Más oportunidades relevantes","Una búsqueda que sí puedes seguir"],
    pain:{
      kicker:"ESTO NO DEBERÍA SEGUIR PASANDO",title:"Buscar trabajo ya es un trabajo.",accent:"Landeo cambia esa parte.",
      text:"Tu tiempo debería ir a elegir bien, prepararte y hablar con empresas. No a copiar tu nombre, experiencia y disponibilidad en cada portal.",
      cta:"Quiero dejar atrás los formularios",
      items:["Volver a escribir tu experiencia","Perder ofertas entre veinte pestañas","Adaptar lo mismo una y otra vez","No saber qué candidatura necesita tu atención"],
    },
    steps:{
      kicker:"DE CERO A CANDIDATURA, SIN EL LABERINTO",title:"Tres pasos. Un perfil.",accent:"Todo más claro.",
      items:[
        ["Cuéntanos qué buscas","Completa una vez tu experiencia, preferencias y condiciones. Ese perfil viaja contigo."],
        ["Decide con un gesto","Revisa ofertas de una en una. Pasa las que no encajan y avanza con las que sí."],
        ["Landeo hace el trabajo pesado","Preparamos la candidatura y te avisamos solo cuando hace falta una respuesta tuya."],
      ],
    },
    control:{
      kicker:"AUTOMATIZAR SIN PERDER EL CONTROL",title:"No todas las candidaturas son iguales.",accent:"Landeo te lo dice antes.",
      text:"Cada oferta muestra cómo puede tramitarse. Sin botones ambiguos, sin envíos silenciosos y sin hacerte creer que todos los portales funcionan igual.",
      promise:"Tu regla siempre manda",promiseText:"Nada avanza fuera de las preferencias y datos que has definido.",
      items:[
        {title:"Automática",label:"Landeo se ocupa",text:"Cuando una oferta es compatible, Landeo prepara y envía la candidatura con los datos que ya aprobaste.",className:"automatic"},
        {title:"Asistida",label:"Tú completas lo importante",text:"Si falta una respuesta o una decisión, te la mostramos de forma clara antes de continuar.",className:"assisted"},
        {title:"Externa",label:"Sin perder el hilo",text:"Si la empresa exige terminar fuera, te llevamos al paso exacto y conservamos el seguimiento.",className:"external"},
      ],
    },
    profile:{
      kicker:"TU PERFIL UNIVERSAL",title:"Lo cuentas una vez.",accent:"Landeo lo pone a trabajar.",
      text:"Experiencia, estudios, disponibilidad y preferencias viven en un único lugar. Puedes revisar, corregir o borrar tus datos cuando quieras.",
      benefits:["Reutilizable en cada candidatura","Editable en cualquier momento","Visible antes de enviar"],
      aria:"Ejemplo de perfil universal",name:"Tu perfil profesional",status:"Listo para empezar",
      fields:[["Experiencia","3 puestos añadidos"],["Preferencias","Madrid · Híbrido · Producto"],["Respuestas frecuentes","Disponibilidad y condiciones"]],
    },
    faq:{
      kicker:"SIN LETRA PEQUEÑA",title:"Antes de dar el primer",accent:"sí.",
      items:[
        ["¿Landeo se postula sin que yo lo sepa?","No. Tú marcas las ofertas que te interesan y defines tus preferencias. Si una candidatura necesita una respuesta o revisión, Landeo se detiene y te avisa."],
        ["¿Todas las ofertas permiten candidatura automática?","No. Depende del portal y de los datos que solicite la empresa. Por eso indicamos si el proceso es automático, asistido o debe terminarse fuera de Landeo."],
        ["¿Puedo usar Landeo gratis?","Sí. Puedes crear tu perfil y explorar ofertas gratis. Los planes y límites de candidatura están explicados de forma transparente en la página de precios."],
        ["¿Puedo cambiar o borrar mis datos?","Sí. Tu perfil es editable y puedes gestionar tus datos desde tu cuenta. Tú mantienes el control sobre la información que utilizamos."],
      ],
    },
    final:{kicker:"TU PRÓXIMA OPORTUNIDAD NO NECESITA OTRO FORMULARIO",title:"Haz sitio para las entrevistas.",accent:"Landeo se ocupa del camino.",cta:"Empezar gratis",note:"Crear el perfil no cuesta nada · Tú decides cuándo avanzar"},
    footer:{tagline:"Buscar trabajo, sin repetir tu historia.",privacy:"Privacidad",terms:"Términos",affiliate:"Afiliados",support:"Ayuda"},
    language:"Cambiar idioma",
  },
  en:{
    nav:{how:"How it works",pricing:"Pricing",login:"Log in",start:"Start free",label:"Main navigation"},
    hero:{
      eyebrow:"Your job search, finally moving forward",
      title:"Stop filling out forms.",
      accent:"Start hearing back.",
      lead:"Landeo finds roles that fit and turns one simple decision into an application prepared with your profile. You choose the opportunity; we remove the repetitive work.",
      primary:"Create my free profile",secondary:"See how it works",
      trust:["Free to explore","You approve every decision","No empty promises"],
    },
    product:{
      found:"High-match role found",discover:"DISCOVER",one:"One role at a time",match:"94% match",
      aria:"Example view of the job feed",companyMeta:"Technology · London · Hybrid",sample:"EXAMPLE VIEW",
      description:"Turn complex problems into simple experiences for thousands of people.",
      tags:["Product","£50k–£65k","3+ years"],ready:"Ready to review",readyText:"Your profile covers the required information.",
      apply:"Yes, I'm interested",hint:"Left to pass · Right to move forward",reused:"Profile reused. Form avoided.",
      save:"Save role",pass:"Pass on role",
    },
    dashboard:{
      kicker:"YOUR WHOLE SEARCH, IN ONE VIEW",title:"From application to interview.",accent:"Never lose the thread.",
      text:"Landeo organizes every opportunity and shows you what is happening, what comes next and when you need to act.",
      aria:"Example view of the Landeo applications dashboard",example:"PRODUCT PREVIEW",heading:"My applications",
      nav:["Jobs","Applications","Profile"],settings:"Settings",help:"Help",
      columns:[
        {title:"Applied",count:"2",jobs:[
          {role:"Product Designer",company:"Notion",location:"Remote",activity:"Applied today",status:"Under review",logo:"/company-logos/notion.webp"},
          {role:"Strategy Associate",company:"McKinsey",location:"Madrid",activity:"Applied 4 days ago",status:"Awaiting response",logo:"/company-logos/mckinsey.png"},
        ]},
        {title:"Interviews",count:"1",jobs:[
          {role:"Customer Success Lead",company:"HubSpot",location:"Remote",activity:"Interview in 3 days",status:"Interview",logo:"/company-logos/hubspot.png"},
        ]},
        {title:"Results",count:"1",jobs:[
          {role:"AI Product Manager",company:"Anthropic",location:"London",activity:"Reply received today",status:"Offer",logo:"/company-logos/anthropic.webp"},
        ]},
      ],
    },
    social:{
      title:"Landeo candidates have landed roles at leading companies",
      subtitle:"From new graduates to experienced professionals.",
      note:"Logos identify employers referenced by users and do not imply a partnership or endorsement by these companies.",
    },
    outcomes:["Fewer forms","More relevant opportunities","A job search you can actually track"],
    pain:{
      kicker:"THIS SHOULD NOT STILL BE HAPPENING",title:"Job hunting is already a job.",accent:"Landeo changes that part.",
      text:"Your time should go into choosing well, preparing and talking to companies — not copying your name, experience and availability into every portal.",
      cta:"I want to leave forms behind",
      items:["Typing your experience all over again","Losing roles across twenty open tabs","Reworking the same answers every time","Not knowing which application needs you"],
    },
    steps:{
      kicker:"FROM ZERO TO APPLICATION, WITHOUT THE MAZE",title:"Three steps. One profile.",accent:"Everything clearer.",
      items:[
        ["Tell us what you want","Add your experience, preferences and conditions once. That profile travels with you."],
        ["Decide with one gesture","Review one role at a time. Pass on the wrong fits and move forward with the right ones."],
        ["Landeo handles the busywork","We prepare the application and only call you in when a decision or answer is needed."],
      ],
    },
    control:{
      kicker:"AUTOMATION WITHOUT LOSING CONTROL",title:"Not every application works the same way.",accent:"Landeo tells you upfront.",
      text:"Every role shows how the application can be handled. No vague buttons, no silent submissions and no pretending every careers site works the same.",
      promise:"Your rules always come first",promiseText:"Nothing moves outside the preferences and information you have approved.",
      items:[
        {title:"Automatic",label:"Landeo handles it",text:"When a role is compatible, Landeo prepares and submits the application using information you have already approved.",className:"automatic"},
        {title:"Assisted",label:"You complete what matters",text:"If an answer or decision is missing, we show it clearly and wait for you before continuing.",className:"assisted"},
        {title:"External",label:"Never lose the thread",text:"If the employer requires an external step, we take you to the right place and keep tracking the application.",className:"external"},
      ],
    },
    profile:{
      kicker:"YOUR UNIVERSAL PROFILE",title:"Tell it once.",accent:"Landeo puts it to work.",
      text:"Your experience, education, availability and preferences live in one place. Review, edit or delete your information whenever you want.",
      benefits:["Reusable for every application","Editable at any time","Visible before anything is sent"],
      aria:"Example universal profile",name:"Your professional profile",status:"Ready to get started",
      fields:[["Experience","3 roles added"],["Preferences","London · Hybrid · Product"],["Common answers","Availability and conditions"]],
    },
    faq:{
      kicker:"NO FINE PRINT",title:"Before your first",accent:"yes.",
      items:[
        ["Does Landeo apply without me knowing?","No. You choose the roles that interest you and define your preferences. If an application needs an answer or review, Landeo stops and tells you."],
        ["Can every application be automated?","No. It depends on the careers site and the information the employer requests. That is why we label each process as automatic, assisted or external."],
        ["Can I use Landeo for free?","Yes. You can create your profile and explore roles for free. Application plans and limits are explained clearly on the pricing page."],
        ["Can I change or delete my information?","Yes. Your profile is editable and you can manage your information from your account. You remain in control of the data we use."],
      ],
    },
    final:{kicker:"YOUR NEXT OPPORTUNITY DOES NOT NEED ANOTHER FORM",title:"Make room for interviews.",accent:"Landeo handles the road there.",cta:"Start free",note:"Creating your profile is free · You decide when to move forward"},
    footer:{tagline:"Job hunting, without repeating your story.",privacy:"Privacy",terms:"Terms",affiliate:"Affiliates",support:"Help"},
    language:"Change language",
  },
} as const;

const companyLogos=[
  {name:"Tesla",src:"/company-logos/tesla.png"},
  {name:"SpaceX",src:"/company-logos/spacex.png"},
  {name:"Google",src:"/company-logos/google.webp"},
  {name:"Apple",src:"/company-logos/apple.svg"},
  {name:"Notion",src:"/company-logos/notion.webp"},
  {name:"HubSpot",src:"/company-logos/hubspot.png"},
  {name:"McKinsey & Company",src:"/company-logos/mckinsey.png"},
  {name:"Spotify",src:"/company-logos/spotify.png"},
  {name:"OpenAI",src:"/company-logos/openai.png"},
  {name:"Anthropic",src:"/company-logos/anthropic.webp"},
] as const;

export default function LandingPage({initialLocale}:{initialLocale:LandingLocale}){
  const [locale,setLocale]=useState<LandingLocale>(initialLocale);
  const t=copy[locale];

  useEffect(()=>{
    const saved=window.localStorage.getItem("landeo-locale");
    if(saved==="es"||saved==="en") queueMicrotask(()=>setLocale(saved));
  },[]);

  useEffect(()=>{
    document.documentElement.lang=locale;
  },[locale]);

  function changeLocale(next:LandingLocale){
    setLocale(next);
    window.localStorage.setItem("landeo-locale",next);
  }

  return (
    <main className="landing-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Landeo">
          <span className="brand-mark">L</span><span>Landeo</span>
        </Link>
        <nav aria-label={t.nav.label}>
          <a href="#how-it-works">{t.nav.how}</a>
          <Link href="/pricing">{t.nav.pricing}</Link>
          <Link href="/login">{t.nav.login}</Link>
          <div className="language-switcher" role="group" aria-label={t.language}>
            <span aria-hidden="true">◎</span>
            <button type="button" className={locale==="es"?"active":""} aria-pressed={locale==="es"} onClick={()=>changeLocale("es")}>ES</button>
            <i />
            <button type="button" className={locale==="en"?"active":""} aria-pressed={locale==="en"} onClick={()=>changeLocale("en")}>EN</button>
          </div>
          <Link className="nav-cta" href="/signup">{t.nav.start}</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> {t.hero.eyebrow}</span>
          <h1>{t.hero.title} <em>{t.hero.accent}</em></h1>
          <p className="hero-lead">{t.hero.lead}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/signup">{t.hero.primary} <span>→</span></Link>
            <a className="button button-ghost" href="#how-it-works">{t.hero.secondary} <span>↓</span></a>
          </div>
          <div className="trust-row">
            {t.hero.trust.map(item=><span key={item}>✓ {item}</span>)}
          </div>
        </div>

        <div className="hero-product-wrap">
          <span className="floating-note note-top">{t.product.found} <b>94%</b></span>
          <div className="product-preview" aria-label={t.product.aria}>
            <div className="preview-top">
              <div><span className="preview-label">{t.product.discover}</span><strong>{t.product.one}</strong></div>
              <span className="match-chip">{t.product.match}</span>
            </div>
            <article className="job-card">
              <div className="job-company"><span className="company-logo">N</span><div><strong>Northstar</strong><span>{t.product.companyMeta}</span></div><button aria-label={t.product.save}>♡</button></div>
              <span className="sample-label">{t.product.sample}</span>
              <h2>Product Designer</h2>
              <p>{t.product.description}</p>
              <div className="tags">{t.product.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
              <div className="apply-mode"><b>✓</b><span><strong>{t.product.ready}</strong><small>{t.product.readyText}</small></span></div>
            </article>
            <div className="card-actions"><button className="pass" aria-label={t.product.pass}>×</button><button className="save" aria-label={t.product.save}>♡</button><button className="apply" aria-label={t.product.apply}>{t.product.apply} <span>→</span></button></div>
            <p className="preview-hint">{t.product.hint}</p>
          </div>
          <span className="floating-note note-bottom"><i>✓</i> {t.product.reused}</span>
        </div>
      </section>

      <section className="dashboard-showcase">
        <div className="dashboard-showcase-copy">
          <span className="section-kicker">{t.dashboard.kicker}</span>
          <h2>{t.dashboard.title} <em>{t.dashboard.accent}</em></h2>
          <p>{t.dashboard.text}</p>
        </div>
        <div className="dashboard-stage">
          <div className="landing-dashboard" aria-label={t.dashboard.aria}>
            <aside className="landing-dashboard-sidebar">
              <Link className="landing-dashboard-brand" href="/"><span>L</span><strong>Landeo</strong></Link>
              <nav>
                {t.dashboard.nav.map((item,index)=><span className={index===1?"active":""} key={item}><i>{["⌕","☷","▢"][index]}</i>{item}</span>)}
              </nav>
              <div><span><i>⚙</i>{t.dashboard.settings}</span><span><i>?</i>{t.dashboard.help}</span></div>
            </aside>
            <div className="landing-dashboard-main">
              <header><div><small>{t.dashboard.example}</small><h3>{t.dashboard.heading}</h3></div><span>AM</span></header>
              <div className="landing-dashboard-columns">
                {t.dashboard.columns.map((column,columnIndex)=><section key={column.title}>
                  <div className="landing-dashboard-column-title"><strong>{column.title}</strong><span>{column.count}</span></div>
                  {column.jobs.map(job=><article key={job.role}>
                    <div className="landing-dashboard-job-head"><span><img src={job.logo} alt="" /></span><div><strong>{job.role}</strong><small>{job.company}</small></div></div>
                    <p>⌖ {job.location}</p>
                    <p>↗ {job.activity}</p>
                    <footer><span>{job.status}</span><b>{columnIndex===0?"✓":columnIndex===1?"◎":"★"}</b></footer>
                  </article>)}
                </section>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="company-proof" aria-labelledby="company-proof-title">
        <div className="company-proof-heading">
          <h2 id="company-proof-title">{t.social.title}</h2>
          <p>{t.social.subtitle}</p>
        </div>
        <div className="company-logo-grid">
          {companyLogos.map(company=><div key={company.name}><img src={company.src} alt={company.name} loading="lazy" /></div>)}
        </div>
        <small>{t.social.note}</small>
      </section>

      <section className="outcome-strip">
        {t.outcomes.map((item,index)=><span className="outcome-item" key={item}><p>{item}</p>{index<t.outcomes.length-1&&<i />}</span>)}
      </section>

      <section className="pain-section section-shell">
        <div className="section-heading">
          <span className="section-kicker">{t.pain.kicker}</span>
          <h2>{t.pain.title} <em>{t.pain.accent}</em></h2>
        </div>
        <div className="pain-grid">
          <div className="pain-copy">
            <p>{t.pain.text}</p>
            <Link className="text-link" href="/signup">{t.pain.cta} <span>→</span></Link>
          </div>
          <div className="pain-list">
            {t.pain.items.map((pain,index)=><div key={pain}><b>{String(index+1).padStart(2,"0")}</b><span>{pain}</span><i>×</i></div>)}
          </div>
        </div>
      </section>

      <section className="steps-section" id="how-it-works">
        <div className="section-shell">
          <div className="section-heading light">
            <span className="section-kicker">{t.steps.kicker}</span>
            <h2>{t.steps.title} <em>{t.steps.accent}</em></h2>
          </div>
          <div className="steps-grid">
            {t.steps.items.map((item,index)=><article key={item[0]}><span>0{index+1}</span><div className="step-icon">{["◎","↕","✓"][index]}</div><h3>{item[0]}</h3><p>{item[1]}</p></article>)}
          </div>
        </div>
      </section>

      <section className="control-section section-shell">
        <div className="control-copy">
          <span className="section-kicker">{t.control.kicker}</span>
          <h2>{t.control.title} <em>{t.control.accent}</em></h2>
          <p>{t.control.text}</p>
          <div className="control-promise"><b>{t.control.promise}</b><span>{t.control.promiseText}</span></div>
        </div>
        <div className="capability-list">
          {t.control.items.map((item,index)=>(
            <article className={item.className} key={item.title}>
              <b>0{index+1}</b><div><span>{item.label}</span><h3>{item.title}</h3><p>{item.text}</p></div><i>→</i>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-card">
          <div className="profile-copy">
            <span className="section-kicker">{t.profile.kicker}</span>
            <h2>{t.profile.title} <em>{t.profile.accent}</em></h2>
            <p>{t.profile.text}</p>
            <ul>{t.profile.benefits.map(item=><li key={item}><i>✓</i> {item}</li>)}</ul>
          </div>
          <div className="profile-preview" aria-label={t.profile.aria}>
            <div className="profile-preview-head"><span>AM</span><div><strong>{t.profile.name}</strong><small>{t.profile.status}</small></div><b>86%</b></div>
            <div className="profile-progress-bar"><i /></div>
            {t.profile.fields.map(item=><div className="profile-fields" key={item[0]}><span><b>{item[0]}</b><small>{item[1]}</small></span><i>✓</i></div>)}
          </div>
        </div>
      </section>

      <section className="faq-section section-shell">
        <div className="section-heading compact"><span className="section-kicker">{t.faq.kicker}</span><h2>{t.faq.title} <em>{t.faq.accent}</em></h2></div>
        <div className="faq-list">
          {t.faq.items.map(item=><details key={`${locale}-${item[0]}`}><summary>{item[0]}<span>+</span></summary><p>{item[1]}</p></details>)}
        </div>
      </section>

      <section className="final-cta">
        <span className="section-kicker">{t.final.kicker}</span>
        <h2>{t.final.title}<br /><em>{t.final.accent}</em></h2>
        <Link className="button button-lime" href="/signup">{t.final.cta} <span>→</span></Link>
        <small>{t.final.note}</small>
      </section>

      <footer className="site-footer">
        <div><Link className="brand" href="/"><span className="brand-mark">L</span><span>Landeo</span></Link><p>{t.footer.tagline}</p></div>
        <nav aria-label={t.nav.label}><Link href="/pricing">{t.nav.pricing}</Link><Link href="/support">{t.footer.support}</Link><Link href="/affiliate-program">{t.footer.affiliate}</Link><Link href="/privacy">{t.footer.privacy}</Link><Link href="/terms">{t.footer.terms}</Link><Link href="/login">{t.nav.login}</Link></nav>
        <small>© 2026 Landeo</small>
      </footer>
    </main>
  );
}
