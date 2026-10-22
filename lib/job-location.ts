import type { Job } from "./fixtures";
type LocationJob=Pick<Job,"location"|"market"|"workMode"|"metadata">;

function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const countryAliases: Record<string, string[]> = {
  ES: ["espana", "spain", "es"],
  PT: ["portugal", "pt"],
  US: ["united states", "usa", "us"],
  GB: ["united kingdom", "uk", "gb", "england"],
  FR: ["france", "francia", "fr"],
  DE: ["germany", "alemania", "de"],
  IT: ["italy", "italia", "it"],
  NL: ["netherlands", "paises bajos", "nl"],
  MX: ["mexico", "mx"],
  AR: ["argentina", "ar"],
  CO: ["colombia", "co"],
  PE: ["peru", "pe"],
  BR: ["brazil", "brasil", "br"],
  CA: ["canada", "ca"],
  AU: ["australia", "au"],
  AT: ["austria", "osterreich", "at"],
  BE: ["belgium", "belgica", "belgie", "be"],
  CH: ["switzerland", "suiza", "schweiz", "ch"],
  CZ: ["czech republic", "czechia", "chequia", "cz"],
  DK: ["denmark", "dinamarca", "dk"],
  EE: ["estonia", "ee"],
  FI: ["finland", "finlandia", "fi"],
  HK: ["hong kong", "hk"],
  IE: ["ireland", "irlanda", "ie"],
  IN: ["india", "in"],
  JP: ["japan", "japon", "jp"],
  KR: ["south korea", "korea", "corea del sur", "kr"],
  NO: ["norway", "noruega", "no"],
  NZ: ["new zealand", "nz"],
  PL: ["poland", "polonia", "polska", "pl"],
  SE: ["sweden", "suecia", "se"],
  RO: ["romania", "rumania", "ro"],
  TW: ["taiwan", "tw"],
  AE: ["united arab emirates", "uae", "emiratos arabes unidos", "ae"],
  SG: ["singapore", "singapur", "sg"],
  ZA: ["south africa", "sudafrica", "za"],
  CL: ["chile", "cl"], EC: ["ecuador", "ec"], UY: ["uruguay", "uy"],
  CR: ["costa rica", "cr"], PA: ["panama", "pa"],
};

function countryCode(country: string, location: string) {
  const explicit = normalizeLocation(country);
  for (const [code, aliases] of Object.entries(countryAliases)) {
    if (aliases.includes(explicit)) return code;
  }
  if (/\b(cdmx|ciudad de mexico|mexico city)\b/.test(normalizeLocation(location))) return "MX";
  const haystack = ` ${normalizeLocation(country)} ${normalizeLocation(location)} `;
  for (const [code, aliases] of Object.entries(countryAliases)) {
    if (
      aliases.some((alias) =>
        alias.length > 2
          ? haystack.includes(` ${alias} `)
          : haystack.endsWith(` ${alias} `),
      )
    )
      return code;
  }
  return "";
}

export function resolveCountryCode(country: string, location: string) {
  return countryCode(country, location);
}

// Shared by the database query and the final location filter.
export function citySearchTerms(city: string) {
  if (/\b(cdmx|ciudad de mexico|mexico city)\b/.test(normalizeLocation(city))) {
    return ["Ciudad de México", "Ciudad de Mexico", "Mexico City", "CDMX"];
  }
  return [...new Set([city.split(",")[0].trim(), normalizeLocation(city.split(",")[0])])].filter(Boolean);
}

export function cityLocationFilter(city: string) {
  return citySearchTerms(city).map(term => term.replace(/[%_(),.*]/g, " ").trim()).filter(Boolean).map(term => `location.ilike.%${term}%`).join(",");
}

export function remoteLocationEligibility(job:LocationJob,city:string,country:string):boolean|null{
  if(job.workMode!=="remote")return false;
  const candidate=countryCode(country,city),place=normalizeLocation(job.location);
  const explicit=job.metadata?.auto_apply_allowed_countries;
  const listed=job.metadata?.listed_countries;
  const declared=Array.isArray(explicit)&&explicit.length?explicit:Array.isArray(listed)&&listed.length?listed:[];
  if(declared.length)return Boolean(candidate&&declared.some(code=>String(code).toUpperCase()===candidate));
  if(/\b(worldwide|global|anywhere)\b/.test(place)||job.metadata?.remote_scope==="worldwide")return true;
  const regions:Array<[RegExp,string[]]>=[
    [/\b(latam|latin america|latinamerica|latinoamerica|america latina)\b/,["MX","AR","CO","PE","BR","CL","EC","UY","CR","PA"]],
    [/\b(europe|europa|european|eu|eea|emea)\b/,["ES","PT","GB","FR","DE","IT","NL","AT","BE","CH","CZ","DK","EE","FI","IE","NO","PL","SE","RO",...(/\bemea\b/.test(place)?["ZA","AE"]:[])]],
    [/\b(namer|north america)\b/,["US","CA","MX"]],
    [/\b(amer|americas)\b/,["US","CA","MX","AR","CO","PE","BR","CL","EC","UY","CR","PA"]],
    [/\b(apac|asia pacific)\b/,["AU","NZ","IN","JP","KR","SG","HK","TW"]],
  ];
  const regionsFound=regions.filter(([pattern])=>pattern.test(place));
  const named=Object.entries(countryAliases).filter(([,names])=>names.some(name=>name.length>2?` ${place} `.includes(` ${name} `):new RegExp(`\\b${name.toUpperCase()}\\b`).test(job.location))).map(([code])=>code);
  if(regionsFound.length)return Boolean(candidate&&(named.includes(candidate)||regionsFound.some(([,codes])=>codes.includes(candidate))));
  if(named.length)return Boolean(candidate&&named.includes(candidate));
  const market=String(job.market||"").toUpperCase();
  if(market&&market!=="REMOTE")return Boolean(candidate&&market===candidate);
  // Unknown eligibility stays visible, but is never promoted as a verified fit.
  return null;
}

