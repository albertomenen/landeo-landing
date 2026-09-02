import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import {detectLandingLocale} from "../lib/locale";
import GoogleAnalytics from "../components/GoogleAnalytics";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export async function generateMetadata():Promise<Metadata>{
  const requestHeaders=await headers();
  const host=requestHeaders.get("x-forwarded-host")??requestHeaders.get("host")??"localhost:3000";
  const protocol=requestHeaders.get("x-forwarded-proto")??(host.startsWith("localhost")?"http":"https");
  const origin=new URL(`${protocol}://${host}`);
  const locale=detectLandingLocale(requestHeaders);
  const title=locale==="es"?"Landeo — Deja los formularios. Empieza a recibir respuestas":"Landeo — Stop filling out forms. Start hearing back";
  const description=locale==="es"?"Encuentra ofertas que encajan contigo y postúlate con un único perfil. Tú eliges el trabajo; Landeo quita lo repetitivo.":"Find roles that fit and apply with one universal profile. You choose the opportunity; Landeo removes the repetitive work.";
  const alt=locale==="es"?"Landeo — Buscar trabajo, sin repetir tu historia":"Landeo — Job hunting, without repeating your story";
  return {metadataBase:origin,title,description,openGraph:{title,description,locale:locale==="es"?"es_ES":"en_GB",alternateLocale:locale==="es"?["en_GB"]:["es_ES"],type:"website",images:[{url:new URL("/og-bilingual.png",origin),width:1729,height:910,alt}]},twitter:{card:"summary_large_image",title,description,images:[new URL("/og-bilingual.png",origin)]}};
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale=detectLandingLocale(await headers());
  const analyticsId=process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  return <html lang={locale}><body className={geist.variable}>{children}<GoogleAnalytics measurementId={analyticsId} locale={locale}/></body></html>;
}
