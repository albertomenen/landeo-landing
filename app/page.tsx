import Link from "../components/SafeLink";

const pains = [
  "Volver a escribir tu experiencia",
  "Perder ofertas entre veinte pestañas",
  "Adaptar lo mismo una y otra vez",
  "No saber qué candidatura necesita tu atención",
];

const capabilities = [
  {
    number: "01",
    title: "Automática",
    text: "Cuando una oferta es compatible, Landeo prepara y envía la candidatura con los datos que ya aprobaste.",
    label: "Landeo se ocupa",
    className: "automatic",
  },
  {
    number: "02",
    title: "Asistida",
    text: "Si falta una respuesta o una decisión, te la mostramos de forma clara antes de continuar.",
    label: "Tú completas lo importante",
    className: "assisted",
  },
  {
    number: "03",
    title: "Externa",
    text: "Si la empresa exige terminar fuera, te llevamos al paso exacto y conservamos el seguimiento.",
    label: "Sin perder el hilo",
    className: "external",
  },
];

export default function Home() {
  return (
    <main className="landing-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Landeo, inicio">
          <span className="brand-mark">L</span><span>Landeo</span>
        </Link>
        <nav aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <Link href="/pricing">Precios</Link>
          <Link href="/login">Entrar</Link>
          <Link className="nav-cta" href="/signup">Empezar gratis</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> Tu búsqueda de empleo, por fin en movimiento</span>
          <h1>Deja de rellenar formularios. <em>Empieza a recibir respuestas.</em></h1>
          <p className="hero-lead">Landeo encuentra ofertas que encajan contigo y convierte un gesto en una candidatura preparada con tu perfil. Tú eliges el trabajo; nosotros quitamos lo repetitivo.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/signup">Crear mi perfil gratis <span>→</span></Link>
            <a className="button button-ghost" href="#como-funciona">Ver cómo funciona <span>↓</span></a>
          </div>
          <div className="trust-row" aria-label="Ventajas">
            <span>✓ Explorar es gratis</span><span>✓ Tú apruebas cada decisión</span><span>✓ Sin promesas vacías</span>
          </div>
        </div>

        <div className="hero-product-wrap">
          <span className="floating-note note-top">Oferta compatible encontrada <b>94%</b></span>
          <div className="product-preview" aria-label="Vista de ejemplo del feed de empleos">
            <div className="preview-top">
              <div><span className="preview-label">DESCUBRIR</span><strong>Una oferta cada vez</strong></div>
              <span className="match-chip">94% encaje</span>
            </div>
            <article className="job-card">
              <div className="job-company"><span className="company-logo">N</span><div><strong>Northstar</strong><span>Tecnología · Madrid · Híbrido</span></div><button aria-label="Guardar oferta">♡</button></div>
              <span className="sample-label">VISTA DE EJEMPLO</span>
              <h2>Product Designer</h2>
              <p>Convierte problemas complejos en experiencias simples para miles de personas.</p>
              <div className="tags"><span>Producto</span><span>€50k–€65k</span><span>3+ años</span></div>
              <div className="apply-mode"><b>✓</b><span><strong>Lista para revisar</strong><small>Tu perfil cubre la información necesaria.</small></span></div>
            </article>
            <div className="card-actions"><button className="pass" aria-label="Pasar oferta">×</button><button className="save" aria-label="Guardar oferta">♡</button><button className="apply" aria-label="Postularme a la oferta">Sí, me interesa <span>→</span></button></div>
            <p className="preview-hint">Izquierda para pasar · Derecha para avanzar</p>
          </div>
          <span className="floating-note note-bottom"><i>✓</i> Perfil reutilizado. Formulario evitado.</span>
        </div>
      </section>

      <section className="outcome-strip" aria-label="La propuesta de Landeo">
        <p>Menos formularios</p><i />
        <p>Más oportunidades relevantes</p><i />
        <p>Una búsqueda que sí puedes seguir</p>
      </section>

      <section className="pain-section section-shell">
        <div className="section-heading">
          <span className="section-kicker">ESTO NO DEBERÍA SEGUIR PASANDO</span>
          <h2>Buscar trabajo ya es un trabajo. <em>Landeo cambia esa parte.</em></h2>
        </div>
        <div className="pain-grid">
          <div className="pain-copy">
            <p>Tu tiempo debería ir a elegir bien, prepararte y hablar con empresas. No a copiar tu nombre, experiencia y disponibilidad en cada portal.</p>
            <Link className="text-link" href="/signup">Quiero dejar atrás los formularios <span>→</span></Link>
          </div>
          <div className="pain-list">
            {pains.map((pain, index) => <div key={pain}><b>{String(index + 1).padStart(2, "0")}</b><span>{pain}</span><i>×</i></div>)}
          </div>
        </div>
      </section>

      <section className="steps-section" id="como-funciona">
        <div className="section-shell">
          <div className="section-heading light">
            <span className="section-kicker">DE CERO A CANDIDATURA, SIN EL LABERINTO</span>
            <h2>Tres pasos. Un perfil. <em>Todo más claro.</em></h2>
          </div>
          <div className="steps-grid">
            <article><span>01</span><div className="step-icon">◎</div><h3>Cuéntanos qué buscas</h3><p>Completa una vez tu experiencia, preferencias y condiciones. Ese perfil viaja contigo.</p></article>
            <article><span>02</span><div className="step-icon">↕</div><h3>Decide con un gesto</h3><p>Revisa ofertas de una en una. Pasa las que no encajan y avanza con las que sí.</p></article>
            <article><span>03</span><div className="step-icon">✓</div><h3>Landeo hace el trabajo pesado</h3><p>Preparamos la candidatura y te avisamos solo cuando hace falta una respuesta tuya.</p></article>
          </div>
        </div>
      </section>

      <section className="control-section section-shell">
        <div className="control-copy">
          <span className="section-kicker">AUTOMATIZAR SIN PERDER EL CONTROL</span>
          <h2>No todas las candidaturas son iguales. <em>Landeo te lo dice antes.</em></h2>
          <p>Cada oferta muestra cómo puede tramitarse. Sin botones ambiguos, sin envíos silenciosos y sin hacerte creer que todos los portales funcionan igual.</p>
          <div className="control-promise"><b>Tu regla siempre manda</b><span>Nada avanza fuera de las preferencias y datos que has definido.</span></div>
        </div>
        <div className="capability-list">
          {capabilities.map((item) => (
            <article className={item.className} key={item.title}>
              <b>{item.number}</b><div><span>{item.label}</span><h3>{item.title}</h3><p>{item.text}</p></div><i>→</i>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-card">
          <div className="profile-copy">
            <span className="section-kicker">TU PERFIL UNIVERSAL</span>
            <h2>Lo cuentas una vez. <em>Landeo lo pone a trabajar.</em></h2>
            <p>Experiencia, estudios, disponibilidad y preferencias viven en un único lugar. Puedes revisar, corregir o borrar tus datos cuando quieras.</p>
            <ul><li><i>✓</i> Reutilizable en cada candidatura</li><li><i>✓</i> Editable en cualquier momento</li><li><i>✓</i> Visible antes de enviar</li></ul>
          </div>
          <div className="profile-preview" aria-label="Ejemplo de perfil universal">
            <div className="profile-preview-head"><span>AM</span><div><strong>Tu perfil profesional</strong><small>Listo para empezar</small></div><b>86%</b></div>
            <div className="profile-progress-bar"><i /></div>
            <div className="profile-fields"><span><b>Experiencia</b><small>3 puestos añadidos</small></span><i>✓</i></div>
            <div className="profile-fields"><span><b>Preferencias</b><small>Madrid · Híbrido · Producto</small></span><i>✓</i></div>
            <div className="profile-fields"><span><b>Respuestas frecuentes</b><small>Disponibilidad y condiciones</small></span><i>✓</i></div>
          </div>
        </div>
      </section>

      <section className="faq-section section-shell">
        <div className="section-heading compact"><span className="section-kicker">SIN LETRA PEQUEÑA</span><h2>Antes de dar el primer <em>sí.</em></h2></div>
        <div className="faq-list">
          <details open><summary>¿Landeo se postula sin que yo lo sepa?<span>+</span></summary><p>No. Tú marcas las ofertas que te interesan y defines tus preferencias. Si una candidatura necesita una respuesta o revisión, Landeo se detiene y te avisa.</p></details>
          <details><summary>¿Todas las ofertas permiten candidatura automática?<span>+</span></summary><p>No. Depende del portal y de los datos que solicite la empresa. Por eso indicamos si el proceso es automático, asistido o debe terminarse fuera de Landeo.</p></details>
          <details><summary>¿Puedo usar Landeo gratis?<span>+</span></summary><p>Sí. Puedes crear tu perfil y explorar ofertas gratis. Los planes y límites de candidatura están explicados de forma transparente en la página de precios.</p></details>
          <details><summary>¿Puedo cambiar o borrar mis datos?<span>+</span></summary><p>Sí. Tu perfil es editable y puedes gestionar tus datos desde tu cuenta. Tú mantienes el control sobre la información que utilizamos.</p></details>
        </div>
      </section>

      <section className="final-cta">
        <span className="section-kicker">TU PRÓXIMA OPORTUNIDAD NO NECESITA OTRO FORMULARIO</span>
        <h2>Haz sitio para las entrevistas.<br /><em>Landeo se ocupa del camino.</em></h2>
        <Link className="button button-lime" href="/signup">Empezar gratis <span>→</span></Link>
        <small>Crear el perfil no cuesta nada · Tú decides cuándo avanzar</small>
      </section>

      <footer className="site-footer">
        <div><Link className="brand" href="/"><span className="brand-mark">L</span><span>Landeo</span></Link><p>Buscar trabajo, sin repetir tu historia.</p></div>
        <nav aria-label="Enlaces del pie"><Link href="/pricing">Precios</Link><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link><Link href="/login">Entrar</Link></nav>
        <small>© 2026 Landeo</small>
      </footer>
    </main>
  );
}
