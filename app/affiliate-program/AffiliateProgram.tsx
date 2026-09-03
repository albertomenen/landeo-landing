"use client";

import { useEffect, useState } from "react";
import Link from "../../components/SafeLink";
import type { LandingLocale } from "../../lib/locale";

const copy = {
  es: {
    nav: { back: "Cómo funciona", pricing: "Precios", login: "Entrar", apply: "Solicitar acceso", label: "Navegación del programa de afiliados" },
    language: "Cambiar idioma",
    hero: {
      eyebrow: "PROGRAMA DE AFILIADOS DE LANDEO",
      title: "Impulsa carreras.",
      accent: "Gana por recomendar algo útil.",
      lead: "Comparte Landeo con tu enlace o código personal y recibe un 30% de comisión por cada suscripción válida que generes.",
      cta: "Quiero ser afiliado",
      note: "Para creadores, comunidades, orientadores y personas que ayudan a otros a encontrar mejores oportunidades.",
      cardLabel: "TU PANEL DE AFILIADO",
      code: "TU-CÓDIGO",
      clicks: "Clics este mes",
      conversions: "Nuevos usuarios Pro",
      commission: "Comisión estimada",
    },
    highlights: [["30%", "de comisión"], ["Mensuales", "pagos agrupados"], ["En tiempo real", "seguimiento de resultados"], ["Listo para compartir", "enlace, código y materiales"]],
    how: {
      kicker: "SENCILLO DESDE EL PRIMER DÍA",
      title: "Tú compartes Landeo.",
      accent: "Nosotros medimos el resultado.",
      lead: "Un programa pensado para integrarse en el contenido y las conversaciones que ya tienes con tu audiencia.",
      steps: [
        ["Solicita acceso", "Cuéntanos dónde compartes contenido o cómo ayudas a personas que buscan trabajo. Revisamos cada solicitud para proteger a la comunidad."],
        ["Comparte tu enlace", "Si te aprobamos, recibirás un enlace y un código propios, además de mensajes y materiales que puedes adaptar a tu voz."],
        ["Recibe tu comisión", "Atribuimos las suscripciones válidas a tu cuenta y agrupamos los pagos mensualmente según las condiciones del programa."],
      ],
    },
    audience: {
      kicker: "HECHO PARA QUIENES YA GENERAN CONFIANZA",
      title: "Tu audiencia busca avanzar.",
      accent: "Landeo le da una forma de hacerlo.",
      items: [
        ["Creadores", "Contenido sobre empleo, productividad, tecnología, dinero o desarrollo profesional."],
        ["Comunidades", "Newsletters, asociaciones, grupos profesionales, bootcamps y organizaciones estudiantiles."],
        ["Orientadores", "Coaches, recruiters y profesionales que ayudan a otras personas a mejorar su búsqueda."],
      ],
    },
    reasons: {
      kicker: "UNA RECOMENDACIÓN FÁCIL DE EXPLICAR",
      title: "Valor para tu audiencia.",
      accent: "Una recompensa clara para ti.",
      items: [
        ["Un problema real", "Landeo reduce formularios repetitivos y mantiene cada candidatura organizada."],
        ["Atribución transparente", "Tu panel muestra clics, conversiones válidas y comisiones acumuladas."],
        ["Sin mensajes engañosos", "Te damos materiales claros y tú mantienes tu estilo y la confianza de tu audiencia."],
        ["Apoyo directo", "Tendrás un canal para resolver dudas sobre campañas, contenido y atribución."],
      ],
    },
    faq: {
      kicker: "ANTES DE SOLICITAR ACCESO",
      title: "Preguntas",
      accent: "frecuentes.",
      items: [
        ["¿Quién puede solicitar acceso?", "Creadores, comunidades, orientadores profesionales, newsletters, asociaciones y cualquier persona con una audiencia relevante pueden solicitarlo."],
        ["¿Qué es una suscripción válida?", "Una compra atribuida a tu enlace o código que haya sido cobrada y no haya sido reembolsada, anulada o identificada como fraude o autorreferencia."],
        ["¿Cuándo se realizan los pagos?", "Las comisiones aprobadas se agrupan mensualmente. El calendario, el umbral mínimo y el método de pago se confirman al aprobar tu solicitud."],
        ["¿Puedo promocionar Landeo de cualquier forma?", "No se permite spam, información falsa, autorreferencias ni publicidad que suplante a Landeo. Las condiciones completas se entregan antes de comenzar."],
      ],
    },
    final: {
      kicker: "CRECE CON LANDEO",
      title: "Ayuda a alguien a encontrar su próximo trabajo.",
      accent: "Haz crecer también tu proyecto.",
      cta: "Solicitar acceso",
      note: "Las solicitudes se revisan individualmente · Sin coste para participar",
    },
    footer: { tagline: "Buscar trabajo, sin repetir tu historia.", privacy: "Privacidad", terms: "Términos", affiliate: "Afiliados", legal: "El 30% se calcula sobre los ingresos netos de suscripciones válidas. Sujeto a aprobación y a las condiciones del programa." },
  },
  en: {
    nav: { back: "How it works", pricing: "Pricing", login: "Log in", apply: "Apply to join", label: "Affiliate program navigation" },
    language: "Change language",
    hero: {
      eyebrow: "LANDEO AFFILIATE PROGRAM",
      title: "Move careers forward.",
      accent: "Earn by sharing something useful.",
      lead: "Share Landeo with your personal link or code and earn 30% commission on every eligible paid subscription you generate.",
      cta: "Become an affiliate",
      note: "For creators, communities, career advisors and people who help others find better opportunities.",
      cardLabel: "YOUR AFFILIATE DASHBOARD",
      code: "YOUR-CODE",
      clicks: "Clicks this month",
      conversions: "New Pro members",
      commission: "Estimated commission",
    },
    highlights: [["30%", "commission"], ["Monthly", "batched payouts"], ["Real time", "performance tracking"], ["Ready to share", "link, code and creative"]],
    how: {
      kicker: "SIMPLE FROM DAY ONE",
      title: "You share Landeo.",
      accent: "We track the outcome.",
      lead: "A program designed to fit naturally into the content and conversations you already have with your audience.",
      steps: [
        ["Apply to join", "Tell us where you publish or how you support job seekers. We review every application to protect the community."],
        ["Share your link", "Once approved, you receive a personal link and code, plus messages and creative you can adapt to your own voice."],
        ["Earn commission", "Eligible subscriptions are attributed to your account and approved commissions are grouped into monthly payouts."],
      ],
    },
    audience: {
      kicker: "BUILT FOR PEOPLE WHO ALREADY EARN TRUST",
      title: "Your audience wants to move forward.",
      accent: "Landeo gives them a way.",
      items: [
        ["Creators", "Content about careers, productivity, technology, money or professional development."],
        ["Communities", "Newsletters, associations, professional groups, bootcamps and student organizations."],
        ["Career advisors", "Coaches, recruiters and professionals who help other people improve their job search."],
      ],
    },
    reasons: {
      kicker: "AN EASY RECOMMENDATION TO EXPLAIN",
      title: "Value for your audience.",
      accent: "A clear reward for you.",
      items: [
        ["A real problem", "Landeo cuts repetitive forms and keeps every application organized."],
        ["Transparent attribution", "Your dashboard shows clicks, eligible conversions and accumulated commission."],
        ["No misleading claims", "We provide clear materials while you keep your own voice and your audience's trust."],
        ["Direct support", "You have a channel for questions about campaigns, content and attribution."],
      ],
    },
    faq: {
      kicker: "BEFORE YOU APPLY",
      title: "Frequently asked",
      accent: "questions.",
      items: [
        ["Who can apply?", "Creators, communities, career advisors, newsletters, associations and anyone with a relevant audience are welcome to apply."],
        ["What is an eligible subscription?", "A purchase attributed to your link or code that has been paid and has not been refunded, reversed or identified as fraud or a self-referral."],
        ["When are commissions paid?", "Approved commissions are grouped monthly. The schedule, minimum threshold and payment method are confirmed when your application is approved."],
        ["Can I promote Landeo in any way?", "Spam, misleading claims, self-referrals and ads that impersonate Landeo are not allowed. Full program terms are provided before you begin."],
      ],
    },
    final: {
      kicker: "GROW WITH LANDEO",
      title: "Help someone find their next job.",
      accent: "Grow your own project too.",
      cta: "Apply to join",
      note: "Applications are reviewed individually · Free to participate",
    },
    footer: { tagline: "Job hunting, without repeating your story.", privacy: "Privacy", terms: "Terms", affiliate: "Affiliates", legal: "30% is calculated on eligible net subscription revenue. Approval and program terms apply." },
  },
} as const;

