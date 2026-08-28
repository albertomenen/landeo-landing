export type ApplyCapability = "automatic" | "assisted" | "external";
export type Job = {
  id: string; company: string; title: string; summary: string; description: string;
  location: string; market: string; workMode: "remote" | "hybrid" | "onsite";
  salaryMin: number | null; salaryMax: number | null; salaryCurrency: string;
  contractType: string; seniority: string; industry: string;
  applyCapability: ApplyCapability; match: number; publishedAt: string; skills: string[];
};

export const jobs: Job[] = [
  {id:"clarity-product-designer",company:"Clarity AI",title:"Senior Product Designer",summary:"Diseña experiencias de producto que ayuden a inversores y empresas a entender su impacto.",description:"Trabajarás con producto, research e ingeniería para convertir datos complejos en decisiones claras. Buscamos experiencia creando productos B2B, sistemas de diseño y flujos accesibles.",location:"Madrid, España",market:"ES",workMode:"hybrid",salaryMin:55000,salaryMax:70000,salaryCurrency:"EUR",contractType:"Indefinido",seniority:"Senior",industry:"Impact Tech",applyCapability:"assisted",match:92,publishedAt:"2026-08-26",skills:["Figma","Research","Design systems"]},
  {id:"typeform-frontend",company:"Typeform",title:"Senior Frontend Engineer",summary:"Construye experiencias conversacionales usadas por millones de personas en todo el mundo.",description:"Formarás parte del equipo de Core Experience trabajando con React, TypeScript y sistemas distribuidos. Valoramos producto, calidad y colaboración.",location:"Barcelona, España",market:"ES",workMode:"remote",salaryMin:65000,salaryMax:82000,salaryCurrency:"EUR",contractType:"Indefinido",seniority:"Senior",industry:"SaaS",applyCapability:"automatic",match:89,publishedAt:"2026-08-25",skills:["React","TypeScript","Testing"]},
  {id:"cabify-data",company:"Cabify",title:"Data Analyst — Marketplace",summary:"Convierte datos de movilidad en decisiones de producto para ciudades más sostenibles.",description:"Analizarás el rendimiento del marketplace, diseñarás experimentos y colaborarás con equipos locales en España y Latinoamérica.",location:"Madrid, España",market:"ES",workMode:"hybrid",salaryMin:42000,salaryMax:56000,salaryCurrency:"EUR",contractType:"Indefinido",seniority:"Mid level",industry:"Mobility",applyCapability:"external",match:84,publishedAt:"2026-08-24",skills:["SQL","Python","Experimentation"]},
  {id:"remote-product",company:"Remote",title:"Product Manager, Payroll",summary:"Lidera productos globales de nómina para equipos distribuidos.",description:"Definirás la estrategia de producto y trabajarás con diseño, legal e ingeniería para simplificar nóminas internacionales.",location:"Remoto — Europa",market:"GB",workMode:"remote",salaryMin:78000,salaryMax:105000,salaryCurrency:"EUR",contractType:"Full time",seniority:"Senior",industry:"HR Tech",applyCapability:"assisted",match:81,publishedAt:"2026-08-22",skills:["Product strategy","B2B","Analytics"]},
];

export const applications = [
  {id:"app-1",job:jobs[1],status:"processing",date:"Hoy, 10:24",events:["Candidatura aceptada por Landeo","Preparando los datos del perfil","Procesando con el portal de la empresa"]},
  {id:"app-2",job:jobs[0],status:"action_required",date:"Ayer, 18:12",events:["Candidatura iniciada","El portal solicita una respuesta adicional"]},
  {id:"app-3",job:jobs[2],status:"sent",date:"22 ago",events:["Candidatura iniciada","Entrega confirmada por el canal","Confirmación guardada"]},
];

export const statusCopy: Record<string,{label:string;description:string}> = {
  queued:{label:"En cola",description:"Aceptada por Landeo y esperando procesamiento."},
  processing:{label:"Procesando",description:"Una integración está preparando la candidatura."},
  sent:{label:"Enviada",description:"La entrega ha sido confirmada por el canal."},
  action_required:{label:"Acción necesaria",description:"Necesitamos que completes un paso."},
  failed:{label:"No completada",description:"No se pudo completar después de los reintentos."},
};
