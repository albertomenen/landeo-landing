import {SITE_ORIGIN,comparisons,coverLetterRoles} from "../../lib/seo-content";

export function GET(){
  const body=`# Landeo

> Landeo es una herramienta para buscar trabajo en español: encuentra ofertas que encajan contigo y prepara candidaturas (CV y carta adaptados) a partir de un único perfil. Explorar es gratis; los planes de pago dependen del número de candidaturas.

## Guías
- [Carta de presentación: cómo escribirla](${SITE_ORIGIN}/carta-de-presentacion): estructura y errores comunes
${coverLetterRoles.map(r=>`- [${r.title.replace(": ejemplo y guía","")}](${SITE_ORIGIN}/carta-de-presentacion/${r.slug}): ${r.metaDescription}`).join("\n")}

## Comparativas
${comparisons.map(c=>`- [${c.title}](${SITE_ORIGIN}/comparativas/${c.slug}): ${c.metaDescription}`).join("\n")}

## Producto
- [Precios](${SITE_ORIGIN}/pricing): Starter 14,99 €/mes (50 candidaturas), Pro 34,99 €/mes (200), Sprint 89,99 € por 3 meses (600)
- [Ayuda](${SITE_ORIGIN}/support)
`;
  return new Response(body,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
