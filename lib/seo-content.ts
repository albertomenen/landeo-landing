export const SITE_ORIGIN = "https://getlandeo.com";
export const SEO_UPDATED = "2026-11-13";
export const SEO_UPDATED_LABEL = "13 de noviembre de 2026";

export type Faq = { q: string; a: string };

export type CoverLetterRole = {
  slug: string;
  role: string;            // "camarero"
  title: string;           // H1
  metaTitle: string;
  metaDescription: string;
  intro: string;
  audience: string;        // para quién es
  letter: string[];        // párrafos de la carta (incluyen saludo y despedida)
  tips: string[];
  mistakes: string[];
  faqs: Faq[];
};

const closing = "Quedo a su disposición para ampliar cualquier información en una entrevista.\n\nUn cordial saludo,\n[Tu nombre y apellidos] · [Teléfono] · [Email]";

export const coverLetterRoles: CoverLetterRole[] = [
  {
    slug: "camarero",
    role: "camarero",
    title: "Carta de presentación para camarero: ejemplo y guía",
    metaTitle: "Carta de presentación para camarero: ejemplo listo para copiar",
    metaDescription: "Ejemplo de carta de presentación para camarero, con estructura, consejos y errores a evitar. Adáptala a tu experiencia y envíala hoy.",
    intro: "En hostelería los responsables de contratación leen muy rápido. Una buena carta de presentación para camarero demuestra en pocas líneas que tienes experiencia de sala, que trabajas bien en equipo y que puedes cubrir los horarios que necesitan.",
    audience: "Sirve tanto si buscas tu primer puesto en sala como si ya has trabajado en restaurantes, bares, hoteles o catering.",
    letter: [
      "Estimado equipo de [Nombre del establecimiento]:",
      "Me llamo [Nombre] y me dirijo a ustedes para presentar mi candidatura al puesto de camarero/a publicado en [portal o canal]. Tengo [X años] de experiencia en sala, la última en [establecimiento anterior], donde atendía hasta [X] mesas por turno en servicio de comida y cena.",
      "Entre mis funciones estaban la toma de comandas, el servicio de bebidas, la atención directa al cliente y el cierre de caja. Estoy acostumbrado/a a trabajar bajo presión en horas punta, a mantener el buen trato con el cliente y a coordinarme con cocina y barra para que el servicio salga a tiempo.",
      "Tengo disponibilidad para trabajar fines de semana y festivos, y puedo incorporarme de forma inmediata. Valoro mucho su propuesta de [detalle concreto del local: carta, estilo, ubicación] y me gustaría aportar mi experiencia a su equipo.",
      closing,
    ],
    tips: [
      "Menciona el tipo de servicio que has hecho (carta, menú, banquetes, terraza) y el volumen aproximado de mesas o comensales.",
      "Indica disponibilidad real: turnos partidos, fines de semana, festivos y temporada alta. Es lo primero que suele filtrarse.",
      "Si hablas idiomas, ponlo en la carta con el nivel. En zonas turísticas pesa mucho.",
      "Habla de actitud con ejemplos breves: cómo gestionaste una queja o un servicio complicado.",
    ],
    mistakes: [
      "Escribir una carta genérica sin nombrar el local.",
      "Repetir el currículum en lugar de destacar lo más relevante para sala.",
      "Pasar de una página: en hostelería lo ideal son entre 150 y 220 palabras.",
    ],
    faqs: [
      { q: "¿Hace falta carta de presentación para un puesto de camarero?", a: "No siempre, pero un mensaje breve y personalizado te diferencia cuando hay muchas candidaturas. En muchos locales basta con un correo corto con tu CV y tu disponibilidad." },
      { q: "¿Qué pongo si no tengo experiencia como camarero?", a: "Habla de otras experiencias de atención al cliente, de tu disponibilidad y de tu capacidad de aprender rápido. Sé honesto: es preferible que la carta sea corta y verdadera." },
    ],
  },
  {
    slug: "administrativo",
    role: "administrativo",
    title: "Carta de presentación para administrativo: ejemplo y guía",
    metaTitle: "Carta de presentación para administrativo: ejemplo y consejos",
    metaDescription: "Ejemplo de carta de presentación para puestos administrativos: qué incluir, cómo destacar tus herramientas y errores comunes.",
    intro: "Un puesto administrativo se gana demostrando orden, fiabilidad y dominio de herramientas. Tu carta debe dejar claro que sabes gestionar documentación, atender a clientes o proveedores y manejar el software que usan en la empresa.",
    audience: "Útil para auxiliar administrativo, administrativo contable, recepción y back office.",
    letter: [
      "Estimado/a [Nombre del responsable]:",
      "Le escribo para presentar mi candidatura al puesto de administrativo/a en [Empresa]. Cuento con [X años] de experiencia en tareas administrativas en [sector], donde me encargaba de la gestión de facturas, la atención telefónica y por correo, y el archivo y control de documentación.",
      "Manejo con soltura Excel (tablas dinámicas y fórmulas habituales), el paquete Office y programas de gestión como [A3, Sage, SAP u otro]. En mi último puesto reduje el tiempo de cierre mensual de facturas organizando un seguimiento semanal de pendientes.",
      "Me considero una persona metódica, con buena comunicación y capacidad para priorizar cuando hay varias tareas a la vez. Me interesa [Empresa] por [motivo concreto] y creo que puedo aportar orden y fiabilidad al día a día del departamento.",
      closing,
    ],
    tips: [
      "Nombra las herramientas exactas que aparecen en la oferta (Excel, SAP, A3, Sage, CRM).",
      "Cuantifica: facturas gestionadas, proveedores atendidos, tiempo ahorrado. Una cifra vale más que un adjetivo.",
      "Menciona idiomas y nivel si la empresa trabaja con clientes internacionales.",
      "Mantén un tono profesional y sencillo, sin frases hechas.",
    ],
    mistakes: [
      "Decir que eres «organizado» sin una prueba concreta.",
      "No adaptar la carta al sector (no es lo mismo una gestoría que una empresa logística).",
      "Errores ortográficos: en este puesto se interpretan como falta de cuidado.",
    ],
    faqs: [
      { q: "¿Qué debe incluir una carta para un puesto administrativo?", a: "Quién eres y a qué puesto te presentas, tu experiencia más relevante, las herramientas que dominas, un logro concreto y por qué te interesa esa empresa." },
      { q: "¿Cuánto debe ocupar?", a: "Entre 180 y 250 palabras, en tres o cuatro párrafos cortos." },
    ],
  },
  {
    slug: "enfermeria",
    role: "enfermero/a",
    title: "Carta de presentación para enfermería: ejemplo y guía",
    metaTitle: "Carta de presentación para enfermería: ejemplo y estructura",
    metaDescription: "Ejemplo de carta de presentación para enfermeros y enfermeras: cómo destacar tu experiencia clínica, tus áreas y tu disponibilidad.",
    intro: "En enfermería la carta complementa un currículum muy técnico. Sirve para mostrar tu enfoque con el paciente, las áreas en las que has trabajado y tu disponibilidad para turnos, que suele ser decisiva.",
    audience: "Para graduados/as en enfermería y profesionales con experiencia en hospital, atención primaria, residencias o clínicas privadas.",
    letter: [
      "Estimado equipo de Recursos Humanos de [Centro]:",
      "Soy [Nombre], graduado/a en Enfermería por [Universidad] y colegiado/a con el número [N.º]. Me dirijo a ustedes para optar al puesto de enfermero/a en [servicio o unidad].",
      "He trabajado durante [X años] en [hospital, centro o residencia], principalmente en [unidades: urgencias, planta, UCI, geriatría], donde realizaba valoración y seguimiento de pacientes, administración de medicación, curas y registro en [sistema de historia clínica]. Conozco los protocolos de seguridad del paciente y trabajo habitualmente en turnos rotativos, incluidas noches y fines de semana.",
      "Me caracterizo por el trato cercano con el paciente y la familia y por la comunicación clara con el resto del equipo asistencial. Dispongo de [formación complementaria: SVB/SVA, curso de cuidados paliativos, idiomas] y de disponibilidad [inmediata o fecha].",
      closing,
    ],
    tips: [
      "Indica número de colegiado, titulación y formación acreditada (SVB, SVA u otras) al principio.",
      "Enumera las unidades donde has trabajado y el tipo de pacientes.",
      "Deja clara la disponibilidad de turnos, incluidas noches, festivos y sustituciones.",
      "Si buscas tu primer puesto, destaca tus prácticas clínicas y las unidades por las que rotaste.",
    ],
    mistakes: [
      "Omitir el número de colegiado o la fecha de disponibilidad.",
      "Incluir datos identificables de pacientes o casos reales.",
      "Usar solo lenguaje técnico y olvidar el componente humano de la profesión.",
    ],
    faqs: [
      { q: "¿Qué pongo si acabo de terminar el grado?", a: "Destaca tus prácticas clínicas, las unidades donde rotaste, las competencias que desarrollaste y tu disponibilidad. Añade cursos complementarios si los tienes." },
      { q: "¿Es necesaria en el sector público?", a: "En procesos públicos suele valorarse el baremo y no la carta. En centros privados, residencias y bolsas de trabajo sí puede marcar la diferencia." },
    ],
  },
  {
    slug: "programador",
    role: "programador/a",
    title: "Carta de presentación para programador: ejemplo y guía",
    metaTitle: "Carta de presentación para programador y desarrollador: ejemplo",
    metaDescription: "Ejemplo de carta de presentación para desarrolladores: cómo destacar proyectos, stack y resultados sin copiar el currículum.",
    intro: "Quien contrata a un desarrollador quiere ver qué has construido, con qué tecnología y qué impacto tuvo. La carta es el lugar para contarlo en tres frases claras, enlazando tu GitHub o portfolio.",
    audience: "Para desarrolladores front-end, back-end, full-stack y perfiles junior que buscan su primera oportunidad.",
    letter: [
      "Hola [Nombre]:",
      "Me llamo [Nombre] y te escribo por la vacante de desarrollador/a [front-end / back-end / full-stack] en [Empresa]. Llevo [X años] trabajando con [stack: TypeScript, React, Node.js, PostgreSQL], y en [empresa o proyecto anterior] fui responsable de [módulo o funcionalidad concreta].",
      "Un ejemplo reciente: [describe un logro medible, como reducir el tiempo de carga de una página un 40 %, migrar un servicio a otra arquitectura o lanzar una funcionalidad usada por X usuarios]. Me gusta escribir código mantenible, revisar el de mis compañeros y documentar lo necesario para que otros puedan continuar el trabajo.",
      "He visto que en [Empresa] trabajáis con [tecnología o producto] y me interesa [motivo real]. Puedes ver mi trabajo en [enlace a GitHub o portfolio]. Estaré encantado/a de comentarlo en una entrevista técnica.",
      "Un saludo,\n[Tu nombre] · [Email] · [Enlace]",
    ],
    tips: [
      "Enlaza tu GitHub, portfolio o proyecto en producción: es más convincente que cualquier adjetivo.",
      "Prioriza las tecnologías que aparecen en la oferta, no una lista completa de todo lo que conoces.",
      "Cuenta un logro con un número: rendimiento, usuarios, tiempo ahorrado, errores reducidos.",
      "Si eres junior, habla de proyectos propios, prácticas y cómo aprendes, sin exagerar el nivel.",
    ],
    mistakes: [
      "Listar veinte tecnologías sin contexto.",
      "Copiar frases de plantillas que podrían servir para cualquier empresa.",
      "No incluir ningún enlace verificable a tu trabajo.",
    ],
    faqs: [
      { q: "¿Una carta de presentación es útil para programadores?", a: "Sí cuando es corta y concreta. Muchas empresas tecnológicas leen más el GitHub que la carta, pero un mensaje claro ayuda a que revisen tu candidatura con atención." },
      { q: "¿Cómo la escribo si soy junior?", a: "Muestra proyectos propios, cómo resolviste problemas reales y qué estás aprendiendo. Una candidatura honesta y bien explicada compensa la falta de años de experiencia." },
    ],
  },
  {
    slug: "marketing-digital",
    role: "especialista en marketing digital",
    title: "Carta de presentación para marketing digital: ejemplo y guía",
    metaTitle: "Carta de presentación para marketing digital: ejemplo y claves",
    metaDescription: "Ejemplo de carta de presentación para marketing digital: cómo mostrar resultados, métricas y herramientas en pocas líneas.",
    intro: "En marketing digital los resultados hablan más que los títulos. Tu carta debe mostrar qué canales dominas, qué métricas has movido y qué herramientas utilizas, con ejemplos que el reclutador pueda comprobar.",
    audience: "Para perfiles de SEO, paid media, redes sociales, email marketing, contenidos y marketing de producto.",
    letter: [
      "Estimado/a [Nombre]:",
      "Me presento para el puesto de [especialista en marketing digital / SEO / paid media] en [Empresa]. Tengo [X años] de experiencia gestionando [canales: Google Ads, Meta Ads, SEO, email], y en [empresa anterior] gestioné un presupuesto mensual de [X €] con un ROAS medio de [X].",
      "Entre mis resultados, destaco [logro 1: aumentar el tráfico orgánico un X % en seis meses] y [logro 2: reducir el coste por lead un X %]. Trabajo con Google Analytics 4, Search Console, [herramienta SEO o de automatización] y me apoyo en los datos para decidir qué probar y qué abandonar.",
      "Me interesa [Empresa] porque [observación concreta sobre su marca, producto o campañas]. Creo que podría contribuir con [idea o área de mejora específica]. Estaré encantado/a de comentar mi enfoque en una entrevista.",
      closing,
    ],
    tips: [
      "Incluye al menos dos métricas reales: crecimiento, conversión, coste por adquisición o ROAS.",
      "Menciona las herramientas por su nombre y el tipo de cuenta o presupuesto que gestionaste.",
      "Muestra que has mirado la empresa: una observación concreta sobre su web o campañas marca la diferencia.",
      "Si no puedes compartir cifras exactas por confidencialidad, usa porcentajes o rangos.",
    ],
    mistakes: [
      "Hablar de «pasión por el marketing» sin resultados.",
      "Inventar o inflar métricas: pueden pedirte que las expliques.",
      "No adaptar la carta al canal que busca la empresa.",
    ],
    faqs: [
      { q: "¿Qué métricas conviene incluir?", a: "Las que se relacionan con el puesto: tráfico y posiciones en SEO, coste por lead y ROAS en paid, tasa de apertura y conversión en email. Elige dos o tres relevantes." },
      { q: "¿Y si estoy empezando?", a: "Habla de proyectos propios, cursos con práctica, cuentas que has gestionado como voluntario/a y lo que mediste. Lo importante es que puedas explicar el proceso." },
    ],
  },
  {
    slug: "atencion-al-cliente",
    role: "atención al cliente",
    title: "Carta de presentación para atención al cliente: ejemplo y guía",
    metaTitle: "Carta de presentación para atención al cliente: ejemplo",
    metaDescription: "Ejemplo de carta de presentación para atención al cliente: cómo demostrar empatía, resolución y manejo de herramientas.",
    intro: "Un puesto de atención al cliente exige comunicación clara, paciencia y capacidad de resolver. La carta es tu primera muestra de cómo te expresas: debe ser cercana, ordenada y concreta.",
    audience: "Para call center, soporte por chat o correo, atención en tienda y customer success.",
    letter: [
      "Estimado equipo de [Empresa]:",
      "Me dirijo a ustedes para presentar mi candidatura al puesto de atención al cliente. Cuento con [X años] de experiencia atendiendo clientes por teléfono, chat y correo en [sector], con un volumen aproximado de [X] contactos diarios.",
      "He trabajado con [CRM o herramienta: Zendesk, Freshdesk, Salesforce] y estoy acostumbrado/a a resolver incidencias en el primer contacto, escalar casos cuando corresponde y mantener la calma con clientes molestos. En mi puesto anterior alcancé una valoración media de satisfacción de [X] sobre [X].",
      "Hablo [idiomas y nivel] y tengo disponibilidad para trabajar en [turnos]. Me motiva [Empresa] porque [motivo], y me gustaría aportar mi experiencia a su equipo.",
      closing,
    ],
    tips: [
      "Indica canales (teléfono, chat, email) y volumen de contactos.",
      "Incluye una métrica de calidad: satisfacción, tiempo medio de respuesta o resolución en el primer contacto.",
      "Los idiomas y los turnos disponibles suelen ser criterios de selección.",
      "Cuenta brevemente cómo resolviste un caso difícil.",
    ],
    mistakes: [
      "Escribir con un tono frío o excesivamente formal.",
      "No mencionar ninguna herramienta de gestión.",
      "Hablar de empatía sin ningún ejemplo.",
    ],
    faqs: [
      { q: "¿Qué cualidades destacar?", a: "Comunicación clara, empatía, resolución de problemas, gestión de la presión y manejo de herramientas. Apóyalas siempre con un ejemplo." },
      { q: "¿Sirve si no tengo experiencia?", a: "Sí. Habla de situaciones donde atendiste a personas, como trabajos temporales, voluntariado o prácticas, y de tu disponibilidad y ganas de aprender." },
    ],
  },
  {
    slug: "dependiente",
    role: "dependiente/a de tienda",
    title: "Carta de presentación para dependiente: ejemplo y guía",
    metaTitle: "Carta de presentación para dependiente de tienda: ejemplo",
    metaDescription: "Ejemplo de carta de presentación para dependiente o comercial de tienda: ventas, atención y disponibilidad.",
    intro: "En comercio minorista se valora el trato al cliente, la capacidad de venta y la flexibilidad horaria. Tu carta debe transmitir energía y mostrar resultados, aunque sean pequeños.",
    audience: "Para moda, alimentación, tecnología, cosmética y grandes superficies.",
    letter: [
      "Estimado equipo de [Tienda o marca]:",
      "Me llamo [Nombre] y me gustaría optar al puesto de dependiente/a en su tienda de [ubicación]. Tengo [X años] de experiencia en comercio, donde me encargaba de la atención al cliente, la reposición, el cobro en caja y el cuidado del escaparate.",
      "En [tienda anterior] superé de forma habitual los objetivos de venta del equipo y recibí reconocimiento por la atención a los clientes. Me adapto bien a campañas de alta afluencia como rebajas o Navidad y disfruto asesorando para encontrar el producto adecuado.",
      "Conozco su marca como cliente y me atrae [detalle concreto]. Dispongo de flexibilidad horaria, incluidos fines de semana y festivos. Quedo a su disposición para una entrevista.",
      closing,
    ],
    tips: [
      "Menciona tus ventas, objetivos cumplidos o reconocimientos si los hay.",
      "Demuestra que conoces la marca o el tipo de producto.",
      "Resalta flexibilidad en horarios, campañas y fines de semana.",
      "Indica si manejas TPV, inventario o gestión de stock.",
    ],
    mistakes: [
      "No concretar la tienda ni la marca.",
      "Quedarte solo en «trato amable» sin ejemplos.",
      "Extenderte demasiado: una página es suficiente.",
    ],
    faqs: [
      { q: "¿Qué valoran más en una tienda?", a: "Actitud, disponibilidad, experiencia con clientes y capacidad de venta. Si los tienes, muéstralos con un ejemplo concreto." },
      { q: "¿Puedo enviarla por correo con el CV?", a: "Sí. Pon el puesto y la tienda en el asunto y copia el texto en el cuerpo del mensaje; adjunta el CV en PDF." },
    ],
  },
  {
    slug: "sin-experiencia",
    role: "primer empleo sin experiencia",
    title: "Carta de presentación sin experiencia: ejemplo y guía",
    metaTitle: "Carta de presentación sin experiencia laboral: ejemplo",
    metaDescription: "Cómo escribir una carta de presentación sin experiencia: qué destacar, ejemplo completo y errores a evitar en tu primer empleo.",
    intro: "No tener experiencia laboral no significa no tener nada que ofrecer. Tu carta debe mover el foco de «lo que me falta» a lo que sí aportas: formación, proyectos, voluntariado, idiomas, actitud y disponibilidad.",
    audience: "Para estudiantes, recién titulados, personas que cambian de sector y quienes buscan su primer trabajo.",
    letter: [
      "Estimado/a [Nombre o equipo de selección]:",
      "Me llamo [Nombre] y le escribo para presentar mi candidatura al puesto de [puesto] en [Empresa]. Aunque estoy iniciando mi trayectoria profesional, cuento con formación en [estudios] y con experiencia práctica a través de [prácticas, proyecto académico, voluntariado o trabajo temporal].",
      "En [proyecto o actividad], me encargué de [tarea concreta] y aprendí a [habilidad: organizar, comunicar, trabajar con plazos]. También manejo [herramientas o idiomas] y me adapto con rapidez a entornos nuevos.",
      "Me interesa [Empresa] porque [motivo específico] y quiero crecer en [área]. Tengo plena disponibilidad [horarios] y mucha motivación para aprender. Agradezco su tiempo y quedo a su disposición para una entrevista.",
      closing,
    ],
    tips: [
      "Convierte actividades no laborales en ejemplos: proyectos universitarios, voluntariado, asociaciones, trabajos puntuales.",
      "Destaca habilidades demostrables: idiomas, herramientas, certificados, portfolio.",
      "Sé específico sobre por qué quieres ese puesto y esa empresa.",
      "Muestra disponibilidad y actitud de aprendizaje sin exagerar tu nivel.",
    ],
    mistakes: [
      "Empezar disculpándote por no tener experiencia.",
      "Usar frases vacías como «soy muy trabajador» sin ningún ejemplo.",
      "Enviar la misma carta a todas las ofertas.",
    ],
    faqs: [
      { q: "¿Qué pongo si no tengo experiencia?", a: "Formación, prácticas, proyectos, voluntariado, idiomas, herramientas y habilidades con un ejemplo cada una. Todo lo que puedas demostrar cuenta." },
      { q: "¿Es mejor una carta corta?", a: "Sí. Entre 150 y 200 palabras, centradas en lo que aportas y en por qué esa empresa." },
    ],
  },
  {
    slug: "disenador",
    role: "diseñador/a",
    title: "Carta de presentación para diseñador: ejemplo y guía",
    metaTitle: "Carta de presentación para diseñador gráfico o UX: ejemplo",
    metaDescription: "Ejemplo de carta de presentación para diseñadores gráficos y de producto: portfolio, proceso y resultados.",
    intro: "A un diseñador se le contrata por su criterio y su portfolio. La carta debe ser breve, bien escrita y llevar al reclutador directamente a tu mejor trabajo, explicando el problema que resolviste y el resultado.",
    audience: "Para diseño gráfico, UI/UX, producto y branding.",
    letter: [
      "Hola [Nombre]:",
      "Soy [Nombre], diseñador/a [gráfico / UI-UX / de producto], y te escribo por la vacante en [Empresa]. Tengo [X años] de experiencia diseñando [tipo de proyectos], con herramientas como Figma, [Adobe Suite u otras].",
      "Un proyecto que resume mi forma de trabajar es [nombre del proyecto]: partí de [problema], investigué con [método] y llegué a [solución], que logró [resultado medible, como más conversión o menos abandono]. Me gusta colaborar con producto y desarrollo desde el inicio.",
      "Puedes ver mi portfolio en [enlace]. Me atrae [Empresa] por [motivo concreto] y creo que puedo aportar en [área]. Estaré encantado/a de recorrer el proceso de cualquier proyecto en una entrevista.",
      "Un saludo,\n[Tu nombre] · [Email] · [Portfolio]",
    ],
    tips: [
      "Enlaza al proyecto más relevante para la oferta, no al portfolio entero.",
      "Explica el problema, tu rol y el resultado, no solo el aspecto visual.",
      "Cuida el diseño y la ortografía de la propia carta: también se evalúa.",
      "Menciona herramientas y metodologías: Figma, design systems, testeo con usuarios.",
    ],
    mistakes: [
      "Enviar un portfolio sin explicar cuál es tu rol en cada pieza.",
      "Hablar de creatividad sin mostrar ningún resultado.",
      "Adjuntar archivos muy pesados en lugar de un enlace.",
    ],
    faqs: [
      { q: "¿Debo adjuntar el portfolio?", a: "Mejor un enlace directo al trabajo más relevante. Los archivos pesados suelen generar problemas en los sistemas de selección." },
      { q: "¿Qué incluir si soy junior?", a: "Proyectos personales o académicos bien explicados, con tu proceso y lo que aprendiste. Muestra criterio y capacidad de mejora." },
    ],
  },
  {
    slug: "comercial",
    role: "comercial",
    title: "Carta de presentación para comercial y ventas: ejemplo",
    metaTitle: "Carta de presentación para comercial o ventas: ejemplo",
    metaDescription: "Ejemplo de carta de presentación para puestos comerciales: cómo demostrar resultados, cartera y cumplimiento de objetivos.",
    intro: "En ventas se contrata a quien consigue resultados. Tu carta debe parecer una buena propuesta comercial: clara, enfocada en el cliente y apoyada en cifras de objetivos cumplidos.",
    audience: "Para ejecutivos de cuentas, SDR/BDR, comerciales B2B y B2C.",
    letter: [
      "Estimado/a [Nombre]:",
      "Le escribo para presentar mi candidatura al puesto de comercial en [Empresa]. Tengo [X años] de experiencia en ventas [B2B / B2C] en [sector], donde cerré un [X %] de cumplimiento de objetivo de media y gestioné una cartera de [X] clientes.",
      "Mis logros incluyen [logro 1: captar X cuentas nuevas en un trimestre] y [logro 2: aumentar la facturación de la cartera un X %]. Trabajo con [CRM: HubSpot, Salesforce], preparo cada reunión según las necesidades del cliente y hago seguimiento de forma ordenada.",
      "Conozco [Empresa] por [motivo] y creo que mi experiencia en [área] encaja con lo que buscan. Estaré encantado/a de explicarle cómo trabajo en una entrevista.",
      closing,
    ],
    tips: [
      "Pon cifras: porcentaje de objetivo, facturación, número de cuentas captadas.",
      "Indica el tipo de ciclo de venta y el perfil de cliente con el que has trabajado.",
      "Menciona el CRM y las herramientas de prospección que utilizas.",
      "Muestra que has investigado la empresa y su mercado.",
    ],
    mistakes: [
      "Hablar de «don de gentes» sin resultados.",
      "No concretar el tipo de venta ni el sector.",
      "Omitir el cumplimiento de objetivos.",
    ],
    faqs: [
      { q: "¿Qué datos son más importantes?", a: "El porcentaje de cumplimiento de objetivo, el volumen de ventas y los clientes captados, siempre que los puedas explicar." },
      { q: "¿Cómo la escribo si no tengo cifras?", a: "Cuenta situaciones de venta concretas, como un cliente que captaste o una negociación que cerraste, y el proceso que seguiste." },
    ],
  },
];

