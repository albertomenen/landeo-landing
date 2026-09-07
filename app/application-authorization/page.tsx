import type { Metadata } from "next";
import { headers } from "next/headers";
import LegalPage from "../../components/LegalPage";
import { detectLandingLocale, type LandingLocale } from "../../lib/locale";

type Props = { searchParams: Promise<{ lang?: string }> };

async function getLocale(searchParams: Props["searchParams"]): Promise<LandingLocale> {
  const { lang } = await searchParams;
  return lang === "en" || lang === "es" ? lang : detectLandingLocale(await headers());
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = await getLocale(searchParams);
  return {
    title: locale === "es" ? "Autorización de candidaturas de Landeo" : "Landeo Application Authorization",
    description: locale === "es" ? "Qué autorizas al postularte con Landeo." : "What you authorize when you apply with Landeo.",
  };
}

export default async function Authorization({ searchParams }: Props) {
  return <LegalPage kind="authorization" locale={await getLocale(searchParams)} />;
}
