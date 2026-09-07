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
  const title = locale === "es" ? "Política de privacidad de Landeo" : "Landeo Privacy Policy";
  const description = locale === "es" ? "Cómo Landeo trata, protege y elimina tus datos." : "How Landeo uses, protects and deletes your data.";
  return { title, description };
}

export default async function Privacy({ searchParams }: Props) {
  return <LegalPage kind="privacy" locale={await getLocale(searchParams)} />;
}
