import Link from "next/link";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Landeo, inicio">
          <span className="brand-mark">L</span><span>Landeo</span>
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/pricing">Precios</Link><Link href="/login">Entrar</Link>
          <Link className="nav-cta" href="/signup">Crear perfil</Link>
        </nav>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> Buscar trabajo, sin repetir formularios</span>
          <h1>Tu próximo trabajo empieza con un <em>sí.</em></h1>
          <p>Descubre ofertas que encajan contigo, guarda tus favoritas y postúlate con un único perfil universal. Tú decides cada candidatura.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/signup">Crear mi perfil gratis <span>→</span></Link>
            <Link className="button button-ghost" href="/app/jobs">Ver cómo funciona</Link>
          </div>
          <div className="trust-row" aria-label="Ventajas"><span>✓ Explorar es gratis</span><span>✓ Tus datos, bajo control</span><span>✓ Sin candidaturas falsas</span></div>
        </div>
        <div className="product-preview" aria-label="Vista previa del feed de empleos">
          <div className="preview-top"><div><span className="preview-label">Para ti</span><strong>18 ofertas nuevas</strong></div><span className="match-chip">92% match</span></div>
          <article className="job-card">
            <div className="job-company"><span className="company-logo">C</span><div><strong>Clarity AI</strong><span>Impact Tech · Madrid</span></div><button aria-label="Guardar oferta">♡</button></div>
            <h2>Senior Product Designer</h2>
            <p>Diseña experiencias de producto que ayuden a inversores y empresas a entender su impacto.</p>
            <div className="tags"><span>Híbrido</span><span>€55k–€70k</span><span>Senior</span></div>
            <div className="apply-mode"><b>↗</b><span><strong>Candidatura asistida</strong><small>Landeo prepara los campos y te avisa si falta algo.</small></span></div>
          </article>
          <div className="card-actions"><button className="pass" aria-label="Pasar oferta">×</button><button className="save" aria-label="Guardar oferta">♡</button><button className="apply" aria-label="Postularme a la oferta">Postularme <span>→</span></button></div>
          <p className="preview-hint">Usa ← para pasar · → para postularte</p>
        </div>
      </section>
      <section className="proof-strip" aria-label="Proceso de Landeo">
        <div><b>01</b><span><strong>Crea tu perfil</strong><small>Una sola vez</small></span></div>
        <div><b>02</b><span><strong>Descubre ofertas</strong><small>Ordenadas para ti</small></span></div>
        <div><b>03</b><span><strong>Decide y postúlate</strong><small>Siempre con control</small></span></div>
      </section>
    </main>
  );
}
