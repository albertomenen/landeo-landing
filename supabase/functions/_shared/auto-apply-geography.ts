const normalized=(value:unknown)=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const aliases:Record<string,string[]>={
  US:["united states","united states of america","usa","us","estados unidos"],
  IN:["india","in"],GB:["united kingdom","uk","gb","reino unido"],
  ES:["spain","espana","es"],MX:["mexico","mx"],CO:["colombia","co"],
  CA:["canada","ca"],DE:["germany","alemania","de"],FR:["france","francia","fr"],
  PT:["portugal","pt"],BR:["brazil","brasil","br"],AR:["argentina","ar"],
};

/** Apply declared residence restrictions even when the job is remote. */
export function autoApplyGeographyCompatible(
  job:{metadata?:Record<string,unknown>|null},
  profile:{location?:unknown;universal_profile?:unknown},
){
  const declared=job.metadata?.auto_apply_allowed_countries;
  if(!Array.isArray(declared)||declared.length===0)return true;
  const allowed=declared.filter((value):value is string=>typeof value==="string").map(value=>value.toUpperCase());
  const universal=profile.universal_profile&&typeof profile.universal_profile==="object"?profile.universal_profile as Record<string,unknown>:{};
  const country=normalized(universal.country);
  const explicit=Object.entries(aliases).find(([,names])=>names.includes(country))?.[0]||(country.length===2?country.toUpperCase():"");
  if(explicit)return allowed.includes(explicit);
  const location=` ${normalized(profile.location)} `;
  const inferred=Object.entries(aliases).find(([,names])=>names.some(name=>name.length>2&&location.includes(` ${name} `)))?.[0];
  return Boolean(inferred&&allowed.includes(inferred));
}
