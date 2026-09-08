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
  IN: ["india", "in"],
  NZ: ["new zealand", "nz"],
  PL: ["poland", "polonia", "polska", "pl"],
  SG: ["singapore", "singapur", "sg"],
  ZA: ["south africa", "sudafrica", "za"],
};

function countryCode(country: string, location: string) {
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

function locationRelevance(job: Job, city: string, country: string) {
  const place = normalizeLocation(job.location);
  const cityName = normalizeLocation(city.split(",")[0] ?? "");
  const candidateCountry = countryCode(country, city);
  const jobCountry = String(job.market ?? "").toUpperCase();
  if (!cityName) return 0;
  if (place.includes(cityName)) return 0;
  const aliases =
    countryAliases[candidateCountry] ??
    [normalizeLocation(country)].filter(Boolean);
  const countryMatch =
    jobCountry === candidateCountry ||
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
    /\b(global|worldwide|anywhere|europe|europa|emea)\b/.test(remoteScope)
  )
    return 2;
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