export type Comparison = {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  title: string;
  intro: string;
  what: string;      // qué es la alternativa
  rows: Array<[string, string, string]>; // criterio, Landeo, alternativa
  chooseOther: string[];
  chooseLandeo: string[];
  faqs: Faq[];
};

export const comparisons: Comparison[] = [
  {
    slug: "landeo-vs-infojobs",
    name: "InfoJobs",
    title: "Landeo vs InfoJobs: ¿cuál te conviene para buscar trabajo?",
    metaTitle: "Landeo vs InfoJobs: diferencias para buscar trabajo",
    metaDescription: "Comparativa honesta entre Landeo e InfoJobs: qué hace cada uno, en qué se diferencian y cuándo usar uno, otro o los dos.",
    intro: "Landeo e InfoJobs no hacen exactamente lo mismo. InfoJobs es un portal de empleo donde las empresas publican ofertas y tú te inscribes. Landeo es una herramienta que te ayuda a preparar y enviar candidaturas con un único perfil. Muchas personas usan ambos.",
    what: "InfoJobs es uno de los portales de empleo más conocidos en España: reúne ofertas de empresas, permite crear un CV en la plataforma e inscribirte en cada vacante.",
    rows: [
      ["Qué es", "Herramienta para preparar y enviar candidaturas con un perfil universal", "Portal de ofertas de empleo con CV propio"],
      ["Cómo aplicas", "Un perfil reutilizable; Landeo prepara la candidatura y te avisa solo cuando necesita una decisión tuya", "Te inscribes oferta a oferta desde la plataforma, o la empresa te redirige a su web"],
      ["Control", "Tú eliges las ofertas y defines tus reglas; indica si el envío es automático, asistido o externo", "Tú gestionas manualmente cada inscripción"],
      ["Carta y CV", "Prepara un CV y una carta adaptados a cada oferta", "Usas el CV que subes al portal; la adaptación la haces tú"],
      ["Precio", "Explorar es gratis; planes de pago desde 14,99 €/mes según volumen de candidaturas", "Consulta las condiciones actuales en su web"],
    ],
    chooseOther: [
      "Quieres un portal amplio con muchas ofertas de empresas españolas.",
      "Prefieres inscribirte tú mismo/a, oferta a oferta, y revisar cada proceso.",
      "Solo vas a enviar unas pocas candidaturas.",
    ],
    chooseLandeo: [
      "Estás enviando muchas candidaturas y te cansa repetir los mismos datos.",
      "Quieres que el CV y la carta se adapten a cada oferta sin empezar de cero.",
      "Necesitas seguimiento en un solo panel de todas las candidaturas.",
    ],
    faqs: [
      { q: "¿Landeo sustituye a InfoJobs?", a: "No necesariamente. Son herramientas distintas: un portal de ofertas y una herramienta para preparar y gestionar candidaturas. Puedes usar ambos." },
      { q: "¿Es gratis?", a: "Crear tu perfil y explorar ofertas en Landeo es gratis. Los planes de pago se basan en el número de candidaturas." },
    ],
  },
  {
    slug: "landeo-vs-linkedin",
    name: "LinkedIn",
    title: "Landeo vs LinkedIn: ¿cuál usar para encontrar empleo?",
    metaTitle: "Landeo vs LinkedIn: ¿qué usar para buscar trabajo?",
    metaDescription: "Diferencias entre Landeo y LinkedIn para buscar trabajo: red profesional frente a herramienta de candidaturas. Cuándo usar cada una.",
    intro: "LinkedIn es una red profesional donde también se publican ofertas. Landeo se centra en una tarea concreta: preparar y enviar candidaturas sin repetir formularios. No compiten del todo: se complementan.",
    what: "LinkedIn es una red social profesional. Permite construir tu perfil, conectar con otras personas, seguir empresas y ver ofertas; algunas se solicitan en la propia plataforma y otras en la web de la empresa.",
    rows: [
      ["Qué es", "Herramienta para preparar y enviar candidaturas", "Red profesional con ofertas, contactos y contenidos"],
      ["Cómo aplicas", "Perfil universal reutilizable; Landeo prepara la candidatura", "Solicitud sencilla en la plataforma o redirección a la web de la empresa"],
      ["Networking", "No es su foco", "Su gran punto fuerte: contactos, recomendaciones y mensajes directos"],
      ["Adaptación", "CV y carta adaptados a cada oferta", "Perfil único; el CV y la carta los adaptas tú"],
      ["Seguimiento", "Panel de candidaturas con estados", "Listado de ofertas solicitadas"],
    ],
    chooseOther: [
      "Quieres construir marca personal y contactos en tu sector.",
      "Buscas que reclutadores te encuentren por tu perfil.",
      "Necesitas descubrir empresas y personas relevantes.",
    ],
    chooseLandeo: [
      "Quieres ahorrar tiempo en cada candidatura.",
      "Prefieres un CV y una carta preparados para cada oferta.",
      "Quieres seguir todas tus candidaturas en un único lugar.",
    ],
    faqs: [
      { q: "¿Puedo usar Landeo y LinkedIn a la vez?", a: "Sí. LinkedIn sirve para tu red y tu visibilidad; Landeo, para gestionar y enviar candidaturas." },
      { q: "¿Landeo envía candidaturas dentro de LinkedIn?", a: "Landeo indica en cada oferta si el proceso puede ser automático, asistido o externo, según lo que permita la empresa." },
    ],
  },
  {
    slug: "landeo-vs-sprout",
    name: "Sprout",
    title: "Landeo vs Sprout: comparativa de herramientas de candidaturas con IA",
    metaTitle: "Landeo vs Sprout: comparativa de apps de candidaturas con IA",
    metaDescription: "Comparativa entre Landeo y Sprout, dos herramientas de candidaturas con IA: enfoque, control, idioma y precios.",
    intro: "Landeo y Sprout pertenecen a la misma categoría: herramientas con IA que ayudan a enviar candidaturas. Cambian el enfoque, el idioma, el control que te dan y el modelo de precios. Esta comparativa resume las diferencias principales con la información pública disponible.",
    what: "Sprout es una aplicación de búsqueda de empleo con IA, de pago por suscripción, que según su ficha en la App Store envía candidaturas en la web de la empresa y permite revisar antes.",
    rows: [
      ["Enfoque", "Pensada para buscar trabajo en español, con flujos y ofertas pensados para España", "Consulta en su web los mercados y países que cubre"],
      ["Control", "Tres modos por oferta (automático, asistido, externo) y te avisa si hace falta una decisión", "Permite revisar antes de enviar o saltarse la revisión"],
      ["Carta y CV", "CV y carta adaptados a cada oferta", "CV y carta adaptados, según su información pública"],
      ["Precio", "Explorar gratis; 14,99 €/mes (50 candidaturas), 34,99 €/mes (200) o 89,99 € por 3 meses (600)", "Suscripción de pago; consulta precios vigentes en su web o en la App Store"],
      ["Idioma", "Español e inglés", "Consulta los idiomas disponibles en su web"],
    ],
    chooseOther: [
      "Prefieres una aplicación móvil con sistema de swipe para ver ofertas.",
      "Ya la usas y su flujo te encaja.",
    ],
    chooseLandeo: [
      "Buscas trabajo en España o en español.",
      "Quieres precios por volumen claros y saber el límite de candidaturas.",
      "Quieres decidir en qué ofertas y de qué manera se envía cada candidatura.",
    ],
    faqs: [
      { q: "¿Cuál es mejor?", a: "Depende de dónde busques trabajo y de cómo quieras trabajar. Landeo está pensada para buscar trabajo en español; revisa la web actual de Sprout para ver sus funciones vigentes." },
      { q: "¿Estas herramientas garantizan entrevistas?", a: "Ninguna puede garantizarlas. Ahorran tiempo en el proceso, pero el resultado depende de tu perfil, del mercado y de la oferta." },
    ],
  },
];

