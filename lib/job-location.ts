import type { Job } from "./fixtures";

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

function locationRelevance(job: Job, city: string, country: string) {
  const place = normalizeLocation(job.location);
  const cityName = normalizeLocation(city.split(",")[0] ?? "");
  const candidateCountry = countryCode(country, city);
  const jobCountry = String(job.market ?? "").toUpperCase();
  if (!cityName) return 0;
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
  const remoteScope = place
    .replace(/\b(remote|remoto)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (
    !remoteScope ||
    /\b(global|worldwide|anywhere)\b/.test(remoteScope)
  )
    return 2;
  if (/\b(latam|latin america|latinamerica|latinoamerica|america latina)\b/.test(remoteScope) && ["MX", "AR", "CO", "PE", "BR"].includes(candidateCountry)) return 2;
  if (/\b(europe|europa|emea)\b/.test(remoteScope) && ["ES", "PT", "GB", "FR", "DE", "IT", "NL", "AT", "BE", "CH", "CZ", "DK", "EE", "FI", "IE", "NO", "PL", "SE", "RO"].includes(candidateCountry)) return 2;
  return null;
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
  return (
    job.workMode === "remote" ||
    String(job.market ?? "").toUpperCase() === "REMOTE" ||
    /\b(remote|remoto)\b/.test(normalizeLocation(job.location))
  );
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
  const ranked = jobs.map((job, index) => ({
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

  // With no nearby result, remote jobs are the safe default even when their
  // source did not provide a precise geographic scope. Explicit worldwide
  // mode additionally includes the rest of the compatible catalogue.
  if (!nearby.length || includeWorldwide) ordered.push(...worldwideRemainder);
  return ordered.map((item) => item.job);
}
