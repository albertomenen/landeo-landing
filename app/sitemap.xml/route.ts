import {SEO_UPDATED,SITE_ORIGIN,sitemapEntries} from "../../lib/seo-content";

export function GET(){
  const urls=sitemapEntries().map(e=>`  <url><loc>${SITE_ORIGIN}${e.path==="/"?"":e.path}</loc><lastmod>${SEO_UPDATED}</lastmod><priority>${e.priority}</priority></url>`).join("\n");
  const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body,{headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
