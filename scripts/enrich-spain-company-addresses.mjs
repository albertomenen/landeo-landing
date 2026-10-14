const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const write = process.argv.includes("--write");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
}

const verifiedAt = "2026-10-14";
const companies = [
  {
    names: ["Fever"],
    address: "Calle de Fernando el Santo 16, 28010 Madrid, España",
    city: "Madrid",
    postalCode: "28010",
    type: "registered_office",
    sourceUrl: "https://feverup.com/legal/terms_es.html",
  },
  {
    names: ["Celonis"],
    address: "Plaza de Manuel Gómez-Moreno 2, 28020 Madrid, España",
    city: "Madrid",
    postalCode: "28020",
    type: "company_office",
    sourceUrl: "https://www.celonis.com/company/contact-us",
  },
  {
    names: ["Cabify"],
    address: "Calle Pradillo 42, 28002 Madrid, España",
    city: "Madrid",
    postalCode: "28002",
    type: "registered_office",
    sourceUrl: "https://cabify.com/es/legal/politica-de-privacidad/pasajeros",
  },
  {
    names: ["Aircall"],
    address: "Calle José Abascal 45, 3.ª planta, 28003 Madrid, España",
    city: "Madrid",
    postalCode: "28003",
    type: "company_office",
    sourceUrl: "https://aircall.io/contact/",
  },
  {
    names: ["Job&Talent", "Job & Talent"],
    address: "Avenida del Doctor Federico Rubio y Galí 5, Madrid, España",
    city: "Madrid",
    postalCode: null,
    type: "registered_office",
    sourceUrl: "https://www.jobandtalent.com/legal/privacy-notice",
  },
  {
    names: ["Typeform"],
    address: "Via Augusta 29–31, 08006 Barcelona, España",
    city: "Barcelona",
    postalCode: "08006",
    type: "registered_office",
    sourceUrl: "https://www.typeform.com/legal/data-processing-agreement",
  },
  {
    names: ["Wallapop"],
    address: "Avenida Meridiana 89, 6.ª planta, 08026 Barcelona, España",
    city: "Barcelona",
    postalCode: "08026",
    type: "registered_office",
    sourceUrl: "https://about.wallapop.com/aviso-legal/",
  },
  {
    names: ["Octopus Energy"],
    address: "Calle Pintor Sorolla 5, planta 2, 46002 Valencia, España",
    city: "Valencia",
    postalCode: "46002",
    type: "registered_office",
    sourceUrl: "https://octopusenergy.es/documents/T%26C_v2025_05.pdf",
  },
  {
    names: ["domestiko.com"],
    address: "Camiño de Ferro 1, 36003 Pontevedra, España",
    city: "Pontevedra",
    postalCode: "36003",
    type: "registered_office",
    sourceUrl: "https://www.confianzaonline.es/empresas/domestiko.htm",
  },
  {
    names: ["Welocalize"],
    address: "Aticco Bailén, Carrer de Bailén 105, 08009 Barcelona, España",
    city: "Barcelona",
    postalCode: "08009",
    type: "company_office",
    sourceUrl: "https://www.welocalize.com/es/contact/",
  },
  {
    names: ["NEORIS"],
    address: "Calle de María de Portugal 1, Edificio 2, 28050 Madrid, España",
    city: "Madrid",
    postalCode: "28050",
    type: "company_office",
    sourceUrl: "https://neoris.com/contact",
  },
  {
    names: ["Sofico"],
    address: "Paseo de la Castellana 163, planta 2, 28046 Madrid, España",
    city: "Madrid",
    postalCode: "28046",
    type: "company_office",
    sourceUrl: "https://sofico.global/en/contact-us/",
  },
  {
    names: ["El Corte Ingles", "El Corte Inglés"],
    address: "Calle Hermosilla 112, 28009 Madrid, España",
    city: "Madrid",
    postalCode: "28009",
    type: "registered_office",
    sourceUrl: "https://www.elcorteingles.es/informacioncorporativa/es/politica-de-privacidad/",
  },
  {
    names: ["Contentsquare"],
    address: "Calle Serrano 90, planta 6, 28006 Madrid, España",
    city: "Madrid",
    postalCode: "28006",
    type: "registered_office",
    sourceUrl: "https://contentsquare.com/fr-fr/contentsquare-group-list/",
  },
  {
    names: ["SIXT Spain"],
    address: "Calle del Canal de Sant Jordi 29, local 2, 07610 Palma de Mallorca, España",
    city: "Palma de Mallorca",
    postalCode: "07610",
    type: "company_office",
    sourceUrl: "https://www.sixt.es/shared/t-c/sixt_ES_es.pdf",
  },
  {
    names: ["Stellantis"],
    address: "Calle Eduardo Barreiros 110, Madrid, España",
    city: "Madrid",
    postalCode: null,
    type: "company_office",
    sourceUrl: "https://www.stellantis.com/content/dam/stellantis-corporate/public-disclosures/es/madrid/social/BOCM_Convenio_Stellantis_Madrid_2024_2027.pdf",
  },
  {
    names: ["Factorial"],
    address: "Carrer de la Llacuna 56, Edificio C, 08005 Barcelona, España",
    city: "Barcelona",
    postalCode: "08005",
    type: "registered_office",
    sourceUrl: "https://factorialhr.com/cookies",
  },
  {
    names: ["Microsoft"],
    address: "Paseo del Club Deportivo 1, Edificio 1, 28223 Pozuelo de Alarcón, Madrid, España",
    city: "Pozuelo de Alarcón",
    postalCode: "28223",
    type: "registered_office",
    sourceUrl: "https://download.microsoft.com/download/7/7/A/77AB4489-C335-4CED-9012-6C7EEB45F657/bases_promocion_upgradeyourworld_es.pdf",
  },
  {
    names: ["Decathlon"],
    address: "Parque Comercial Alegra, Calle Salvador de Madariaga, 28702 San Sebastián de los Reyes, Madrid, España",
    city: "San Sebastián de los Reyes",
    postalCode: "28702",
    type: "registered_office",
    sourceUrl: "https://www.decathlon.es/es/c/legal/menciones-legales-decathlon_4c6c2516-af5a-446b-b349-4daeadd386e6",
  },
  {
    names: ["Amazon"],
    address: "Paseo de la Castellana 259-A, Torre Foster, 28046 Madrid, España",
    city: "Madrid",
    postalCode: "28046",
    type: "company_office",
    sourceUrl: "https://shipping.amazon.es/condiciones-de-uso",
  },
  {
    names: ["Concentrix"],
    address: "Avinguda Diagonal 197, 08018 Barcelona, España",
    city: "Barcelona",
    postalCode: "08018",
    type: "company_office",
    sourceUrl: "https://www.concentrix.com/wp-content/uploads/2024/10/Normas-Corporativas-Vinculantes-Latam-Y-El-Caribe.pdf",
  },
];

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const isSpanishJob = (job) => {
  const metadata = job.metadata ?? {};
  const country = normalize(metadata.market_country ?? metadata.country_code ?? metadata.country);
  const location = normalize(job.location);
  return ["es", "esp", "spain", "espana"].includes(country)
    || /\b(spain|espana|madrid|barcelona|valencia|sevilla|malaga|bilbao|zaragoza|alicante|coruna|vigo)\b/.test(location);
};

