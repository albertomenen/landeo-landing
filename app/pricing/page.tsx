import type {Metadata} from "next";
import {headers} from "next/headers";
import {detectLandingLocale} from "../../lib/locale";
import PricingPage from "./PricingPage";

export async function generateMetadata():Promise<Metadata>{
  const locale=detectLandingLocale(await headers());
  const title=locale==="es"?"Precios de Landeo":"Landeo pricing";
  const description=locale==="es"?"Planes sencillos de candidaturas automáticas, con todas las funciones incluidas.":"Simple application plans with every Landeo feature included.";
  return {title,description,openGraph:{title,description,images:[]},twitter:{title,description,images:[]}};
}

export default async function Pricing(){
  const locale=detectLandingLocale(await headers());
  return <PricingPage initialLocale={locale}/>;
}
