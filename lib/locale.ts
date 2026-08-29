export type LandingLocale="es"|"en";

const spanishSpeakingCountries=new Set([
  "AR","BO","CL","CO","CR","CU","DO","EC","SV","GQ","GT","HN","MX","NI","PA","PY","PE","PR","ES","UY","VE",
]);

export function detectLandingLocale(requestHeaders:{get(name:string):string|null}):LandingLocale{
  const country=(requestHeaders.get("cf-ipcountry")??requestHeaders.get("x-vercel-ip-country")??"").toUpperCase();
  if(spanishSpeakingCountries.has(country)) return "es";
  const accepted=requestHeaders.get("accept-language")??"";
  if(/(^|,)\s*es(?:-|;|,|$)/i.test(accepted)) return "es";
  if(country||accepted) return "en";
  return "es";
}
