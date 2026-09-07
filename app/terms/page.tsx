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
  const title = locale === "es" ? "Términos de servicio de Landeo" : "Landeo Terms of Service";
  const description = locale === "es" ? "Condiciones de uso de Landeo y anexo de Apple App Store." : "Landeo terms of use and Apple App Store addendum.";
  return { title, description };
}

export default async function Terms({ searchParams }: Props) {
  return <LegalPage kind="terms" locale={await getLocale(searchParams)} />;
}
