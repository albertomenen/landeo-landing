"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { saveCoverLetterProfile, type CandidateProfile, type CoverLetterProfile } from "../lib/landeo";
import type { DashboardLocale } from "../lib/dashboard-i18n";

type Answers = Omit<CoverLetterProfile, "updatedAt">;
const empty: Answers = { motivation: "", valueProposition: "", achievement: "", companyPreferences: "", doNotMention: "", tone: "professional", enabled: true, reviewBeforeSending: true };
const keys = ["motivation", "valueProposition", "achievement", "companyPreferences"] as const;
const questions = {
  es: [
    { title: "¿Qué trabajo te gustaría hacer y por qué?", short: "Tu dirección", help: "Cuenta qué tipo de puesto buscas y qué te interesa de ese trabajo. No hace falta explicar por qué dejas tu empleo actual.", prompts: ["¿Qué tareas te gustaría hacer más?", "¿Qué quieres aprender o aportar en tu siguiente puesto?"], example: "Busco mi primer puesto de desarrollo web. Me gusta transformar problemas cotidianos en herramientas fáciles de usar y quiero seguir aprendiendo con un equipo.", tip: "Empieza por lo que te interesa del trabajo, no por un elogio genérico a una empresa." },
    { title: "¿Qué problema puedes ayudar a resolver?", short: "Tu aportación", help: "Elige una o dos fortalezas y explica cómo las usas. Es más útil que una lista de adjetivos o de todas tus habilidades.", prompts: ["¿Para qué suelen pedirte ayuda?", "¿Cómo trabajas para conseguir un buen resultado?"], example: "Se me da bien aclarar necesidades y dividirlas en tareas pequeñas. Antes de programar, preparo un prototipo y lo pruebo con quienes lo van a utilizar.", tip: "En vez de «soy proactivo», explica qué haces cuando detectas un problema." },
    { title: "Cuéntanos una ocasión en la que lo demostraste", short: "Un ejemplo real", help: "Puede ser un trabajo, unas prácticas, un proyecto de clase, voluntariado o un proyecto personal. No necesitas haber tenido un empleo.", prompts: ["Contexto: ¿qué había que resolver?", "Acción: ¿qué hiciste tú, concretamente?", "Resultado: ¿qué cambió o qué aprendiste?"], example: "En un proyecto de clase, las tareas se duplicaban. Organicé un tablero y acordamos responsables. Entregamos el proyecto a tiempo y aprendí a coordinar mejor al equipo.", tip: "Si tienes una cifra real, inclúyela. Si no, un resultado concreto es suficiente: no inventes métricas." },
    { title: "¿Qué te atrae de una empresa o de su trabajo?", short: "Tu motivación", help: "Piensa en productos, problemas, sectores o formas de trabajar que de verdad te interesen. Esta base servirá para distintas empresas.", prompts: ["¿Qué tipo de producto o impacto te importa?", "¿Qué te gustaría construir o mejorar con un equipo?"], example: "Me interesan productos que simplifiquen tareas del día a día y equipos donde pueda hablar con usuarios, recibir feedback y mejorar lo que construyo.", tip: "La carta conectará estas preferencias con la oferta solo cuando haya información que lo respalde." },
  ],
  en: [
    { title: "What work would you like to do, and why?", short: "Your direction", help: "Tell us what kind of role you want and what interests you about the work. You don’t need to explain why you are leaving your current job.", prompts: ["Which tasks would you like to do more of?", "What would you like to learn or contribute next?"], example: "I’m looking for my first web development role. I enjoy turning everyday problems into easy-to-use tools and want to keep learning with a team.", tip: "Start with what interests you about the work, not generic praise for a company." },
    { title: "What problem can you help solve?", short: "Your contribution", help: "Choose one or two strengths and explain how you use them. That is more useful than a list of adjectives or every skill you have.", prompts: ["What do people come to you for help with?", "How do you work towards a good result?"], example: "I’m good at clarifying requirements and breaking them into smaller tasks. Before coding, I build a prototype and test it with the people who will use it.", tip: "Instead of saying «I’m proactive», explain what you do when you spot a problem." },
    { title: "Tell us about a time you demonstrated that", short: "A real example", help: "This can come from a job, internship, class project, volunteering or a personal project. You don’t need previous employment.", prompts: ["Context: what needed to be solved?", "Action: what did you personally do?", "Result: what changed or what did you learn?"], example: "On a class project, tasks were being duplicated. I set up a shared board and agreed owners. We delivered on time, and I learned how to coordinate a team more effectively.", tip: "Include a real number if you have one. If not, a concrete outcome is enough: don’t invent metrics." },
    { title: "What attracts you to a company or its work?", short: "Your motivation", help: "Think about products, problems, industries or ways of working you genuinely care about. This base will be used for different companies.", prompts: ["What kind of product or impact matters to you?", "What would you like to build or improve with a team?"], example: "I’m interested in products that make everyday tasks easier, and teams where I can talk to users, get feedback and improve what I build.", tip: "Your letter will connect these preferences to the job only when the available information supports it." },
  ],
};

