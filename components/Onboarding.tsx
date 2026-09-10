"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
} from "motion/react";
import Link from "./SafeLink";
import { Brand } from "./Brand";
import { completeWebOnboarding } from "../lib/landeo";

type Locale = "es" | "en";
type Step =
  | "search"
  | "priorities"
  | "apps"
  | "proof"
  | "role"
  | "experience"
  | "city"
  | "salary"
  | "goal"
  | "goalProof"
  | "interviews"
  | "deadline"
  | "feasibility"
  | "blocker"
  | "outcome"
  | "potential"
  | "source"
  | "promo"
  | "resume"
  | "welcome";
type Choice = {
  id: string;
  icon: string;
  es: string;
  en: string;
  subEs?: string;
  subEn?: string;
};
type Answers = {
  search: string;
  priorities: string[];
  apps: string;
  category: string;
  specialties: string[];
  experience: string;
  city: string;
  currency: string;
  salaryMin: number;
  salaryMax: number;
  goal: string;
  interviews: number;
  deadline: string;
  blocker: string;
  outcome: string;
  source: string;
  promoCode: string;
};

const steps: Step[] = [
  "search",
  "priorities",
  "apps",
  "proof",
  "role",
  "experience",
  "city",
  "salary",
  "goal",
  "goalProof",
  "interviews",
  "deadline",
  "feasibility",
  "blocker",
  "outcome",
  "potential",
  "source",
  "promo",
  "resume",
  "welcome",
];
const initial: Answers = {
  search: "",
  priorities: [],
  apps: "",
  category: "",
  specialties: [],
  experience: "",
  city: "",
  currency: "EUR",
  salaryMin: 40000,
  salaryMax: 80000,
  goal: "",
  interviews: 3,
  deadline: "",
  blocker: "",
  outcome: "",
  source: "",
  promoCode: "",
};
const make = (rows: string[][]): Choice[] =>
  rows.map(([id, icon, es, en, subEs, subEn]) => ({
    id,
    icon,
    es,
    en,
    subEs,
    subEn,
  }));

const choices = {
  search: make([
    [
      "yes",
      "✓",
      "Sí, estoy buscando activamente",
      "Yes, I’m actively looking",
      "Quiero encontrar algo mejor cuanto antes.",
      "I want to find something better soon.",
    ],
    [
      "open",
      "◎",
      "Estoy abierto a oportunidades",
      "I’m open to opportunities",
      "Cambiaría por la oportunidad adecuada.",
      "I’d move for the right opportunity.",
    ],
    [
      "no",
      "○",
      "No, solo estoy explorando",
      "No, I’m just exploring",
      "Quiero conocer mis opciones.",
      "I want to understand my options.",
    ],
  ]),
  priorities: make([
    ["benefits", "✦", "Grandes beneficios", "Great benefits"],
    ["flexibility", "◷", "Horario flexible", "Flexible hours"],
    [
      "startup",
      "↗",
      "Startup con inversores top",
      "Cool startup backed by top investors",
    ],
    ["salary", "$", "Mejor salario", "Better pay"],
    ["remote", "⌂", "Trabajo remoto", "Remote work"],
    ["growth", "↑", "Crecimiento profesional", "Career growth"],
    ["culture", "♡", "Gran cultura", "Great culture"],
    ["stability", "◇", "Estabilidad", "Stability"],
  ]),
  apps: make([
    [
      "yes",
      "✓",
      "Sí",
      "Yes",
      "He probado LinkedIn, InfoJobs u otras.",
      "I’ve tried LinkedIn, Indeed or others.",
    ],
    [
      "no",
      "○",
      "No",
      "No",
      "Landeo será mi primera app de empleo.",
      "Landeo will be my first job app.",
    ],
  ]),
  categories: make([
    ["software", "</>", "Ingeniería de software", "Software engineering"],
    ["healthcare", "+", "Salud", "Healthcare"],
    ["consulting", "◇", "Consultoría", "Consulting"],
    ["hr", "◎", "Recursos humanos", "Human resources"],
    ["data", "▥", "Datos e IA", "Data & AI"],
    ["product", "□", "Producto", "Product"],
    ["design", "✦", "Diseño", "Design"],
    ["marketing", "↗", "Marketing y ventas", "Marketing & sales"],
    ["finance", "$", "Finanzas", "Finance"],
    ["operations", "⚙", "Operaciones", "Operations"],
  ]),
  experience: make([
    ["internship", "◌", "Prácticas", "Internship"],
    ["entry", "⌁", "Entry level y recién graduado", "Entry level & graduate"],
    ["junior", "○", "Junior (1–2 años)", "Junior (1–2 years)"],
    ["mid", "◎", "Mid level (3–5 años)", "Mid level (3–5 years)"],
    ["senior", "✦", "Senior (6–9 años)", "Senior (6–9 years)"],
    [
      "expert",
      "♛",
      "Expert y liderazgo (10+ años)",
      "Expert & leadership (10+ years)",
    ],
  ]),
  goals: make([
    ["asap", "↯", "Conseguir empleo cuanto antes", "Land a job ASAP"],
    ["money", "$", "Ganar más dinero", "Make more money"],
    ["dream", "★", "Conseguir el trabajo de mis sueños", "Land my dream job"],
    ["looking", "◎", "Solo estoy mirando", "Just looking"],
  ]),
  deadlines: make([
    ["1-month", "1", "En 1 mes", "In 1 month"],
    ["3-months", "3", "En 3 meses", "In 3 months"],
    ["6-months", "6", "En 6 meses", "In 6 months"],
    ["12-months", "12", "En 12 meses", "In 12 months"],
  ]),
  blockers: make([
    [
      "volume",
      "↗",
      "No envío suficientes candidaturas",
      "I’m not applying enough",
    ],
    ["interviews", "◎", "No consigo entrevistas", "I can’t land interviews"],
    ["not-ready", "◷", "Todavía no estoy preparado", "I’m not ready yet"],
    ["offers", "◇", "Faltan buenas ofertas", "I can’t find great job offers"],
  ]),
  outcomes: make([
    ["money", "$", "Ganar mucho más dinero", "Make a lot more money"],
    ["family", "♡", "Apoyar a mi familia", "Support my family"],
    [
      "exciting",
      "✦",
      "Encontrar un trabajo que me ilusione",
      "Find a job that excites me",
    ],
    ["time", "◷", "Recuperar mi tiempo", "Get my time back"],
  ]),
  sources: make([
    ["social", "#", "Redes sociales", "Social media"],
    ["influencer", "▶", "Creador de contenido", "Influencer / creator"],
    ["friend", "♡", "Amigo o compañero", "Friend or colleague"],
    ["advertisement", "↗", "Anuncio", "Advertisement"],
    ["search", "⌕", "Buscador", "Search engine"],
    ["other", "…", "Otro", "Other"],
  ]),
};