const applicationEmail = "mailto:alberto@haired.app?subject=Landeo%20Affiliate%20Program";

export default function AffiliateProgram({ initialLocale }: { initialLocale: LandingLocale }) {
  const [locale, setLocale] = useState<LandingLocale>(initialLocale);
  const text = copy[locale];

  useEffect(() => {
    const saved = window.localStorage.getItem("landeo-locale");
    if (saved === "es" || saved === "en") queueMicrotask(() => setLocale(saved));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function changeLocale(next: LandingLocale) {
    setLocale(next);
    window.localStorage.setItem("landeo-locale", next);
  }

  return (
    <main className="affiliate-page">
      <header className="affiliate-header">
        <Link className="brand" href="/" aria-label="Landeo"><span className="brand-mark">L</span><span>Landeo</span></Link>
        <nav aria-label={text.nav.label}>
          <Link href="/">{text.nav.back}</Link>
          <Link href="/pricing">{text.nav.pricing}</Link>
          <Link href="/login">{text.nav.login}</Link>
          <div className="language-switcher" role="group" aria-label={text.language}>
            <span aria-hidden="true">◎</span>
            <button type="button" className={locale === "es" ? "active" : ""} aria-pressed={locale === "es"} onClick={() => changeLocale("es")}>ES</button>
            <i />
            <button type="button" className={locale === "en" ? "active" : ""} aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</button>
          </div>
          <a className="affiliate-nav-cta" href={applicationEmail}>{text.nav.apply}</a>
        </nav>
      </header>

      <section className="affiliate-hero">
        <div className="affiliate-hero-copy">
          <span className="affiliate-kicker">{text.hero.eyebrow}</span>
          <h1>{text.hero.title}<br /><em>{text.hero.accent}</em></h1>
          <p>{text.hero.lead}</p>
          <a className="button affiliate-primary" href={applicationEmail}>{text.hero.cta}<span>→</span></a>
          <small>{text.hero.note}</small>
        </div>
        <div className="affiliate-dashboard" aria-label={text.hero.cardLabel}>
          <div className="affiliate-dashboard-top"><span>{text.hero.cardLabel}</span><i>● LIVE</i></div>
          <div className="affiliate-code"><span>getlandeo.com/</span><strong>{text.hero.code}</strong><i aria-hidden="true">↗</i></div>
          <div className="affiliate-metrics">
            <div><small>{text.hero.clicks}</small><b>1,248</b><span>↑ 18%</span></div>
            <div><small>{text.hero.conversions}</small><b>42</b><span>↑ 11%</span></div>
          </div>
          <div className="affiliate-earnings"><span><small>{text.hero.commission}</small><b>€125.87</b></span><i><b>30%</b><small>COMMISSION</small></i></div>
        </div>
      </section>

      <section className="affiliate-highlights">
        {text.highlights.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <section className="affiliate-section affiliate-how">
        <div className="affiliate-heading"><span className="affiliate-kicker">{text.how.kicker}</span><h2>{text.how.title}<br /><em>{text.how.accent}</em></h2><p>{text.how.lead}</p></div>
        <div className="affiliate-steps">
          {text.how.steps.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><i>{index === 0 ? "✦" : index === 1 ? "↗" : "€"}</i><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>

      <section className="affiliate-audience">
        <div className="affiliate-section">
          <div className="affiliate-heading light"><span className="affiliate-kicker">{text.audience.kicker}</span><h2>{text.audience.title}<br /><em>{text.audience.accent}</em></h2></div>
          <div className="affiliate-audience-grid">
            {text.audience.items.map(([title, body], index) => <article key={title}><i>{["◎", "⌁", "↗"][index]}</i><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="affiliate-section affiliate-reasons">
        <div className="affiliate-heading"><span className="affiliate-kicker">{text.reasons.kicker}</span><h2>{text.reasons.title}<br /><em>{text.reasons.accent}</em></h2></div>
        <div className="affiliate-reason-list">
          {text.reasons.items.map(([title, body], index) => <article key={title}><b>0{index + 1}</b><div><h3>{title}</h3><p>{body}</p></div><span>✓</span></article>)}
        </div>
      </section>

      <section className="affiliate-section affiliate-faq">
        <div className="affiliate-heading"><span className="affiliate-kicker">{text.faq.kicker}</span><h2>{text.faq.title}<br /><em>{text.faq.accent}</em></h2></div>
        <div className="affiliate-faq-list">
          {text.faq.items.map(([question, answer]) => <details key={`${locale}-${question}`}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
        </div>
      </section>

      <section className="affiliate-final">
        <span className="affiliate-kicker">{text.final.kicker}</span>
        <h2>{text.final.title}<br /><em>{text.final.accent}</em></h2>
        <a className="button affiliate-final-cta" href={applicationEmail}>{text.final.cta}<span>→</span></a>
        <small>{text.final.note}</small>
      </section>

      <footer className="affiliate-footer">
        <div><Link className="brand" href="/"><span className="brand-mark">L</span><span>Landeo</span></Link><p>{text.footer.tagline}</p></div>
        <nav aria-label={text.nav.label}><Link href="/pricing">{text.nav.pricing}</Link><Link href="/affiliate-program">{text.footer.affiliate}</Link><Link href="/privacy">{text.footer.privacy}</Link><Link href="/terms">{text.footer.terms}</Link></nav>
        <small>© 2026 Landeo · {text.footer.legal}</small>
      </footer>
    </main>
  );
}