export function GuidedCoverLetter({ profile, locale, onSaved }: { profile: CandidateProfile | null; locale: DashboardLocale; onSaved: () => Promise<void> }) {
  const [answers, setAnswers] = useState<Answers>(empty);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const hydrated = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const qs = questions[locale];
  const complete = keys.filter(key => answers[key].trim()).length;
  useEffect(() => {
    if (hydrated.current || !profile) return;
    const existing = profile.universal?.coverLetter;
    if (existing) setAnswers({ ...empty, ...existing });
    hydrated.current = true;
  }, [profile]);
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [step]);
  function go(next: number) { moved.current = true; setError(""); setStep(next); }
  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    hydrated.current = true;
    setAnswers(previous => ({ ...previous, [key]: value }));
    setSaved(false);
    setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step < 4) {
      if (!answers[keys[step]].trim()) { setError(t("Escribe una respuesta antes de continuar.", "Add an answer before continuing.")); return; }
      go(step + 1);
      return;
    }
    const missing = keys.findIndex(key => !answers[key].trim());
    if (missing !== -1) { go(missing); setError(t("Completa esta respuesta para guardar tu base.", "Complete this answer to save your base.")); return; }
    setSaving(true); setError("");
    try {
      await saveCoverLetterProfile(answers);
      setSaved(true);
      // Saving succeeded even if refreshing the surrounding dashboard fails.
      try { await onSaved(); } catch { /* The saved answers remain visible. */ }
    } catch {
      setError(t("No pudimos guardar tu base. Tus respuestas siguen aquí; vuelve a intentarlo.", "We couldn’t save your base. Your answers are still here; please try again."));
    } finally { setSaving(false); }
  }
  return <>
    <header className="view-header cover-letter-head">
      <div><span className="overline">{t("TU CARTA, PASO A PASO", "YOUR LETTER, STEP BY STEP")}</span>
        <h1>{t("Una buena carta empieza contigo.", "A good letter starts with you.")}</h1>
        <p>{t("Cuatro respuestas reales. Una base que podrás adaptar a cada oportunidad.", "Four honest answers. A base you can tailor to each opportunity.")}</p></div>
      <div className="cover-letter-score"><strong>{complete}/4</strong><span>{t("respuestas completas", "answers completed")}</span><progress aria-label={t("Respuestas completas", "Answers completed")} value={complete} max={4}/></div>
    </header>
    <div className="cover-letter-layout guided-letter-layout">
      <form className="cover-letter-form guided-letter-form" onSubmit={submit}>
        <nav className="letter-steps" aria-label={t("Pasos de tu carta", "Cover letter steps")}>
          {[...qs.map(q => q.short), t("Revisión", "Review")].map((label, index) => <button type="button" key={index} aria-label={`${index + 1}. ${label}`} aria-current={step === index ? "step" : undefined} disabled={saving} onClick={() => go(index)}><span>{index < 4 && answers[keys[index]].trim() ? "✓" : index + 1}</span><small>{label}</small></button>)}
        </nav>
        {step < 4 ? <section className="letter-question" key={step}>
          <span className="overline">{t("PREGUNTA", "QUESTION")} {step + 1} / 4</span>
          <h2 ref={heading} tabIndex={-1} id="letter-question-title">{qs[step].title}</h2>
          <p id="letter-question-help">{qs[step].help}</p>
          <ul className="letter-prompts">{qs[step].prompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ul>
          <label htmlFor="letter-answer">{t("Tu respuesta", "Your answer")}</label>
          <textarea id="letter-answer" aria-labelledby="letter-question-title" aria-describedby="letter-question-help letter-answer-count" rows={6} maxLength={step === 3 ? 1000 : 1500} value={answers[keys[step]]} onChange={event => update(keys[step], event.target.value)} placeholder={t("Escribe con tus palabras. Unas pocas frases son suficientes.", "Use your own words. A few sentences are enough.")} />
          <small id="letter-answer-count" className="letter-answer-count">{answers[keys[step]].length} / {step === 3 ? 1000 : 1500}</small>
          <details className="letter-example"><summary>{t("Ver un ejemplo para orientarme", "See an example for inspiration")}</summary><p>{qs[step].example}</p><small>{t("Solo como orientación: usa tu propia experiencia.", "For inspiration only: use your own experience.")}</small></details>
          <p className="letter-tip">{qs[step].tip}</p>
        </section> : <section className="letter-question">
          <span className="overline">{t("TU BASE PERSONAL", "YOUR PERSONAL BASE")}</span>
          <h2 ref={heading} tabIndex={-1}>{t("¿Suena a ti?", "Does this sound like you?")}</h2>
          <p>{t("Revisa los hechos antes de guardar. Esto es tu base, no la carta final: se redactará al elegir una oferta.", "Review the facts before saving. This is your base, not the final letter: it will be written when you choose a job.")}</p>
          <div className="letter-review">{keys.map((key, index) => <section key={key}><div><h3>{qs[index].short}</h3><button type="button" onClick={() => go(index)} aria-label={`${t("Editar", "Edit")} ${qs[index].short}`}>{t("Editar", "Edit")}</button></div><p>{answers[key].trim() || t("Sin completar", "Not completed")}</p></section>)}</div>
          <label htmlFor="letter-exclusions">{t("¿Hay algo que prefieres no mencionar? (Opcional)", "Anything you would prefer not to mention? (Optional)")}</label>
          <textarea id="letter-exclusions" rows={3} maxLength={700} value={answers.doNotMention} onChange={event => update("doNotMention", event.target.value)} placeholder={t("No hace falta compartir información personal sensible.", "You don’t need to share sensitive personal information.")} />
          <fieldset className="tone-picker"><legend>{t("Cómo quieres sonar", "How you want to sound")}</legend>{([ ["professional", t("Profesional", "Professional"), t("Claro y seguro", "Clear and confident")], ["warm", t("Cercano", "Warm"), t("Natural y personal", "Natural and personal")], ["direct", t("Directo", "Direct"), t("Sin rodeos", "Straight to the point")] ] as const).map(([value, title, detail]) => <button key={value} type="button" aria-pressed={answers.tone === value} className={answers.tone === value ? "active" : ""} onClick={() => update("tone", value)}><b>{title}</b><small>{detail}</small></button>)}</fieldset>
          <label className="ai-consent"><input type="checkbox" checked={answers.enabled} onChange={event => update("enabled", event.target.checked)}/><span><strong>{t("Usar esta base para generar mis cartas", "Use this base to generate my letters")}</strong><small>{t("La IA recibirá tus respuestas, datos relevantes de tu perfil y la oferta. Puedes desactivarlo cuando quieras.", "AI will receive your answers, relevant profile details and the job posting. You can turn this off at any time.")}</small></span></label>
          <fieldset className="cover-letter-delivery-choice"><legend>{t("Antes de enviar", "Before submitting")}</legend>
            <button type="button" aria-pressed={answers.reviewBeforeSending} className={answers.reviewBeforeSending ? "active" : ""} onClick={() => update("reviewBeforeSending", true)}><b>{t("Revisar siempre · Recomendado", "Always review · Recommended")}</b><small>{t("Lee, edita o regenera cada carta antes de aplicar.", "Read, edit or regenerate each letter before applying.")}</small></button>
            <button type="button" aria-pressed={!answers.reviewBeforeSending} className={!answers.reviewBeforeSending ? "active" : ""} onClick={() => update("reviewBeforeSending", false)}><b>{t("Generar y enviar", "Generate and submit")}</b><small>{t("Se enviará cuando el canal lo admita. Podrás verla después en tu candidatura.", "It will be sent when the channel supports it. You can read it afterwards in your application.")}</small></button>
          </fieldset>
        </section>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {saved && <p className="form-success" role="status">{answers.enabled ? t("Base guardada. La próxima carta usará estas respuestas y la información de la oferta.", "Base saved. Your next letter will use these answers and the job details.") : t("Base guardada. La generación de cartas está desactivada.", "Base saved. Letter generation is turned off.")}</p>}
        <div className="letter-wizard-actions"><button type="button" className="button button-ghost" disabled={step === 0 || saving} onClick={() => go(step - 1)}>{t("Atrás", "Back")}</button><button className="button button-primary" disabled={saving} type="submit">{saving ? t("Guardando…", "Saving…") : step === 4 ? t("Guardar mi base", "Save my base") : step === 3 ? t("Revisar mi base", "Review my base") : t("Continuar", "Continue")}</button></div>
        <p className="letter-save-note">{saved ? t("Guardado en tu perfil.", "Saved to your profile.") : t("Tus cambios se guardan al pulsar «Guardar mi base» en el último paso.", "Your changes are saved when you select “Save my base” in the last step.")}</p>
      </form>
      <aside className="cover-letter-explainer guided-letter-aside"><span className="overline">{t("DE TU HISTORIA A CADA OFERTA", "FROM YOUR STORY TO EACH JOB")}</span><h2>{t("Menos repetir tu CV. Más explicar qué aportas.", "Less repeating your CV. More showing your contribution.")}</h2>
        <ol><li><b>01</b><span><strong>{t("Una razón personal", "A personal reason")}</strong>{t("Qué te interesa del trabajo y por qué encaja contigo.", "What interests you about the work and why it fits you.")}</span></li><li><b>02</b><span><strong>{t("Un ejemplo concreto", "One concrete example")}</strong>{t("Lo que hiciste y su resultado, en lugar de enumerar todo tu historial.", "What you did and the result, rather than your entire work history.")}</span></li><li><b>03</b><span><strong>{t("Una conexión con la oferta", "A connection to the job")}</strong>{t("La carta se adapta al puesto y al idioma detectado de la oferta, no al idioma del dashboard.", "The letter adapts to the role and the detected posting language, not the dashboard language.")}</span></li></ol>
        <p className="letter-tip">{t("La IA puede equivocarse. Revisa los hechos y sigue siempre las instrucciones de la oferta. Una carta no garantiza una entrevista.", "AI can make mistakes. Check the facts and follow the posting’s instructions. A letter does not guarantee an interview.")}</p>
      </aside>
    </div>
  </>;
}