const specialtyRows: Record<string, string[][]> = {
  software: [
    ["frontend", "Frontend", "Frontend"],
    ["backend", "Backend", "Backend"],
    ["full-stack", "Full-stack", "Full-stack"],
    ["mobile", "Mobile", "Mobile"],
    ["devops", "DevOps / Cloud", "DevOps / Cloud"],
    ["qa", "QA Automation", "QA Automation"],
    ["management", "Engineering Management", "Engineering Management"],
  ],
  healthcare: [
    ["medicine", "Medicina", "Medicine"],
    ["nursing", "Enfermería", "Nursing"],
    ["biotech", "Biotecnología", "Biotech"],
    ["pharmacy", "Farmacia", "Pharmacy"],
    ["healthtech", "HealthTech", "HealthTech"],
    ["clinical", "Investigación clínica", "Clinical research"],
  ],
  consulting: [
    ["strategy", "Estrategia", "Strategy"],
    ["technology", "Tecnología", "Technology"],
    ["operations", "Operaciones", "Operations"],
    ["digital", "Transformación digital", "Digital transformation"],
    ["people", "People & Organization", "People & Organization"],
  ],
  hr: [
    ["recruiting", "Selección de talento", "Talent acquisition"],
    ["people-ops", "People Operations", "People Operations"],
    ["learning", "Formación y desarrollo", "Learning & development"],
    ["compensation", "Compensación y beneficios", "Compensation & benefits"],
    ["hrbp", "HR Business Partner", "HR Business Partner"],
  ],
  data: [
    ["analyst", "Data Analyst", "Data Analyst"],
    ["scientist", "Data Scientist", "Data Scientist"],
    ["engineer", "Data Engineer", "Data Engineer"],
    ["ml", "Machine Learning", "Machine Learning"],
    ["bi", "Business Intelligence", "Business Intelligence"],
    ["ai", "AI Engineer", "AI Engineer"],
  ],
  product: [
    ["pm", "Product Manager", "Product Manager"],
    ["owner", "Product Owner", "Product Owner"],
    ["growth", "Growth Product", "Growth Product"],
    ["technical", "Technical Product Manager", "Technical Product Manager"],
    ["product-ops", "Product Operations", "Product Operations"],
  ],
  design: [
    ["product-design", "Product Design", "Product Design"],
    ["ux-ui", "UX/UI", "UX/UI"],
    ["research", "UX Research", "UX Research"],
    ["graphic", "Diseño gráfico", "Graphic Design"],
    ["motion", "Motion Design", "Motion Design"],
    ["systems", "Design Systems", "Design Systems"],
  ],
  marketing: [
    ["growth", "Growth", "Growth"],
    ["performance", "Performance Marketing", "Performance Marketing"],
    ["content", "Contenido", "Content"],
    ["brand", "Marca", "Brand"],
    ["sales", "Ventas", "Sales"],
    ["success", "Customer Success", "Customer Success"],
  ],
  finance: [
    ["accounting", "Contabilidad", "Accounting"],
    ["fpa", "FP&A", "FP&A"],
    ["banking", "Banca de inversión", "Investment banking"],
    ["audit", "Auditoría", "Audit"],
    ["fintech", "Fintech", "Fintech"],
    ["risk", "Riesgo y cumplimiento", "Risk & compliance"],
  ],
  operations: [
    ["project", "Project Management", "Project management"],
    ["supply", "Cadena de suministro", "Supply chain"],
    ["legal", "Legal", "Legal"],
    ["customer", "Operaciones de clientes", "Customer operations"],
    ["procurement", "Compras", "Procurement"],
  ],
};
const specialties: Record<string, Choice[]> = Object.fromEntries(
  Object.entries(specialtyRows).map(([key, rows]) => [
    key,
    rows.map(([id, es, en], i) => ({ id, icon: String(i + 1), es, en })),
  ]),
);
type WorldCity = {
  n: string;
  a: string;
  c: string;
  cc: string;
  r: string;
  p: number;
};
let worldCitiesPromise: Promise<WorldCity[]> | null = null;
const loadWorldCities = () =>
  (worldCitiesPromise ??= fetch("/cities-world.json").then((response) => {
    if (!response.ok) throw new Error("city_database");
    return response.json() as Promise<WorldCity[]>;
  }));

