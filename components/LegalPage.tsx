import Link from "./SafeLink";
import { Brand } from "./Brand";
import type { LandingLocale } from "../lib/locale";
import {documents,contact,type LegalKind} from "../lib/legal-documents.ts";

const navigation = {
  en: { back: "Back to home", language: "Document language", help: "Help", privacy: "Privacy", terms: "Terms", authorization: "Application authorization", email: "Email Landeo" },
  es: { back: "Volver al inicio", language: "Idioma del documento", help: "Ayuda", privacy: "Privacidad", terms: "Términos", authorization: "Autorización de candidaturas", email: "Escribir a Landeo" },
};

function languageHref(kind: LegalKind, locale: LandingLocale) {
  const path = kind === "authorization" ? "/application-authorization" : `/${kind}`;
  return `${path}?lang=${locale}`;
}

export default function LegalPage({ kind, locale }: { kind: LegalKind; locale: LandingLocale }) {
  const content = documents[locale][kind];
  const nav = navigation[locale];
  return (
    <main className="legal-page">
      <header>
        <Brand />
        <div className="legal-header-actions">
          <nav className="language-switcher" aria-label={nav.language}>
            <Link href={languageHref(kind, "es")} className={locale === "es" ? "active" : undefined} aria-current={locale === "es" ? "page" : undefined}>ES</Link>
            <i />
            <Link href={languageHref(kind, "en")} className={locale === "en" ? "active" : undefined} aria-current={locale === "en" ? "page" : undefined}>EN</Link>
          </nav>
          <Link href="/">{nav.back}</Link>
        </div>
      </header>
      <article>
        <span className="overline">LANDEO · LEGAL</span>
        <h1>{content.title}</h1>
        <p className="lead">{content.intro}</p>
        <p className="legal-updated">{kind==="terms"||kind==="privacy"?(locale==="es"?"Actualizado: 21 de octubre de 2026 · condiciones y registros de pagos web":"Updated: 21 October 2026 · web billing conditions and records"):content.updated}</p>
        <aside>{content.notice}</aside>
        {kind==="terms"&&<section><h2>{locale==="es"?"Pagos web, renovaciones y reembolsos":"Web payments, renewals and refunds"}</h2><p>{locale==="es"?"Las suscripciones web se renuevan automáticamente según el importe y periodo confirmados al pagar. La cancelación de la renovación y las solicitudes de reembolso se rigen por la política de pagos, que forma parte de estos Términos, sin limitar derechos obligatorios ni cambiar retroactivamente compras anteriores.":"Web subscriptions renew automatically for the amount and period confirmed at payment. Cancellation and refund requests are governed by the billing policy, which forms part of these Terms without restricting mandatory rights or retroactively changing earlier purchases."}</p><Link href={`/refunds?lang=${locale}`}>{locale==="es"?"Leer política de pagos, cancelaciones y reembolsos":"Read the payments, cancellation and refund policy"} →</Link></section>}
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
            {kind === "terms" && section.title.includes("Apple App Store") && <p className="legal-reference"><Link href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Apple Standard EULA ↗</Link></p>}
          </section>
        ))}
        <div className="legal-contact">
          <strong>{locale === "es" ? "¿Necesitas ayuda?" : "Need help?"}</strong>
          <p>{locale === "es" ? "Contacta con Landeo para soporte o para ejercer tus derechos." : "Contact Landeo for support or to exercise your rights."}</p>
          <Link href={`mailto:${contact}`}>{nav.email}: {contact}</Link>
        </div>
      </article>
      <footer>
        <Link href="/support">{nav.help}</Link>
        <Link href={`/privacy?lang=${locale}`}>{nav.privacy}</Link>
        <Link href={`/terms?lang=${locale}`}>{nav.terms}</Link>
        <Link href={`/refunds?lang=${locale}`}>{locale==="es"?"Pagos y reembolsos":"Payments and refunds"}</Link>
        <Link href={`/application-authorization?lang=${locale}`}>{nav.authorization}</Link>
      </footer>
    </main>
  );
}
