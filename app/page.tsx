import {headers} from "next/headers";
import LandingPage from "./LandingPage";
import {detectLandingLocale} from "../lib/locale";

export default async function Home(){
  const requestHeaders=await headers();
  return <LandingPage initialLocale={detectLandingLocale(requestHeaders)}/>;
}
