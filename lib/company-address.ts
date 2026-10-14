export type CompanyOfficeAddress = {
  address: string;
  city: string | null;
  postalCode: string | null;
  country: string;
  type: "company_office" | "registered_office";
  sourceUrl: string;
  verifiedAt: string | null;
};

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeCompany = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9&]+/g, " ").trim();
const verifiedAt = "2026-10-14";
const fallbackAddresses: Record<string, CompanyOfficeAddress> = {};
const registerFallback = (names: string[], address: Omit<CompanyOfficeAddress, "verifiedAt">) => {
  for (const name of names) fallbackAddresses[normalizeCompany(name)] = { ...address, verifiedAt };
};

registerFallback(["Fever"], {address:"Calle de Fernando el Santo 16, 28010 Madrid, España",city:"Madrid",postalCode:"28010",country:"España",type:"registered_office",sourceUrl:"https://feverup.com/legal/terms_es.html"});
registerFallback(["Celonis"], {address:"Plaza de Manuel Gómez-Moreno 2, 28020 Madrid, España",city:"Madrid",postalCode:"28020",country:"España",type:"company_office",sourceUrl:"https://www.celonis.com/company/contact-us"});
registerFallback(["Cabify"], {address:"Calle Pradillo 42, 28002 Madrid, España",city:"Madrid",postalCode:"28002",country:"España",type:"registered_office",sourceUrl:"https://cabify.com/es/legal/politica-de-privacidad/pasajeros"});
registerFallback(["Aircall"], {address:"Calle José Abascal 45, 3.ª planta, 28003 Madrid, España",city:"Madrid",postalCode:"28003",country:"España",type:"company_office",sourceUrl:"https://aircall.io/contact/"});
registerFallback(["Job&Talent", "Job & Talent"], {address:"Avenida del Doctor Federico Rubio y Galí 5, Madrid, España",city:"Madrid",postalCode:null,country:"España",type:"registered_office",sourceUrl:"https://www.jobandtalent.com/legal/privacy-notice"});
registerFallback(["Typeform"], {address:"Via Augusta 29–31, 08006 Barcelona, España",city:"Barcelona",postalCode:"08006",country:"España",type:"registered_office",sourceUrl:"https://www.typeform.com/legal/data-processing-agreement"});
registerFallback(["Wallapop"], {address:"Avenida Meridiana 89, 6.ª planta, 08026 Barcelona, España",city:"Barcelona",postalCode:"08026",country:"España",type:"registered_office",sourceUrl:"https://about.wallapop.com/aviso-legal/"});
registerFallback(["Octopus Energy"], {address:"Calle Pintor Sorolla 5, planta 2, 46002 Valencia, España",city:"Valencia",postalCode:"46002",country:"España",type:"registered_office",sourceUrl:"https://octopusenergy.es/documents/T%26C_v2025_05.pdf"});
registerFallback(["domestiko.com"], {address:"Camiño de Ferro 1, 36003 Pontevedra, España",city:"Pontevedra",postalCode:"36003",country:"España",type:"registered_office",sourceUrl:"https://www.confianzaonline.es/empresas/domestiko.htm"});
registerFallback(["Welocalize"], {address:"Aticco Bailén, Carrer de Bailén 105, 08009 Barcelona, España",city:"Barcelona",postalCode:"08009",country:"España",type:"company_office",sourceUrl:"https://www.welocalize.com/es/contact/"});
registerFallback(["NEORIS"], {address:"Calle de María de Portugal 1, Edificio 2, 28050 Madrid, España",city:"Madrid",postalCode:"28050",country:"España",type:"company_office",sourceUrl:"https://neoris.com/contact"});
registerFallback(["Sofico"], {address:"Paseo de la Castellana 163, planta 2, 28046 Madrid, España",city:"Madrid",postalCode:"28046",country:"España",type:"company_office",sourceUrl:"https://sofico.global/en/contact-us/"});
registerFallback(["El Corte Ingles", "El Corte Inglés"], {address:"Calle Hermosilla 112, 28009 Madrid, España",city:"Madrid",postalCode:"28009",country:"España",type:"registered_office",sourceUrl:"https://www.elcorteingles.es/informacioncorporativa/es/politica-de-privacidad/"});
registerFallback(["Contentsquare"], {address:"Calle Serrano 90, planta 6, 28006 Madrid, España",city:"Madrid",postalCode:"28006",country:"España",type:"registered_office",sourceUrl:"https://contentsquare.com/fr-fr/contentsquare-group-list/"});
registerFallback(["SIXT Spain"], {address:"Calle del Canal de Sant Jordi 29, local 2, 07610 Palma de Mallorca, España",city:"Palma de Mallorca",postalCode:"07610",country:"España",type:"company_office",sourceUrl:"https://www.sixt.es/shared/t-c/sixt_ES_es.pdf"});
registerFallback(["Stellantis"], {address:"Calle Eduardo Barreiros 110, Madrid, España",city:"Madrid",postalCode:null,country:"España",type:"company_office",sourceUrl:"https://www.stellantis.com/content/dam/stellantis-corporate/public-disclosures/es/madrid/social/BOCM_Convenio_Stellantis_Madrid_2024_2027.pdf"});
registerFallback(["Factorial"], {address:"Carrer de la Llacuna 56, Edificio C, 08005 Barcelona, España",city:"Barcelona",postalCode:"08005",country:"España",type:"registered_office",sourceUrl:"https://factorialhr.com/cookies"});
registerFallback(["Microsoft"], {address:"Paseo del Club Deportivo 1, Edificio 1, 28223 Pozuelo de Alarcón, Madrid, España",city:"Pozuelo de Alarcón",postalCode:"28223",country:"España",type:"registered_office",sourceUrl:"https://download.microsoft.com/download/7/7/A/77AB4489-C335-4CED-9012-6C7EEB45F657/bases_promocion_upgradeyourworld_es.pdf"});
registerFallback(["Decathlon"], {address:"Parque Comercial Alegra, Calle Salvador de Madariaga, 28702 San Sebastián de los Reyes, Madrid, España",city:"San Sebastián de los Reyes",postalCode:"28702",country:"España",type:"registered_office",sourceUrl:"https://www.decathlon.es/es/c/legal/menciones-legales-decathlon_4c6c2516-af5a-446b-b349-4daeadd386e6"});
registerFallback(["Amazon"], {address:"Paseo de la Castellana 259-A, Torre Foster, 28046 Madrid, España",city:"Madrid",postalCode:"28046",country:"España",type:"company_office",sourceUrl:"https://shipping.amazon.es/condiciones-de-uso"});
registerFallback(["Concentrix"], {address:"Avinguda Diagonal 197, 08018 Barcelona, España",city:"Barcelona",postalCode:"08018",country:"España",type:"company_office",sourceUrl:"https://www.concentrix.com/wp-content/uploads/2024/10/Normas-Corporativas-Vinculantes-Latam-Y-El-Caribe.pdf"});

export function companyOfficeAddressFromMetadata(metadata: Record<string, unknown> | null | undefined, company?: string): CompanyOfficeAddress | null {
  const fallback = company ? fallbackAddresses[normalizeCompany(company)] ?? null : null;
  if (!metadata) return fallback;

  const address = text(metadata.company_office_address);
  const countryCode = text(metadata.company_office_country_code)?.toUpperCase();
  const scope = text(metadata.company_office_address_scope)?.toLowerCase();
  const sourceUrl = text(metadata.company_office_address_source_url);
  const rawType = text(metadata.company_office_address_type);

  if (!address || countryCode !== "ES" || scope !== "spain" || !sourceUrl?.startsWith("https://")) return fallback;
  if (rawType !== "company_office" && rawType !== "registered_office") return fallback;

  return {
    address,
    city: text(metadata.company_office_city),
    postalCode: text(metadata.company_office_postal_code),
    country: text(metadata.company_office_country) ?? "España",
    type: rawType,
    sourceUrl,
    verifiedAt: text(metadata.company_office_address_verified_at),
  };
}
