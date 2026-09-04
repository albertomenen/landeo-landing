import type {Metadata} from "next";
import {headers} from "next/headers";
import {detectLandingLocale} from "../../lib/locale";
import SupportPage from "./SupportPage";

export async function generateMetadata():Promise<Metadata>{
  const locale=detectLandingLocale(await headers());
  const title=locale==="es"?"Centro de ayuda de Landeo":"Landeo Help Centre";
  const description=locale==="es"?"Ayuda con tu cuenta, suscripción, candidaturas y privacidad en Landeo.":"Help with your Landeo account, subscription, applications and privacy.";
  return {title,description,openGraph:{title,description,images:[]},twitter:{title,description,images:[]}};
}

export default async function Support(){
  const locale=detectLandingLocale(await headers());
  return <SupportPage initialLocale={locale}/>;
}