const copy = {
  es: {
    step: "Paso",
    of: "de",
    exit: "Salir",
    back: "Atrás",
    continue: "Continuar",
    skip: "Saltar",
    finish: "Encontrar empleos",
    saving: "Guardando tu perfil…",
    selectUpTo: "Selecciona hasta tres opciones.",
    selectSpecialty: "Ahora elige una o varias especialidades.",
    cityPlaceholder: "Busca o escribe una ciudad",
    currency: "Moneda",
    minimum: "Mínimo",
    maximum: "Máximo",
    realistic: "Es un objetivo realista con un proceso constante.",
    difficult:
      "Es un objetivo exigente. Hará falta volumen, buen encaje y constancia.",
    promoPlaceholder: "Escribe tu código",
    promoHelp: "Lo verificaremos cuando actives Landeo Pro mediante Stripe.",
    upload: "Seleccionar CV",
    replace: "Cambiar archivo",
    resumeHelp: "PDF, DOC o DOCX · máximo 10 MB",
    error:
      "No pudimos guardar tu perfil. Comprueba tu sesión e inténtalo otra vez.",
    language: "Cambiar idioma",
    resultsVary:
      "Estimación ilustrativa basada en aumentar las candidaturas relevantes. Los resultados dependen del perfil y el mercado.",
    titles: {
      search: "¿Estás buscando un nuevo empleo?",
      priorities: "¿Qué es lo más importante en un nuevo empleo?",
      apps: "¿Has probado otras apps de búsqueda de empleo?",
      role: "¿Qué tipo de empleo estás buscando?",
      experience: "¿Cuánta experiencia tienes?",
      city: "¿En qué ciudad estás buscando?",
      salary: "¿Qué rango salarial esperas?",
      goal: "¿Cuál es tu objetivo?",
      interviews: "¿Cuántas entrevistas quieres por semana?",
      deadline: "¿Cuándo necesitas un nuevo empleo?",
      blocker: "¿Qué te impide alcanzar tus objetivos?",
      outcome: "¿Qué quieres conseguir?",
      source: "¿Cómo conociste Landeo?",
      promo: "¿Tienes un código promocional?",
      resume: "Sube tu CV",
    },
    subtitles: {
      search: "Adaptaremos las oportunidades y el ritmo a tu situación.",
      priorities: "Landeo usará estas señales para ordenar mejor tu feed.",
      apps: "No hay una respuesta correcta; queremos conocer tu punto de partida.",
      role: "Primero elige un área y después afina la especialidad.",
      experience: "Evitaremos mostrarte puestos demasiado junior o senior.",
      city: "Usaremos tu ubicación para encontrar opciones cercanas, híbridas o remotas.",
      salary: "Ajusta el rango bruto anual que quieres encontrar.",
      goal: "Tu objetivo marcará cómo priorizamos las oportunidades.",
      interviews: "Define un objetivo semanal. Te diremos si parece realista.",
      deadline: "Esto nos ayuda a recomendar un ritmo de búsqueda.",
      blocker: "Nos centraremos primero en eliminar el obstáculo principal.",
      outcome: "Elige el cambio que tendría más impacto en tu vida.",
      source: "Tu respuesta nos ayuda a encontrar a más personas como tú.",
      promo:
        "Si tienes un código de Stripe, puedes añadirlo ahora o saltar este paso.",
      resume:
        "Tu CV se guarda de forma privada y se usa para preparar candidaturas que tú autorices.",
    },
  },
  en: {
    step: "Step",
    of: "of",
    exit: "Exit",
    back: "Back",
    continue: "Continue",
    skip: "Skip",
    finish: "Find jobs",
    saving: "Saving your profile…",
    selectUpTo: "Choose up to three options.",
    selectSpecialty: "Now choose one or more specializations.",
    cityPlaceholder: "Search or type a city",
    currency: "Currency",
    minimum: "Minimum",
    maximum: "Maximum",
    realistic: "This is a realistic target with a consistent process.",
    difficult:
      "This is an ambitious target. It will take volume, strong fit and consistency.",
    promoPlaceholder: "Enter your code",
    promoHelp: "We’ll verify it when you activate Landeo Pro through Stripe.",
    upload: "Select résumé",
    replace: "Replace file",
    resumeHelp: "PDF, DOC or DOCX · 10 MB maximum",
    error: "We couldn’t save your profile. Check your session and try again.",
    language: "Change language",
    resultsVary:
      "Illustrative estimate based on increasing relevant applications. Results vary by profile and market.",
    titles: {
      search: "Are you looking for a new job?",
      priorities: "What’s most important in a new job?",
      apps: "Have you tried other job search apps?",
      role: "What kind of job are you looking for?",
      experience: "How much experience do you have?",
      city: "Where are you looking for work?",
      salary: "Expected salary range?",
      goal: "What’s your goal?",
      interviews: "How many interviews do you want per week?",
      deadline: "When do you need a new job?",
      blocker: "What’s stopping you from reaching your goals?",
      outcome: "What do you want to accomplish?",
      source: "How did you hear about Landeo?",
      promo: "Do you have a promo code?",
      resume: "Upload your résumé",
    },
    subtitles: {
      search: "We’ll tailor your opportunities and pace to your situation.",
      priorities: "Landeo will use these signals to rank your feed.",
      apps: "There’s no right answer; we just want to understand your starting point.",
      role: "Choose a field first, then narrow it down to a specialization.",
      experience: "We’ll avoid roles that are far too junior or senior.",
      city: "We’ll use your location to find nearby, hybrid and remote roles.",
      salary: "Set the annual gross salary range you want to see.",
      goal: "Your goal will shape how we prioritize opportunities.",
      interviews:
        "Set a weekly target and we’ll tell you how realistic it looks.",
      deadline: "This helps us recommend the right job-search pace.",
      blocker: "We’ll focus first on removing your biggest obstacle.",
      outcome:
        "Choose the change that would have the biggest impact on your life.",
      source: "Your answer helps us reach more people like you.",
      promo: "If you have a Stripe code, add it now or skip this step.",
      resume:
        "Your résumé stays private and is used to prepare applications you authorize.",
    },
  },
} as const;

const label = (item: Choice, locale: Locale) =>
  locale === "es" ? item.es : item.en;
const subtitle = (item: Choice, locale: Locale) =>
  locale === "es" ? item.subEs : item.subEn;
const money = (value: number, currency: string, locale: Locale) =>
  new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const stepMotion = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 42 : -42,
    scale: 0.985,
  }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -34 : 34,
    scale: 0.99,
  }),
};
const choiceListMotion = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
const choiceMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
};

