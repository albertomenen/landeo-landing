import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export async function generateMetadata():Promise<Metadata>{
  const requestHeaders=await headers();
  const host=requestHeaders.get("x-forwarded-host")??requestHeaders.get("host")??"localhost:3000";
  const protocol=requestHeaders.get("x-forwarded-proto")??(host.startsWith("localhost")?"http":"https");
  const origin=new URL(`${protocol}://${host}`);
  const title="Landeo — Deja los formularios. Empieza a recibir respuestas";
  const description="Encuentra ofertas que encajan contigo y postúlate con un único perfil. Tú eliges el trabajo; Landeo quita lo repetitivo.";
  return {metadataBase:origin,title,description,openGraph:{title,description,type:"website",images:[{url:new URL("/og-landing.png",origin),width:1727,height:911,alt:"Landeo — Buscar trabajo, sin repetir tu historia"}]},twitter:{card:"summary_large_image",title,description,images:[new URL("/og-landing.png",origin)]}};
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={geist.variable}>{children}</body></html>;
}