export function isJobLocationCompatible(job:LocationJob,city:string,country:string){
  if(job.workMode==="remote")return remoteLocationEligibility(job,city,country)!==false;
  const candidate=countryCode(country,city),market=countryCode(job.market,job.location);
  if(candidate&&market&&candidate!==market)return false;
  return true;
}

function locationRelevance(job: LocationJob, city: string, country: string) {
  if(!isJobLocationCompatible(job,city,country))return null;
  const place = normalizeLocation(job.location);
  const cityName = normalizeLocation(city.split(",")[0] ?? "");
  const candidateCountry = countryCode(country, city);
  const jobCountry = String(job.market ?? "").toUpperCase();
  if (!cityName&&job.workMode!=="remote") return null;
  if (citySearchTerms(city).some(term => ` ${place} `.includes(` ${normalizeLocation(term)} `))) return 0;
  const aliases =
    countryAliases[candidateCountry] ??
    [normalizeLocation(country)].filter(Boolean);
  const countryMatch =
    (Boolean(candidateCountry) && jobCountry === candidateCountry) ||
    aliases.some((alias) => alias.length > 2 && place.includes(alias));
  if (job.workMode !== "remote") {
    const genericCountry =
      countryMatch &&
      aliases.some(
        (alias) =>
          place === alias ||
          place === `${alias} hybrid` ||
          place === `${alias} hibrido`,
      );
    return genericCountry ? 1 : null;
  }
  if (countryMatch) return 1;
  return 2;
}

export function prioritizeJobsByLocation(
  jobs: Job[],
  city: string,
  country: string,
) {
  return jobs
    .map((job) => ({ job, relevance: locationRelevance(job, city, country) }))
    .filter(
      (item): item is { job: Job; relevance: number } =>
        item.relevance !== null,
    )
    .sort((a, b) => a.relevance - b.relevance)
    .map((item) => item.job);
}

function isRemoteJob(job: Job) {
  return job.workMode === "remote";
}

/**
 * Keeps nearby offers first, but never leaves the feed empty just because a
 * candidate's city has no active jobs. In that case compatible remote roles
 * are promoted before country-wide and worldwide fallbacks.
 */
export function prioritizeJobsWithRemoteFallback(
  jobs: Job[],
  city: string,
  country: string,
  includeWorldwide = false,
) {
  const ranked = jobs.filter(job=>isJobLocationCompatible(job,city,country)).map((job, index) => ({
    job,
    index,
    relevance: locationRelevance(job, city, country),
  }));
  const nearby = ranked.filter((item) => item.relevance === 0);
  const compatibleRemote = ranked
    .filter((item) => item.relevance !== null && item.relevance > 0 && isRemoteJob(item.job))
    .sort((a, b) => Number(a.relevance) - Number(b.relevance) || a.index - b.index);
  const sameCountry = ranked
    .filter((item) => item.relevance === 1 && !isRemoteJob(item.job))
    .sort((a, b) => a.index - b.index);
  const selected = new Set(
    [...nearby, ...compatibleRemote, ...sameCountry].map((item) => item.job.id),
  );
  const otherRemote = ranked.filter(
    (item) => !selected.has(item.job.id) && isRemoteJob(item.job),
  );
  const remaining = ranked.filter(
    (item) => !selected.has(item.job.id) && !isRemoteJob(item.job),
  );

  const ordered = nearby.length
    ? [...nearby, ...sameCountry, ...compatibleRemote]
    : [...compatibleRemote, ...otherRemote, ...sameCountry];
  const orderedIds = new Set(ordered.map((item) => item.job.id));
  const worldwideRemainder = [...otherRemote, ...remaining].filter(
    (item) => !orderedIds.has(item.job.id),
  );

  // Expansion never bypasses an explicitly incompatible country or region.
  if (!nearby.length || includeWorldwide) ordered.push(...worldwideRemainder);
  return ordered.map((item) => item.job);
}
