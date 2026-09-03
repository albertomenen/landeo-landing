import type { Metadata } from "next";
import { headers } from "next/headers";
import { detectLandingLocale } from "../../lib/locale";
import AffiliateProgram from "./AffiliateProgram";

export async function generateMetadata(): Promise<Metadata> {
  const locale = detectLandingLocale(await headers());
  const title = locale === "es" ? "Programa de afiliados de Landeo" : "Landeo Affiliate Program";
  const description = locale === "es"
    ? "Recomienda Landeo, ayuda a más personas a encontrar trabajo y recibe una comisión por cada suscripción válida."
    : "Share Landeo, help more people move their careers forward and earn commission on every eligible subscription.";

  return {
    title,
    description,
    openGraph: { title, description, images: [] },
    twitter: { title, description, images: [] },
  };
}

export default async function AffiliateProgramPage() {
  const locale = detectLandingLocale(await headers());
  return <AffiliateProgram initialLocale={locale} />;
}