export const coverLetterGeneral = {
  structure: [
    ["Saludo", "Dirígete a una persona o a un equipo concreto. Si no conoces el nombre, usa «Estimado equipo de [Empresa]»."],
    ["Presentación", "En una frase: quién eres, a qué puesto te presentas y dónde viste la oferta."],
    ["Lo que aportas", "Tu experiencia más relevante para esta oferta, con un logro o dato concreto."],
    ["Por qué esta empresa", "Una razón específica y verdadera por la que quieres trabajar allí."],
    ["Cierre", "Disponibilidad, agradecimiento y una invitación clara a hablar."],
  ] as Array<[string, string]>,
  faqs: [
    { q: "¿Cuánto debe durar una carta de presentación?", a: "Entre 150 y 300 palabras: tres o cuatro párrafos cortos que quepan en una pantalla." },
    { q: "¿Se puede usar IA para escribirla?", a: "Sí, como borrador. Revisa siempre que los datos sean verdaderos y que el texto suene a ti, y adáptala a cada oferta." },
    { q: "¿Se envía en el cuerpo del correo o en adjunto?", a: "Lo más práctico es pegarla en el cuerpo del correo y adjuntar tu CV en PDF. Algunos portales piden subirla como archivo." },
    { q: "¿Es obligatoria?", a: "No siempre, pero cuando la oferta la pide o hay mucha competencia, una carta personalizada mejora tus opciones." },
  ] as Faq[],
};

export function roleBySlug(slug: string) { return coverLetterRoles.find((x) => x.slug === slug); }
export function comparisonBySlug(slug: string) { return comparisons.find((x) => x.slug === slug); }

export function sitemapEntries() {
  const base: Array<{ path: string; priority: string }> = [
    { path: "/", priority: "1.0" },
    { path: "/pricing", priority: "0.8" },
    { path: "/carta-de-presentacion", priority: "0.9" },
    { path: "/comparativas", priority: "0.8" },
    { path: "/support", priority: "0.4" },
  ];
  return [
    ...base,
    ...coverLetterRoles.map((r) => ({ path: `/carta-de-presentacion/${r.slug}`, priority: "0.8" })),
    ...comparisons.map((c) => ({ path: `/comparativas/${c.slug}`, priority: "0.7" })),
  ];
}
