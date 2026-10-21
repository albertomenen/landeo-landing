import type {Metadata} from "next";
import {headers} from "next/headers";
import LegalPage from "../../../components/LegalPage";
import {detectLandingLocale} from "../../../lib/locale";
export const metadata:Metadata={title:"Landeo · Pagos, cancelaciones y reembolsos / Payments and refunds"};
export default async function Refunds({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const {lang}=await searchParams;
  const locale=lang==="en"||lang==="es"?lang:detectLandingLocale(await headers());
  return <LegalPage kind="refunds" locale={locale}/>;
}