export default function Onboarding() {
  const [index, setIndex] = useState(0),
    [direction, setDirection] = useState(1),
    [locale, setLocale] = useState<Locale>("es"),
    [answers, setAnswers] = useState<Answers>(initial),
    [resume, setResume] = useState<File | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [cityOpen, setCityOpen] = useState(false),
    [cityResults, setCityResults] = useState<WorldCity[]>([]),
    [cityLoading, setCityLoading] = useState(false),
    [draftReady, setDraftReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null),
    step = steps[index],
    t = copy[locale],
    ambitious = answers.interviews > 4,
    categorySpecialties = specialties[answers.category] ?? [];
  useEffect(() => {
    const saved = localStorage.getItem("landeo-locale"),
      draft = localStorage.getItem("landeo-onboarding-draft");
    queueMicrotask(() => {
      if (saved === "es" || saved === "en") setLocale(saved);
      else if (!navigator.language.toLowerCase().startsWith("es")) {
        setLocale("en");
        setAnswers((a) => ({
          ...a,
          currency: "USD",
          salaryMin: 50000,
          salaryMax: 100000,
        }));
      }
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as {
            answers?: Partial<Answers>;
            index?: number;
          };
          if (parsed.answers) setAnswers((a) => ({ ...a, ...parsed.answers }));
          if (typeof parsed.index === "number")
            setIndex(
              Math.min(Math.max(0, parsed.index), steps.indexOf("resume")),
            );
        } catch {
          localStorage.removeItem("landeo-onboarding-draft");
        }
      }
      setDraftReady(true);
    });
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("landeo-locale", locale);
  }, [locale]);
  useEffect(() => {
    if (draftReady)
      localStorage.setItem(
        "landeo-onboarding-draft",
        JSON.stringify({ answers, index }),
      );
  }, [answers, index, draftReady]);
  useEffect(() => {
    const query = normalizeSearch(answers.city);
    if (!cityOpen || query.length < 2) return;
    const timer = window.setTimeout(async () => {
      setCityLoading(true);
      try {
        const database = await loadWorldCities(),
          prefix: WorldCity[] = [],
          partial: WorldCity[] = [],
          seen = new Set<string>();
        for (const city of database) {
          const name = normalizeSearch(city.n),
            ascii = normalizeSearch(city.a),
            country = normalizeSearch(city.c),
            key = `${city.n}|${city.cc}`;
          if (seen.has(key)) continue;
          if (name.startsWith(query) || ascii.startsWith(query)) {
            prefix.push(city);
            seen.add(key);
          } else if (
            name.includes(query) ||
            ascii.includes(query) ||
            country.startsWith(query)
          ) {
            partial.push(city);
            seen.add(key);
          }
        }
        setCityResults([...prefix, ...partial].slice(0, 8));
      } catch {
        setCityResults([]);
      } finally {
        setCityLoading(false);
      }
    }, 140);
    return () => window.clearTimeout(timer);
  }, [answers.city, cityOpen]);
  const setOne = (key: keyof Answers, value: string | number) =>
    setAnswers((a) => ({ ...a, [key]: value }));
  const togglePriority = (id: string) =>
    setAnswers((a) => ({
      ...a,
      priorities: a.priorities.includes(id)
        ? a.priorities.filter((x) => x !== id)
        : [...a.priorities, id].slice(-3),
    }));
  const toggleSpecialty = (id: string) =>
    setAnswers((a) => ({
      ...a,
      specialties: a.specialties.includes(id)
        ? a.specialties.filter((x) => x !== id)
        : [...a.specialties, id],
    }));
  const chooseCategory = (id: string) => {
    setAnswers((a) => ({
      ...a,
      category: id,
      specialties: a.category === id ? a.specialties : [],
    }));
    window.setTimeout(
      () =>
        document
          .getElementById("role-specialties")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      90,
    );
  };
  const canContinue = useMemo(() => {
    switch (step) {
      case "search":
        return !!answers.search;
      case "priorities":
        return !!answers.priorities.length;
      case "apps":
        return !!answers.apps;
      case "role":
        return !!answers.category && !!answers.specialties.length;
      case "experience":
        return !!answers.experience;
      case "city":
        return answers.city.trim().length > 1;
      case "salary":
        return answers.salaryMax > answers.salaryMin;
      case "goal":
        return !!answers.goal;
      case "deadline":
        return !!answers.deadline;
      case "blocker":
        return !!answers.blocker;
      case "outcome":
        return !!answers.outcome;
      case "source":
        return !!answers.source;
      case "resume":
        return !!resume;
      default:
        return true;
    }
  }, [answers, resume, step]);
  const switchLocale = (next: Locale) => {
    setLocale(next);
    if (
      next === "en" &&
      answers.currency === "EUR" &&
      answers.salaryMin === 40000
    )
      setAnswers((a) => ({
        ...a,
        currency: "USD",
        salaryMin: 50000,
        salaryMax: 100000,
      }));
    if (
      next === "es" &&
      answers.currency === "USD" &&
      answers.salaryMin === 50000
    )
      setAnswers((a) => ({
        ...a,
        currency: "EUR",
        salaryMin: 40000,
        salaryMax: 80000,
      }));
  };
  const moveTo = (target: number) => {
    const nextIndex = Math.min(steps.length - 1, Math.max(0, target));
    setDirection(nextIndex >= index ? 1 : -1);
    setIndex(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => canContinue && moveTo(index + 1);
  const finish = async () => {
    if (!resume) return;
    setSaving(true);
    setError("");
    try {
      const category = choices.categories.find(
        (x) => x.id === answers.category,
      );
      await completeWebOnboarding({
        answers: {
          ...answers,
          categoryLabel: category ? label(category, locale) : answers.category,
          specialtyLabels: categorySpecialties
            .filter((x) => answers.specialties.includes(x.id))
            .map((x) => label(x, locale)),
        },
        resume,
        locale,
      });
      localStorage.removeItem("landeo-onboarding-draft");
      window.location.assign("/app/jobs?welcome=1");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
      setSaving(false);
    }
  };
  const renderChoices = (
    items: Choice[],
    selected: string[],
    select: (id: string) => void,
    wide = false,
  ) => (
    <m.div
      className={`onboarding-choice-grid${wide ? " wide" : ""}`}
      variants={choiceListMotion}
      initial="hidden"
      animate="show"
    >
      {items.map((item) => {
        const isSelected = selected.includes(item.id);
        return (
          <m.button
            type="button"
            key={item.id}
            variants={choiceMotion}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.975 }}
            className={isSelected ? "selected" : ""}
            aria-pressed={isSelected}
            onClick={() => select(item.id)}
          >
            <m.i
              animate={{
                scale: isSelected ? [1, 0.82, 1.12, 1] : 1,
                rotate: isSelected ? [0, -8, 5, 0] : 0,
              }}
              transition={{ duration: 0.32 }}
            >
              {isSelected ? "✓" : item.icon}
            </m.i>
            <span>
              <strong>{label(item, locale)}</strong>
              {subtitle(item, locale) && (
                <small>{subtitle(item, locale)}</small>
              )}
            </span>
            <m.b
              animate={{
                scale: isSelected ? 1.15 : 1,
                opacity: isSelected ? 1 : 0.58,
              }}
            >
              {isSelected ? "●" : "○"}
            </m.b>
          </m.button>
        );
      })}
    </m.div>
  );
  const question = (key: keyof typeof t.titles, children: React.ReactNode) => (
    <>
      <p className="onboarding-eyebrow">
        {String(index + 1).padStart(2, "0")} · LANDEO PROFILE
      </p>
      <h1>{t.titles[key]}</h1>
      <p className="onboarding-lead">{t.subtitles[key]}</p>
      {children}
    </>
  );
  let body: React.ReactNode;
  if (step === "search")
    body = question(
      "search",
      renderChoices(
        choices.search,
        [answers.search],
        (id) => setOne("search", id),
        true,
      ),
    );
  else if (step === "priorities")
    body = question(
      "priorities",
      <>
        <p className="selection-note">{t.selectUpTo}</p>
        {renderChoices(choices.priorities, answers.priorities, togglePriority)}
      </>,
    );
  else if (step === "apps")
    body = question(
      "apps",
      renderChoices(
        choices.apps,
        [answers.apps],
        (id) => setOne("apps", id),
        true,
      ),
    );
  else if (step === "proof")
    body = <Proof locale={locale} note={t.resultsVary} />;
  else if (step === "role")
    body = question(
      "role",
      <>
        <p className="selection-note">
          {answers.category ? t.selectSpecialty : "1 / 2"}
        </p>
        {renderChoices(choices.categories, [answers.category], chooseCategory)}
        <AnimatePresence>
          {answers.category && (
            <m.div
              id="role-specialties"
              className="specialty-panel"
              tabIndex={-1}
              initial={{ opacity: 0, height: 0, y: -12 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <m.span
                className="specialty-cue"
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.15, repeat: Infinity }}
              >
                ↓
              </m.span>
              <h2>{t.selectSpecialty}</h2>
              <m.div
                className="specialty-chips"
                variants={choiceListMotion}
                initial="hidden"
                animate="show"
              >
                {categorySpecialties.map((item) => {
                  const isSelected = answers.specialties.includes(item.id);
                  return (
                    <m.button
                      type="button"
                      variants={choiceMotion}
                      whileTap={{ scale: 0.94 }}
                      key={item.id}
                      className={isSelected ? "selected" : ""}
                      onClick={() => toggleSpecialty(item.id)}
                    >
                      {isSelected && "✓ "}
                      {label(item, locale)}
                    </m.button>
                  );
                })}
              </m.div>
            </m.div>
          )}
        </AnimatePresence>
      </>,
    );
  else if (step === "experience")
    body = question(
      "experience",
      renderChoices(choices.experience, [answers.experience], (id) =>
        setOne("experience", id),
      ),
    );
  else if (step === "city")
    body = question(
      "city",
      <div className="city-picker">
        <m.div
          className="city-search"
          animate={{
            borderColor: cityOpen ? "#3b7f5a" : "#dde4dd",
            boxShadow: cityOpen
              ? "0 14px 36px rgba(36, 92, 64, 0.13)"
              : "0 9px 24px rgba(36, 92, 64, 0.07)",
          }}
        >
          <span>⌕</span>
          <input
            value={answers.city}
            onFocus={() => setCityOpen(true)}
            onBlur={() => window.setTimeout(() => setCityOpen(false), 120)}
            onChange={(e) => {
              setOne("city", e.target.value);
              setCityOpen(true);
            }}
            placeholder={t.cityPlaceholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={cityOpen}
            aria-controls="city-suggestions"
          />
        </m.div>
        <AnimatePresence>
          {cityOpen && (
            <m.div
              id="city-suggestions"
              className="city-suggestions"
              role="listbox"
              initial={{ opacity: 0, y: -10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
            >
              {cityLoading ? (
                <p>
                  {locale === "es"
                    ? "Buscando ciudades del mundo…"
                    : "Searching cities worldwide…"}
                </p>
              ) : normalizeSearch(answers.city).length < 2 ? (
                <p>
                  {locale === "es"
                    ? "Escribe al menos dos letras."
                    : "Type at least two letters."}
                </p>
              ) : cityResults.length ? (
                cityResults.map((city, position) => {
                  const value = `${city.n}, ${city.c}`;
                  return (
                    <m.button
                      type="button"
                      role="option"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: position * 0.025 }}
                      aria-selected={answers.city === value}
                      key={`${city.n}-${city.cc}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setOne("city", value);
                        setCityOpen(false);
                      }}
                    >
                      <i>⌖</i>
                      <span>
                        <strong>{city.n}</strong>
                        <small>{city.c}</small>
                      </span>
                      <b>↵</b>
                    </m.button>
                  );
                })
              ) : (
                <p>
                  {locale === "es"
                    ? "No encontramos coincidencias, pero puedes usar la ubicación escrita."
                    : "No matches found, but you can use the location you entered."}
                </p>
              )}
              <a
                href="https://www.geonames.org/"
                target="_blank"
                rel="noreferrer"
              >
                GeoNames
              </a>
            </m.div>
          )}
        </AnimatePresence>
      </div>,
    );
  else if (step === "salary")
    body = question(
      "salary",
      <Salary locale={locale} answers={answers} setAnswers={setAnswers} />,
    );
  else if (step === "goal")
    body = question(
      "goal",
      renderChoices(
        choices.goals,
        [answers.goal],
        (id) => setOne("goal", id),
        true,
      ),
    );
  else if (step === "goalProof")
    body = <GoalProof locale={locale} note={t.resultsVary} />;
  else if (step === "interviews")
    body = question(
      "interviews",
      <m.div
        className="interview-target"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <output>
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={answers.interviews}
              initial={{ opacity: 0, y: 12, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
            >
              {answers.interviews}
            </m.span>
          </AnimatePresence>
          <small>
            {locale === "es" ? "entrevistas / semana" : "interviews / week"}
          </small>
        </output>
        <input
          aria-label={t.titles.interviews}
          type="range"
          min="1"
          max="8"
          value={answers.interviews}
          onChange={(e) => setOne("interviews", Number(e.target.value))}
        />
        <div className="range-axis">
          <span>1</span>
          <span>4</span>
          <span>8</span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <m.p
            key={ambitious ? "ambitious" : "realistic"}
            className={ambitious ? "ambitious" : "realistic"}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {ambitious ? "↗" : "✓"} {ambitious ? t.difficult : t.realistic}
          </m.p>
        </AnimatePresence>
      </m.div>,
    );
  else if (step === "deadline")
    body = question(
      "deadline",
      renderChoices(choices.deadlines, [answers.deadline], (id) =>
        setOne("deadline", id),
      ),
    );
  else if (step === "feasibility")
    body = (
      <Feasibility
        locale={locale}
        interviews={answers.interviews}
        deadline={answers.deadline}
        ambitious={ambitious}
      />
    );
  else if (step === "blocker")
    body = question(
      "blocker",
      renderChoices(
        choices.blockers,
        [answers.blocker],
        (id) => setOne("blocker", id),
        true,
      ),
    );
  else if (step === "outcome")
    body = question(
      "outcome",
      renderChoices(
        choices.outcomes,
        [answers.outcome],
        (id) => setOne("outcome", id),
        true,
      ),
    );
  else if (step === "potential") body = <Potential locale={locale} />;
  else if (step === "source")
    body = question(
      "source",
      renderChoices(choices.sources, [answers.source], (id) =>
        setOne("source", id),
      ),
    );
  else if (step === "promo")
    body = question(
      "promo",
      <m.div
        className="promo-card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <label>
          <m.span
            animate={{
              rotate: answers.promoCode ? [0, -8, 8, 0] : 0,
              scale: answers.promoCode ? 1.08 : 1,
            }}
          >
            ✦
          </m.span>
          <input
            value={answers.promoCode}
            maxLength={40}
            onChange={(e) =>
              setOne(
                "promoCode",
                e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
              )
            }
            placeholder={t.promoPlaceholder}
          />
        </label>
        <p>{t.promoHelp}</p>
      </m.div>,
    );
  else if (step === "resume")
    body = question(
      "resume",
      <m.div
        className={`resume-drop${resume ? " selected" : ""}`}
        animate={{ scale: resume ? [1, 0.985, 1] : 1 }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (file && file.size > 10 * 1024 * 1024) {
              setError(
                locale === "es"
                  ? "El CV no puede superar 10 MB."
                  : "Your résumé must be 10 MB or smaller.",
              );
              return;
            }
            setError("");
            setResume(file);
          }}
        />
        <m.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => fileRef.current?.click()}
        >
          <m.i
            animate={{
              scale: resume ? [1, 0.75, 1.12, 1] : 1,
              rotate: resume ? [0, -10, 0] : 0,
            }}
          >
            {resume ? "✓" : "↑"}
          </m.i>
          <strong>{resume ? resume.name : t.upload}</strong>
          <small>
            {resume
              ? `${Math.max(1, Math.round(resume.size / 1024))} KB · ${t.replace}`
              : t.resumeHelp}
          </small>
        </m.button>
      </m.div>,
    );
  else body = <Welcome locale={locale} />;
  const supportHref = `mailto:careers@haired.app?subject=${encodeURIComponent(locale === "es" ? "Problema durante el onboarding de Landeo" : "Problem during Landeo onboarding")}&body=${encodeURIComponent(locale === "es" ? `Hola, he encontrado un problema en el paso ${index + 1} del onboarding. Descripción:` : `Hi, I found a problem on step ${index + 1} of onboarding. Description:`)}`;
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <main className="onboarding-page onboarding-v2">
          <header>
            <Brand />
            <div className="onboarding-header-meta">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.span
                  key={index}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                >
                  {t.step} {index + 1} {t.of} {steps.length}
                </m.span>
              </AnimatePresence>
              <a
                className="onboarding-report-link"
                href={supportHref}
                title={
                  locale === "es" ? "Informar de un error" : "Report an issue"
                }
              >
                <i>?</i>
                <b>
                  {locale === "es" ? "Informar de un error" : "Report an issue"}
                </b>
              </a>
              <div
                className="language-switcher"
                role="group"
                aria-label={t.language}
              >
                <button
                  type="button"
                  className={locale === "es" ? "active" : ""}
                  onClick={() => switchLocale("es")}
                >
                  ES
                </button>
                <i />
                <button
                  type="button"
                  className={locale === "en" ? "active" : ""}
                  onClick={() => switchLocale("en")}
                >
                  EN
                </button>
              </div>
              <Link href="/">{t.exit}</Link>
            </div>
          </header>
          <div
            className="onboarding-motion-progress"
            role="progressbar"
            aria-label={
              locale === "es"
                ? "Progreso del onboarding"
                : "Onboarding progress"
            }
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={index + 1}
          >
            <m.span
              initial={false}
              animate={{ scaleX: (index + 1) / steps.length }}
              transition={{ type: "spring", stiffness: 150, damping: 24 }}
            />
          </div>
          <section className={`onboarding-panel step-${step}`}>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <m.div
                key={step}
                className="onboarding-step-content"
                custom={direction}
                variants={stepMotion}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {body}
                {error && (
                  <m.p
                    className="onboarding-error"
                    role="alert"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error}{" "}
                    <a href={supportHref}>
                      {locale === "es"
                        ? "Contactar con soporte"
                        : "Contact support"}
                    </a>
                  </m.p>
                )}
              </m.div>
            </AnimatePresence>
            <div className="onboarding-actions">
              <m.button
                type="button"
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.96 }}
                disabled={index === 0 || saving}
                onClick={() => moveTo(index - 1)}
              >
                ← {t.back}
              </m.button>
              {step === "welcome" ? (
                <m.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="button button-primary"
                  disabled={saving}
                  onClick={finish}
                >
                  {saving ? t.saving : `${t.finish} →`}
                </m.button>
              ) : (
                <div>
                  {step === "promo" && (
                    <m.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      className="skip-button"
                      onClick={() => {
                        setOne("promoCode", "");
                        moveTo(index + 1);
                      }}
                    >
                      {t.skip}
                    </m.button>
                  )}
                  <m.button
                    type="button"
                    whileHover={canContinue ? { y: -2 } : {}}
                    whileTap={canContinue ? { scale: 0.97 } : {}}
                    className="button button-primary"
                    disabled={!canContinue || saving}
                    onClick={next}
                  >
                    {t.continue} →
                  </m.button>
                </div>
              )}
            </div>
          </section>
        </main>
      </MotionConfig>
    </LazyMotion>
  );
}

function Salary({
  locale,
  answers,
  setAnswers,
}: {
  locale: Locale;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  const t = copy[locale],
    ceiling = 300000,
    min = Math.min(answers.salaryMin, answers.salaryMax - 5000),
    max = Math.max(answers.salaryMax, min + 5000);
  return (
    <m.div
      className="salary-card"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="salary-toolbar">
        <label>
          {t.currency}
          <select
            value={answers.currency}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, currency: e.target.value }))
            }
          >
            <option>EUR</option>
            <option>USD</option>
            <option>GBP</option>
            <option>MXN</option>
          </select>
        </label>
      </div>
      <div className="salary-values">
        <div>
          <small>{t.minimum}</small>
          <m.strong
            key={`${answers.currency}-${min}`}
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {money(min, answers.currency, locale)}
          </m.strong>
        </div>
        <span>—</span>
        <div>
          <small>{t.maximum}</small>
          <m.strong
            key={`${answers.currency}-${max}`}
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {money(max, answers.currency, locale)}
          </m.strong>
        </div>
      </div>
      <div className="dual-range">
        <m.div
          className="dual-range-fill"
          animate={{
            left: `${(min / ceiling) * 100}%`,
            right: `${100 - (max / ceiling) * 100}%`,
          }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
        <input
          aria-label={t.minimum}
          type="range"
          min="0"
          max={ceiling - 5000}
          step="5000"
          value={min}
          onChange={(e) =>
            setAnswers((a) => ({
              ...a,
              salaryMin: Math.min(Number(e.target.value), a.salaryMax - 5000),
            }))
          }
        />
        <input
          aria-label={t.maximum}
          type="range"
          min="5000"
          max={ceiling}
          step="5000"
          value={max}
          onChange={(e) =>
            setAnswers((a) => ({
              ...a,
              salaryMax: Math.max(Number(e.target.value), a.salaryMin + 5000),
            }))
          }
        />
      </div>
      <div className="range-axis">
        <span>{money(0, answers.currency, locale)}</span>
        <span>{money(ceiling, answers.currency, locale)}</span>
      </div>
      <p>
        <strong>
          {locale === "es" ? "Tu rango salarial" : "Your salary range"}
        </strong>
        {locale === "es"
          ? `Buscaremos puestos de ${money(min, answers.currency, locale)} a ${money(max, answers.currency, locale)} al año.`
          : `We’ll look for roles paying ${money(min, answers.currency, locale)}–${money(max, answers.currency, locale)} per year.`}
      </p>
    </m.div>
  );
}

function Proof({ locale, note }: { locale: Locale; note: string }) {
  return (
    <div className="validation-screen">
      <m.span
        className="validation-icon"
        initial={{ opacity: 0, scale: 0.45, rotate: -18 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 230, damping: 16 }}
      >
        ↗
      </m.span>
      <p className="onboarding-eyebrow">
        {locale === "es"
          ? "MÁS OPORTUNIDADES RELEVANTES"
          : "MORE RELEVANT OPPORTUNITIES"}
      </p>
      <h1>
        {locale === "es"
          ? "Consigue hasta 3× más oportunidades de entrevista"
          : "Get up to 3× more interview opportunities"}
      </h1>
      <p className="onboarding-lead">
        {locale === "es"
          ? "Landeo concentra tu esfuerzo en vacantes compatibles y reduce el trabajo repetitivo."
          : "Landeo focuses your effort on compatible roles and removes repetitive work."}
      </p>
      <div className="comparison-chart">
        <div>
          <strong>
            {locale === "es" ? "Búsqueda tradicional" : "Traditional search"}
          </strong>
          <m.i
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            style={{ height: "30%", transformOrigin: "bottom" }}
          >
            1×
          </m.i>
        </div>
        <div className="active">
          <strong>Landeo</strong>
          <m.i
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              duration: 0.72,
              delay: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ height: "88%", transformOrigin: "bottom" }}
          >
            3×
          </m.i>
        </div>
      </div>
      <small className="claim-note">{note}</small>
    </div>
  );
}
function GoalProof({ locale, note }: { locale: Locale; note: string }) {
  return (
    <div className="validation-screen">
      <m.span
        className="validation-icon"
        initial={{ opacity: 0, scale: 0.45, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 230, damping: 16 }}
      >
        ✦
      </m.span>
      <p className="onboarding-eyebrow">
        {locale === "es"
          ? "TU OBJETIVO, CON UN SISTEMA"
          : "YOUR GOAL, WITH A SYSTEM"}
      </p>
      <h1>
        {locale === "es"
          ? "Más candidaturas relevantes. Muchas más posibilidades de conversación."
          : "More relevant applications. Far more chances to start a conversation."}
      </h1>
      <div
        className="impact-graph"
        aria-label={
          locale === "es"
            ? "Comparación entre búsqueda tradicional y Landeo"
            : "Traditional job search compared with Landeo"
        }
      >
        <div className="graph-grid">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="impact-column traditional">
          <b>1×</b>
          <m.span
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            style={{ transformOrigin: "bottom" }}
          />
          <strong>
            {locale === "es" ? "Búsqueda tradicional" : "Traditional search"}
          </strong>
        </div>
        <div className="impact-column landeo">
          <m.em
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: [1, 1.06, 1] }}
            transition={{
              opacity: { delay: 0.68, duration: 0.2 },
              scale: { delay: 0.68, duration: 1.5, repeat: Infinity },
            }}
          >
            +200%
          </m.em>
          <b>3×</b>
          <m.span
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              duration: 0.75,
              delay: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ transformOrigin: "bottom" }}
          />
          <strong>Landeo</strong>
        </div>
      </div>
      <p className="onboarding-lead">
        {locale === "es"
          ? "Landeo mantiene tu perfil listo, descubre más vacantes compatibles y elimina pasos repetitivos para que puedas avanzar mucho más rápido."
          : "Landeo keeps your profile ready, finds more compatible roles and removes repetitive steps so you can move much faster."}
      </p>
      <small className="claim-note">{note}</small>
    </div>
  );
}
function Feasibility({
  locale,
  interviews,
  deadline,
  ambitious,
}: {
  locale: Locale;
  interviews: number;
  deadline: string;
  ambitious: boolean;
}) {
  const horizon = deadline.split("-")[0] || "3";
  return (
    <div className="validation-screen">
      <m.span
        className="validation-icon"
        initial={{ opacity: 0, scale: 0.45 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 230, damping: 16 }}
      >
        {ambitious ? "↗" : "✓"}
      </m.span>
      <p className="onboarding-eyebrow">
        {ambitious
          ? locale === "es"
            ? "UN OBJETIVO AMBICIOSO"
            : "AN AMBITIOUS TARGET"
          : locale === "es"
            ? "UN OBJETIVO REALISTA"
            : "A REALISTIC TARGET"}
      </p>
      <h1>
        {ambitious
          ? locale === "es"
            ? `${interviews} entrevistas por semana será difícil, pero Landeo puede ayudarte a acercarte.`
            : `${interviews} interviews a week will be difficult, but Landeo can help you get closer.`
          : locale === "es"
            ? `${interviews} entrevistas por semana en ${horizon} meses es un objetivo factible.`
            : `${interviews} interviews a week within ${horizon} months is a feasible target.`}
      </h1>
      <p className="onboarding-lead">
        {ambitious
          ? locale === "es"
            ? "Necesitarás ampliar el volumen sin perder relevancia. Landeo automatiza la búsqueda y la parte repetitiva para sostener ese ritmo."
            : "You’ll need more volume without losing relevance. Landeo automates discovery and repetitive application work to support that pace."
          : locale === "es"
            ? "Un proceso constante, buenas coincidencias y seguimiento claro te ayudarán a mantener el ritmo."
            : "A consistent process, strong matches and clear tracking can help you keep the pace."}
      </p>
      <div className="feasibility-meter">
        <m.i
          initial={{ width: 0 }}
          animate={{ width: ambitious ? "76%" : "58%" }}
          transition={{ duration: 0.75, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        />
        <span>
          {ambitious
            ? locale === "es"
              ? "EXIGENTE"
              : "DIFFICULT"
            : locale === "es"
              ? "REALISTA"
              : "REALISTIC"}
        </span>
      </div>
      <small className="claim-note">
        {locale === "es"
          ? "Landeo no garantiza entrevistas ni contrataciones."
          : "Landeo does not guarantee interviews or offers."}
      </small>
    </div>
  );
}
function Potential({ locale }: { locale: Locale }) {
  const heights = ["18%", "31%", "47%", "68%", "92%"];
  return (
    <div className="validation-screen potential-screen">
      <m.span
        className="validation-icon"
        initial={{ opacity: 0, scale: 0.4, rotate: -25 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 15 }}
      >
        ★
      </m.span>
      <p className="onboarding-eyebrow">
        {locale === "es"
          ? "TU PLAN ESTÁ CASI LISTO"
          : "YOUR PLAN IS ALMOST READY"}
      </p>
      <h1>
        {locale === "es"
          ? "Tienes un gran potencial. Puedes superar tu objetivo con Landeo."
          : "You have great potential. You can crush your goal with Landeo."}
      </h1>
      <p className="onboarding-lead">
        {locale === "es"
          ? "Tu perfil, tus preferencias y un proceso constante forman una combinación poderosa."
          : "Your profile, preferences and a consistent process are a powerful combination."}
      </p>
      <div className="growth-line">
        <m.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.75, type: "spring" }}
        >
          ↗
        </m.span>
        {heights.map((height, position) => (
          <m.i
            key={height}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.42, delay: 0.13 + position * 0.1 }}
            style={{ height, transformOrigin: "bottom" }}
          />
        ))}
      </div>
    </div>
  );
}
function Welcome({ locale }: { locale: Locale }) {
  const items =
    locale === "es"
      ? [
          "Accede a puestos que no aparecen en muchos portales.",
          "Automatiza la parte aburrida de buscar y enviar candidaturas.",
          "Libera tu potencial y gana el dinero que mereces.",
        ]
      : [
          "Access roles that don’t appear on the usual job boards.",
          "Automate the boring parts of finding and submitting applications.",
          "Unleash your potential and earn what you deserve.",
        ];
  return (
    <div className="welcome-screen">
      <m.div
        className="welcome-animation"
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.45 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 190, damping: 14 }}
      >
        <m.span
          initial={{ scale: 0, rotate: -35 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.12,
            type: "spring",
            stiffness: 230,
            damping: 14,
          }}
        >
          ✓
        </m.span>
        <m.i
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <m.i
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <m.i
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.1, delay: 0.2, repeat: Infinity }}
        />
      </m.div>
      <p className="onboarding-eyebrow">
        {locale === "es"
          ? "PERFIL COMPLETADO · BIENVENIDO A LANDEO"
          : "PROFILE COMPLETE · WELCOME TO LANDEO"}
      </p>
      <h1>
        {locale === "es"
          ? "Tu búsqueda de empleo acaba de cambiar."
          : "Your job search just changed."}
      </h1>
      <p className="onboarding-lead">
        {locale === "es"
          ? "Ya no tienes que seleccionar nada más. Tu perfil está listo para encontrar oportunidades."
          : "There’s nothing else to select. Your profile is ready to find opportunities."}
      </p>
      <m.ul
        className="welcome-benefits completion-list"
        variants={choiceListMotion}
        initial="hidden"
        animate="show"
      >
        {items.map((item, i) => (
          <m.li key={item} variants={choiceMotion} custom={i}>
            <i>✓</i>
            <strong>{item}</strong>
          </m.li>
        ))}
      </m.ul>
    </div>
  );
}
