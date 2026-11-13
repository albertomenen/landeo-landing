import {SITE_ORIGIN} from "../../lib/seo-content";

// Public content is open to search engines and AI crawlers; private product areas are not.
export function GET(){
  const body=`User-agent: *
Allow: /
Disallow: /app/
Disallow: /api/
Disallow: /auth/
Disallow: /onboarding
Disallow: /login
Disallow: /signup
Disallow: /qa-
Disallow: /__qa
Disallow: /_qa-cover
Disallow: /_sites-preview

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
  return new Response(body,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