async function request(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response;
}

const selected = new Map();
for (const company of companies) {
  for (const name of company.names) {
    const query = new URLSearchParams({
      select: "id,company,location,metadata",
      status: "eq.active",
      company: `eq.${name}`,
      limit: "1000",
    });
    const response = await request(`jobs?${query}`);
    const jobs = await response.json();
    for (const job of jobs) if (isSpanishJob(job)) selected.set(job.id, { job, company });
  }
}

const updates = [...selected.values()].filter(({ job, company }) => {
  const metadata = job.metadata ?? {};
  return metadata.company_office_address !== company.address
    || metadata.company_office_address_source_url !== company.sourceUrl
    || metadata.company_office_address_scope !== "spain";
});

console.log(JSON.stringify({ mode: write ? "write" : "dry-run", matched: selected.size, pending: updates.length }, null, 2));

if (write) {
  let completed = 0;
  const queue = [...updates];
  const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
    while (queue.length) {
      const { job, company } = queue.shift();
      const metadata = {
        ...(job.metadata ?? {}),
        company_office_address: company.address,
        company_office_city: company.city,
        company_office_postal_code: company.postalCode,
        company_office_country: "España",
        company_office_country_code: "ES",
        company_office_address_type: company.type,
        company_office_address_precision: "exact",
        company_office_address_scope: "spain",
        company_office_address_source_url: company.sourceUrl,
        company_office_address_verified_at: verifiedAt,
      };
      await request(`jobs?id=eq.${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ metadata }),
      });
      completed += 1;
    }
  });
  await Promise.all(workers);
  console.log(JSON.stringify({ updated: completed }, null, 2));
}
