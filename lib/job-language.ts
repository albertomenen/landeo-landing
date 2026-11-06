export type JobLanguage = "es" | "en";

const SPANISH = new Set(["de","la","el","los","las","con","para","por","una","un","y","en","del","experiencia","trabajo","empresa","equipo","puesto","requisitos","ofrecemos","buscamos","desarrollo","gestión","gestion","ventas","atención","atencion","cliente","clientes","responsable","funciones","oferta","contrato","jornada","incorporación","incorporacion","remoto","analista","desarrollador","ingeniero","gerente","asistente","coordinador","ejecutivo","técnico","tecnico","años","anos","se","su","al","nuestro","nuestra","conocimientos","salario"]);
const ENGLISH = new Set(["the","and","for","with","you","your","our","we","are","will","to","of","in","a","an","is","experience","team","work","role","skills","requirements","responsibilities","about","join","looking","company","engineer","developer","manager","senior","years","based","remote","position","ability","strong","benefits"]);

function words(text: string) {
  return text.toLowerCase().normalize("NFC").split(/[^a-záéíóúüñ]+/).filter(Boolean);
}

/** Best-effort language of a posting from its title and summary. A stored `metadata.language` wins. */
export function jobLanguage(job: { title?: string | null; summary?: string | null; metadata?: Record<string, unknown> | null }): JobLanguage {
  const declared = job.metadata?.language;
  if (declared === "es" || declared === "en") return declared;
  const tokens = words(`${job.title ?? ""} ${job.title ?? ""} ${String(job.summary ?? "").slice(0, 600)}`);
  let es = 0, en = 0;
  for (const token of tokens) { if (SPANISH.has(token)) es += 1; if (ENGLISH.has(token)) en += 1; }
  // Characters that only exist in Spanish are a strong signal.
  if (/[ñ¿¡]/i.test(`${job.title ?? ""}${job.summary ?? ""}`)) es += 2;
  return es > en ? "es" : "en";
}
