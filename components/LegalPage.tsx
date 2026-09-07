import Link from "./SafeLink";
import { Brand } from "./Brand";
import type { LandingLocale } from "../lib/locale";

type LegalKind = "privacy" | "terms" | "authorization";
type LegalSection = { title: string; paragraphs?: string[]; bullets?: string[] };
type LegalDocument = { title: string; intro: string; updated: string; notice: string; sections: LegalSection[] };

const contact = "alberto@haired.app";

const documents: Record<LandingLocale, Record<LegalKind, LegalDocument>> = {
  en: {
    privacy: {
      title: "Privacy Policy",
      intro: "This policy explains what information Landeo uses, why it is needed, who may process it and the choices available to you.",
      updated: "Effective and last updated: 7 September 2026",
      notice: "Landeo is designed to keep your information private. We do not sell personal data. Access is restricted and information is encrypted in transit; no online service can promise absolute security.",
      sections: [
        { title: "1. Who is responsible", paragraphs: [
          `Landeo is operated from Spain by an independent developer. For privacy purposes, contact the controller through ${contact}. The legal seller or developer identity is also available in the applicable App Store listing where required.`,
          "This policy applies to the Landeo website, web application and mobile application. Third-party job sites, employers and application systems have their own privacy practices.",
        ] },
        { title: "2. Information we process", bullets: [
          "Account information, such as your name, email address, authentication identifier and sign-in provider.",
          "Your professional profile, contact details, work authorization, experience, skills, preferences, salary expectations and onboarding answers.",
          "Documents and content you provide, including your CV, cover-letter answers and optional instructions.",
          "Application activity, such as jobs viewed, saved or rejected, your express decision to apply, delivery status and any generated cover letter.",
          "Technical and security information needed to operate the service, including timestamps, device or browser information, IP-derived security data and error logs.",
          "Subscription or entitlement status supplied by the relevant marketplace or service provider. Landeo does not receive your complete payment-card details from Apple.",
          "Optional website analytics only after you accept analytics cookies. We do not use this consent to enable personalized advertising.",
        ] },
        { title: "3. Why we use information", bullets: [
          "Create and secure your account and synchronize your profile across devices.",
          "Match and display potentially relevant jobs based on the preferences you choose.",
          "Prepare and submit an application after you expressly choose to apply.",
          "Generate a tailored cover letter when you have enabled that feature.",
          "Provide support, prevent misuse, diagnose errors and improve reliability.",
          "Comply with legal obligations and establish, exercise or defend legal claims.",
        ] },
        { title: "4. Legal grounds under European data protection law", paragraphs: [
          "We process information when it is necessary to provide the service you request, when you give consent, for legitimate interests such as security and service reliability, and when the law requires it. You may withdraw consent at any time without affecting earlier lawful processing.",
        ] },
        { title: "5. AI-assisted cover letters", paragraphs: [
          "AI cover-letter generation is off unless you enable it. When enabled and you choose to apply, Landeo sends the relevant job description and the professional facts and answers needed to draft that letter to OpenAI through its business API. Requests are configured not to create stored Responses API objects. OpenAI may still process limited data as required to provide and secure its API under its applicable data controls.",
          "Do not include sensitive personal information in free-text answers unless it is genuinely necessary. You can disable AI cover-letter generation from your profile. Landeo's AI helps draft content; it does not decide whether an employer interviews or hires you.",
        ] },
        { title: "6. Applications and disclosures to employers", paragraphs: [
          "A job application starts only after your express action to apply and the required consent. Landeo may then disclose the application details needed by the employer, its applicant-tracking system or the relevant job platform. This can include your identity, contact details, CV, professional profile and tailored cover letter.",
          "If an external sign-in, question, consent screen or CAPTCHA requires your attention, Landeo returns control to you. Once information reaches an employer or job platform, that recipient processes it under its own privacy notice and applicable law.",
        ] },
        { title: "7. Service providers and international processing", paragraphs: [
          "We use carefully selected providers only where needed to operate Landeo. These may include Supabase for authentication, database and private file storage; OpenAI for user-enabled AI drafting; Resend for transactional email and supported application delivery; Apple and Google for sign-in; Apple and relevant subscription infrastructure for entitlement status; and Google Analytics for consented website analytics. Employers, applicant-tracking systems and job platforms receive data only as needed for applications you initiate.",
          "Some providers may process information outside Spain or the European Economic Area. Where required, transfers rely on an adequacy decision, contractual safeguards such as Standard Contractual Clauses, or another lawful mechanism. Providers must protect information consistently with their contracts and applicable law.",
          "Landeo is not designed for routine manual reading of private CVs or profile content. Authorized access may nevertheless occur when reasonably necessary for support requested by you, security, abuse prevention or legal compliance.",
        ] },
        { title: "8. Retention and permanent account deletion", paragraphs: [
          "Profile, CV, preferences and application history are retained while your account is active so the service can work. You can permanently delete your account from within the app. You may also contact us from the email address linked to the account if you cannot access that option.",
          "Deletion removes or irreversibly anonymizes account information from active systems. Limited copies may remain temporarily in encrypted backups or security logs and are removed through the normal backup cycle, unless a longer period is required to prevent fraud, resolve a dispute or comply with law. Information already sent to an employer or job platform must be deleted directly with that recipient.",
        ] },
        { title: "9. Security", paragraphs: [
          "Landeo uses private storage, access controls, authenticated requests and encryption in transit. Service credentials are kept on protected server infrastructure rather than exposed in the app. Although we take reasonable technical and organizational measures, no internet transmission or storage system is completely secure.",
        ] },
        { title: "10. Your rights and choices", paragraphs: [
          `Depending on applicable law, you may request access, correction, deletion, restriction, objection or portability of your personal data, and withdraw consent. Use the controls available in your profile or email ${contact}. We may ask for reasonable verification before acting. You also have the right to complain to the Spanish Data Protection Agency (AEPD) or your local supervisory authority.`,
        ] },
        { title: "11. Children", paragraphs: [
          "Landeo is a job-search service and is not directed to children. A user must have legal capacity to accept the service terms, or use the service with valid authorization from a parent or legal guardian where permitted by law.",
        ] },
        { title: "12. Changes and contact", paragraphs: [
          `We may update this policy when the service, providers or legal requirements change. Material changes will be communicated through the service where appropriate. Questions or privacy requests: ${contact}.`,
        ] },
      ],
    },
    terms: {
      title: "Terms of Service",
      intro: "These terms set the rules for using Landeo and explain the limits of the job-search and application service.",
      updated: "Effective and last updated: 7 September 2026",
      notice: "Landeo helps you discover and prepare applications, but does not guarantee that an employer receives, reviews or accepts an application, or that you receive an interview or job offer.",
      sections: [
        { title: "1. Provider and acceptance", paragraphs: [`Landeo is offered from Spain by an independent developer. Contact: ${contact}. The legal seller or developer identity is available in the applicable App Store listing where required. By creating an account or using Landeo, you agree to these Terms and the Privacy Policy.`] },
        { title: "2. Eligibility", paragraphs: ["You must have legal capacity to enter into these Terms. If applicable law permits a minor to use the service only with a parent or legal guardian, that authorization is required. You must be legally allowed to seek and accept the roles for which you apply."] },
        { title: "3. What Landeo provides", paragraphs: [
          "Landeo provides job discovery, matching, profile and CV storage, application preparation, status tracking and optional AI-assisted drafting. Job listings may originate from employers, job boards or other third parties and can change or expire without notice.",
          "Landeo is not an employer, recruitment agency or representative of the companies shown. Employers alone make interview and hiring decisions. Match scores, salary information, availability and other estimates are informational and are not promises.",
        ] },
        { title: "4. Your account", paragraphs: ["You are responsible for accurate account information, safeguarding access to your email and sign-in provider, and activity performed through your account. Tell us promptly if you believe your account has been compromised. One person may not impersonate another or create accounts for deceptive or abusive use."] },
        { title: "5. Your information and CV", paragraphs: ["You retain ownership of the CV, profile and other content you provide. You give Landeo a limited, non-exclusive permission to store, format, process and transmit that content only as needed to provide the features you request. You confirm that your content is truthful, lawful and that you have the right to use it."] },
        { title: "6. Express application authorization", paragraphs: [
          "Landeo prepares or submits an application only after an express apply action by you and the required consent. That action authorizes Landeo to use your saved profile and share the required application material with the identified employer, job platform or applicant-tracking system for that opportunity.",
          "Automated delivery is not possible for every role. An application may require you to complete external questions, sign in, accept third-party terms or solve a CAPTCHA. A saved or prepared status is not confirmation that an employer received the application; the status shown for each application controls.",
        ] },
        { title: "7. AI-generated content", paragraphs: ["If you enable AI cover letters, Landeo uses the facts you supplied and the job information to create a draft. AI output can contain mistakes or unsuitable wording. You remain responsible for the accuracy and appropriateness of material submitted on your behalf and should review it whenever the application flow allows. Do not ask Landeo to fabricate qualifications or experience."] },
        { title: "8. Purchases through Apple", paragraphs: ["Purchases made through Apple are handled under Apple's applicable purchase, subscription and refund terms and are managed through your Apple account. These Terms do not replace or restrict any mandatory rights or terms provided by Apple or consumer law."] },
        { title: "9. Acceptable use", bullets: [
          "Do not submit false, misleading, discriminatory, infringing or unlawful content.",
          "Do not use Landeo for spam, harassment, scraping, credential theft or applications you are not genuinely authorized to make.",
          "Do not bypass access controls, rate limits, CAPTCHAs, third-party restrictions or security measures.",
          "Do not reverse engineer, disrupt or overload the service, except where applicable law expressly permits it.",
          "Do not use another person's personal information or CV without their clear authority.",
        ] },
        { title: "10. Third-party services", paragraphs: ["Landeo may link to or interact with job boards, employer sites, applicant-tracking systems, sign-in services and other third parties. Their terms and privacy policies apply to your use of their services. We do not control their availability, decisions, security or content and are not responsible for changes made by them."] },
        { title: "11. Availability, suspension and account deletion", paragraphs: ["We may modify, interrupt or discontinue features where reasonably necessary for maintenance, security, legal compliance or product changes. We may suspend abusive or unlawful accounts, normally with notice where appropriate. You can permanently delete your account from within the app; deletion is handled as described in the Privacy Policy."] },
        { title: "12. Intellectual property", paragraphs: ["Landeo's software, brand, interface and original content belong to the provider or its licensors. Subject to these Terms, you receive a personal, limited, revocable, non-exclusive and non-transferable right to use the service for your own job search."] },
        { title: "13. Disclaimers and liability", paragraphs: [
          "The service is provided with reasonable care and skill, but job data, third-party systems and AI output may be incomplete, delayed or unavailable. To the fullest extent permitted by law, Landeo is not liable for indirect or consequential loss, employer decisions, missed opportunities, third-party outages or information supplied inaccurately by a user or third party.",
          "Nothing in these Terms excludes liability that cannot lawfully be excluded, including mandatory consumer rights, fraud, wilful misconduct, or liability for death or personal injury where applicable.",
        ] },
        { title: "14. Governing law, changes and contact", paragraphs: [`Spanish law governs these Terms, without depriving consumers of mandatory protections in their country of residence. Any mandatory consumer forum remains available. We may update these Terms for legal, security or service changes and will give reasonable notice of material changes. Contact: ${contact}.`] },
        { title: "15. Apple App Store addendum", bullets: [
          "These Terms are between you and Landeo's developer, not Apple. The developer, not Apple, is solely responsible for Landeo and its content.",
          "Your App Store licence is limited, non-transferable and permits use on Apple-branded products that you own or control, as allowed by the Apple Media Services Usage Rules, including applicable Family Sharing or volume-purchase rules.",
          "Apple has no obligation to provide maintenance or support for Landeo. Contact Landeo using the email above for support.",
          "To the extent any legally required warranty applies and Landeo fails to conform, you may notify Apple for any remedy Apple is required to provide. Apple has no other warranty obligation to the maximum extent permitted by law.",
          "The provider, not Apple, is responsible for addressing claims relating to the app, including product liability, regulatory or consumer-protection claims, and intellectual-property claims.",
          "You represent that you are not in a country subject to a United States Government embargo and are not on a United States Government prohibited or restricted parties list.",
          "You must comply with applicable third-party terms when using Landeo. Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce this addendum against you.",
        ], paragraphs: ["Where Apple's Standard Licensed Application End User License Agreement applies, these Terms supplement it. Mandatory Apple terms and applicable law prevail in the event of an unavoidable conflict."] },
      ],
    },
    authorization: {
      title: "Application Authorization",
      intro: "What you authorize when you choose to apply with Landeo.",
      updated: "Effective and last updated: 7 September 2026",
      notice: "Your apply action is specific to the job shown. It is not a general authorization to apply to every available role.",
      sections: [
        { title: "1. Your instruction", paragraphs: ["When you choose to apply, you instruct Landeo to prepare or send an application for that opportunity using the professional information and consents saved in your account."] },
        { title: "2. Information shared", paragraphs: ["Landeo may share the required identity, contact, CV, profile and cover-letter information with the named employer, its applicant-tracking system or the job platform supporting the application."] },
        { title: "3. When control returns to you", paragraphs: ["If an application needs an answer Landeo does not have, external authentication, acceptance of third-party terms or a CAPTCHA, Landeo will ask you to complete that step. Only a delivered status confirms automated delivery."] },
        { title: "4. Your control", paragraphs: [`You can withdraw future automatic-application consent from your profile, delete your account in the app, or contact ${contact}. Withdrawal does not undo applications already sent at your request.`] },
      ],
    },
  },
  es: {
    privacy: {
      title: "Política de privacidad",
      intro: "Esta política explica qué información utiliza Landeo, por qué es necesaria, quién puede tratarla y qué opciones tienes.",
      updated: "Vigente y actualizada por última vez: 7 de septiembre de 2026",
      notice: "Landeo está diseñado para mantener privada tu información. No vendemos datos personales. El acceso está restringido y la información se cifra durante la transmisión; ningún servicio en línea puede prometer seguridad absoluta.",
      sections: [
        { title: "1. Responsable del tratamiento", paragraphs: [
          `Landeo está operado desde España por un desarrollador independiente. Para cuestiones de privacidad, puedes contactar con el responsable mediante ${contact}. La identidad legal del vendedor o desarrollador también figura en la ficha de App Store correspondiente cuando es obligatorio.`,
          "Esta política se aplica al sitio web, la aplicación web y la aplicación móvil de Landeo. Los portales de empleo, empresas y sistemas de candidatura de terceros tienen sus propias prácticas de privacidad.",
        ] },
        { title: "2. Información que tratamos", bullets: [
          "Datos de cuenta, como nombre, correo electrónico, identificador de autenticación y proveedor de acceso.",
          "Perfil profesional, datos de contacto, autorización laboral, experiencia, habilidades, preferencias, expectativas salariales y respuestas del onboarding.",
          "Documentos y contenido que facilitas, incluidos CV, respuestas para la carta de presentación e instrucciones opcionales.",
          "Actividad de candidatura, como empleos vistos, guardados o descartados, tu decisión expresa de postularte, estado de entrega y cualquier carta generada.",
          "Información técnica y de seguridad necesaria para operar el servicio, incluidos marcas de tiempo, datos de dispositivo o navegador, datos de seguridad derivados de la IP y registros de errores.",
          "Estado de suscripción o acceso facilitado por la tienda o el proveedor correspondiente. Landeo no recibe de Apple los datos completos de tu tarjeta.",
          "Analítica web opcional únicamente después de que aceptes las cookies analíticas. No usamos este consentimiento para activar publicidad personalizada.",
        ] },
        { title: "3. Para qué usamos la información", bullets: [
          "Crear y proteger tu cuenta y sincronizar tu perfil entre dispositivos.",
          "Mostrar empleos potencialmente relevantes según las preferencias que elijas.",
          "Preparar y enviar una candidatura después de que decidas expresamente postularte.",
          "Generar una carta adaptada cuando hayas activado esa función.",
          "Prestar soporte, evitar usos indebidos, diagnosticar errores y mejorar la fiabilidad.",
          "Cumplir obligaciones legales y formular, ejercer o defender reclamaciones.",
        ] },
        { title: "4. Bases jurídicas conforme a la normativa europea", paragraphs: ["Tratamos información cuando es necesario para prestar el servicio que solicitas, cuando das tu consentimiento, por intereses legítimos como la seguridad y fiabilidad del servicio, y cuando la ley lo exige. Puedes retirar tu consentimiento en cualquier momento sin afectar al tratamiento anterior que fuera lícito."] },
        { title: "5. Cartas de presentación asistidas por IA", paragraphs: [
          "La generación con IA permanece desactivada salvo que la habilites. Cuando está habilitada y decides postularte, Landeo envía a OpenAI, mediante su API empresarial, la descripción relevante del puesto y los hechos profesionales y respuestas necesarios para redactar esa carta. Las solicitudes se configuran para no crear objetos almacenados de la Responses API. OpenAI puede tratar datos limitados cuando sea necesario para prestar y proteger su API conforme a sus controles aplicables.",
          "No incluyas información personal sensible en respuestas abiertas salvo que sea realmente necesaria. Puedes desactivar la generación con IA desde tu perfil. La IA de Landeo ayuda a redactar; no decide si una empresa te entrevista o contrata.",
        ] },
        { title: "6. Candidaturas y comunicación a empresas", paragraphs: [
          "Una candidatura solo comienza después de tu acción expresa de postularte y del consentimiento necesario. Landeo puede entonces comunicar los datos requeridos a la empresa, su sistema de seguimiento de candidatos o el portal correspondiente. Esto puede incluir identidad, contacto, CV, perfil profesional y carta adaptada.",
          "Si un acceso externo, pregunta, pantalla de consentimiento o CAPTCHA requiere tu atención, Landeo te devuelve el control. Cuando la información llega a una empresa o plataforma, ese destinatario la trata conforme a su propio aviso de privacidad y la ley aplicable.",
        ] },
        { title: "7. Proveedores y tratamiento internacional", paragraphs: [
          "Utilizamos proveedores seleccionados solo cuando son necesarios para operar Landeo. Pueden incluir Supabase para autenticación, base de datos y archivos privados; OpenAI para redacción con IA activada por el usuario; Resend para correo transaccional y entregas compatibles; Apple y Google para iniciar sesión; Apple y la infraestructura de suscripciones correspondiente para confirmar el acceso; y Google Analytics para analítica web consentida. Las empresas, sistemas de candidatos y portales reciben datos únicamente cuando es necesario para candidaturas iniciadas por ti.",
          "Algunos proveedores pueden tratar información fuera de España o del Espacio Económico Europeo. Cuando es necesario, las transferencias se apoyan en una decisión de adecuación, garantías contractuales como las Cláusulas Contractuales Tipo u otro mecanismo válido. Los proveedores deben proteger la información conforme a sus contratos y a la ley aplicable.",
          "Landeo no está diseñado para la lectura manual habitual de CV o perfiles privados. Aun así, puede producirse acceso autorizado cuando sea razonablemente necesario para el soporte que solicites, seguridad, prevención de abusos o cumplimiento legal.",
        ] },
        { title: "8. Conservación y eliminación definitiva de la cuenta", paragraphs: [
          "El perfil, CV, preferencias e historial de candidaturas se conservan mientras la cuenta esté activa para que funcione el servicio. Puedes eliminar definitivamente tu cuenta desde la propia app. También puedes contactarnos desde el correo asociado a la cuenta si no puedes acceder a esa opción.",
          "La eliminación suprime o anonimiza de forma irreversible la información de la cuenta en los sistemas activos. Algunas copias limitadas pueden permanecer temporalmente en copias de seguridad cifradas o registros de seguridad y se eliminan en el ciclo normal de las copias, salvo que deban conservarse más tiempo para impedir fraude, resolver una disputa o cumplir la ley. La información ya enviada a una empresa o portal debe eliminarse directamente con ese destinatario.",
        ] },
        { title: "9. Seguridad", paragraphs: ["Landeo utiliza almacenamiento privado, controles de acceso, solicitudes autenticadas y cifrado durante la transmisión. Las credenciales del servicio se mantienen en infraestructura protegida del servidor y no se exponen en la app. Aunque aplicamos medidas técnicas y organizativas razonables, ningún sistema de transmisión o almacenamiento en Internet es completamente seguro."] },
        { title: "10. Tus derechos y opciones", paragraphs: [`Según la ley aplicable, puedes solicitar acceso, rectificación, eliminación, limitación, oposición o portabilidad de tus datos, y retirar tu consentimiento. Usa los controles de tu perfil o escribe a ${contact}. Podemos pedir una comprobación razonable de identidad. También puedes reclamar ante la Agencia Española de Protección de Datos (AEPD) o tu autoridad local de control.`] },
        { title: "11. Menores", paragraphs: ["Landeo es un servicio de búsqueda de empleo y no está dirigido a menores. El usuario debe tener capacidad legal para aceptar los términos o utilizar el servicio con autorización válida de su padre, madre o tutor legal cuando la ley lo permita."] },
        { title: "12. Cambios y contacto", paragraphs: [`Podemos actualizar esta política cuando cambien el servicio, los proveedores o los requisitos legales. Los cambios importantes se comunicarán a través del servicio cuando corresponda. Consultas o solicitudes de privacidad: ${contact}.`] },
      ],
    },
    terms: {
      title: "Términos de servicio",
      intro: "Estos términos establecen las reglas de uso de Landeo y los límites del servicio de búsqueda y preparación de candidaturas.",
      updated: "Vigentes y actualizados por última vez: 7 de septiembre de 2026",
      notice: "Landeo te ayuda a descubrir y preparar candidaturas, pero no garantiza que una empresa reciba, revise o acepte una candidatura, ni que obtengas una entrevista u oferta de empleo.",
      sections: [
        { title: "1. Prestador y aceptación", paragraphs: [`Landeo se ofrece desde España por un desarrollador independiente. Contacto: ${contact}. La identidad legal del vendedor o desarrollador figura en la ficha de App Store correspondiente cuando es obligatorio. Al crear una cuenta o utilizar Landeo, aceptas estos Términos y la Política de privacidad.`] },
        { title: "2. Capacidad", paragraphs: ["Debes tener capacidad legal para aceptar estos Términos. Si la ley permite que un menor use el servicio únicamente con un padre, madre o tutor legal, se requiere esa autorización. Debes poder buscar y aceptar legalmente los puestos a los que te postules."] },
        { title: "3. Qué ofrece Landeo", paragraphs: ["Landeo ofrece descubrimiento de empleos, coincidencias, almacenamiento de perfil y CV, preparación de candidaturas, seguimiento de estados y redacción opcional asistida por IA. Las ofertas pueden proceder de empresas, portales u otros terceros y pueden cambiar o caducar sin aviso.", "Landeo no es una empresa empleadora, agencia de colocación ni representante de las compañías mostradas. Solo las empresas deciden sobre entrevistas y contrataciones. Las coincidencias, salarios, disponibilidad y demás estimaciones son informativas y no constituyen promesas."] },
        { title: "4. Tu cuenta", paragraphs: ["Eres responsable de que los datos sean correctos, de proteger el acceso a tu correo y proveedor de inicio de sesión y de la actividad realizada desde tu cuenta. Avísanos si crees que se ha visto comprometida. Nadie puede suplantar a otra persona ni crear cuentas con fines engañosos o abusivos."] },
        { title: "5. Tu información y CV", paragraphs: ["Conservas la titularidad de tu CV, perfil y contenido. Concedes a Landeo un permiso limitado y no exclusivo para almacenar, formatear, tratar y transmitir ese contenido únicamente cuando sea necesario para prestar las funciones que solicites. Confirmas que el contenido es veraz y lícito y que tienes derecho a utilizarlo."] },
        { title: "6. Autorización expresa de candidatura", paragraphs: ["Landeo prepara o envía una candidatura solo después de tu acción expresa de postularte y del consentimiento necesario. Esa acción autoriza a Landeo a usar tu perfil guardado y comunicar el material requerido a la empresa identificada, portal o sistema de candidatos para esa oportunidad.", "La entrega automática no es posible para todos los puestos. Puede ser necesario completar preguntas externas, iniciar sesión, aceptar condiciones de terceros o resolver un CAPTCHA. Un estado guardado o preparado no confirma que la empresa haya recibido la candidatura; manda el estado mostrado para cada candidatura."] },
        { title: "7. Contenido generado con IA", paragraphs: ["Si habilitas las cartas con IA, Landeo utiliza los hechos que facilitaste y la información del puesto para crear un borrador. El resultado puede contener errores o expresiones inadecuadas. Sigues siendo responsable de la exactitud e idoneidad del material presentado en tu nombre y debes revisarlo cuando el flujo lo permita. No debes pedir a Landeo que invente experiencia o cualificaciones."] },
        { title: "8. Compras mediante Apple", paragraphs: ["Las compras realizadas mediante Apple se gestionan conforme a sus condiciones aplicables de compra, suscripción y reembolso y desde tu cuenta de Apple. Estos Términos no sustituyen ni limitan derechos o condiciones obligatorios de Apple o de la normativa de consumo."] },
        { title: "9. Uso aceptable", bullets: ["No presentes contenido falso, engañoso, discriminatorio, infractor o ilícito.", "No uses Landeo para spam, acoso, extracción masiva de datos, robo de credenciales o candidaturas que no estés autorizado a realizar.", "No eludas controles de acceso, límites, CAPTCHA, restricciones de terceros ni medidas de seguridad.", "No realices ingeniería inversa, alteres ni sobrecargues el servicio, salvo cuando la ley lo permita expresamente.", "No uses datos personales o el CV de otra persona sin su autorización clara."] },
        { title: "10. Servicios de terceros", paragraphs: ["Landeo puede enlazar o interactuar con portales de empleo, webs de empresas, sistemas de candidatos, proveedores de acceso y otros terceros. Sus términos y políticas se aplican al uso de sus servicios. No controlamos su disponibilidad, decisiones, seguridad o contenido ni respondemos de sus cambios."] },
        { title: "11. Disponibilidad, suspensión y eliminación", paragraphs: ["Podemos modificar, interrumpir o retirar funciones cuando sea razonablemente necesario por mantenimiento, seguridad, cumplimiento legal o cambios del producto. Podemos suspender cuentas abusivas o ilícitas, normalmente con aviso cuando corresponda. Puedes eliminar definitivamente tu cuenta desde la app; la eliminación se gestiona como explica la Política de privacidad."] },
        { title: "12. Propiedad intelectual", paragraphs: ["El software, marca, interfaz y contenido original de Landeo pertenecen al prestador o sus licenciantes. Sujeto a estos Términos, recibes un derecho personal, limitado, revocable, no exclusivo e intransferible para usar el servicio en tu propia búsqueda de empleo."] },
        { title: "13. Garantías y responsabilidad", paragraphs: ["El servicio se presta con diligencia razonable, pero los datos de empleo, sistemas de terceros y resultados de IA pueden ser incompletos, retrasarse o no estar disponibles. En la máxima medida permitida, Landeo no responde por daños indirectos o consecuenciales, decisiones empresariales, oportunidades perdidas, fallos de terceros ni información inexacta facilitada por un usuario o tercero.", "Nada excluye responsabilidades que legalmente no puedan excluirse, incluidos derechos imperativos de consumidores, fraude, dolo o responsabilidad por muerte o lesiones personales cuando sea aplicable."] },
        { title: "14. Ley aplicable, cambios y contacto", paragraphs: [`Se aplica la ley española, sin privar a los consumidores de la protección obligatoria de su país de residencia. Se mantiene cualquier fuero imperativo del consumidor. Podemos actualizar estos Términos por cambios legales, de seguridad o del servicio, avisando razonablemente de cambios importantes. Contacto: ${contact}.`] },
        { title: "15. Anexo de Apple App Store", bullets: ["Estos Términos se celebran entre tú y el desarrollador de Landeo, no con Apple. El desarrollador, y no Apple, es el único responsable de Landeo y su contenido.", "La licencia de App Store es limitada, intransferible y permite usar la app en productos Apple que poseas o controles conforme a las Normas de uso de Apple Media Services, incluidas las reglas aplicables de En familia o compra por volumen.", "Apple no tiene obligación de prestar mantenimiento o soporte para Landeo. Contacta con Landeo en el correo indicado.", "Si resulta aplicable una garantía legal y Landeo no la cumple, puedes avisar a Apple para el remedio que Apple esté obligado a ofrecer. Apple no tiene otras obligaciones de garantía en la máxima medida permitida.", "El prestador, y no Apple, responde de las reclamaciones relativas a la app, incluidas responsabilidad por producto, normativa o consumo y propiedad intelectual.", "Declaras no estar en un país sujeto a embargo del Gobierno de Estados Unidos ni figurar en una lista estadounidense de partes prohibidas o restringidas.", "Debes cumplir las condiciones de terceros aplicables. Apple y sus filiales son terceros beneficiarios de estos Términos y pueden exigir el cumplimiento de este anexo."], paragraphs: ["Cuando resulte aplicable el Contrato estándar de licencia de usuario final de Apple, estos Términos lo complementan. En caso de conflicto inevitable, prevalecen las condiciones obligatorias de Apple y la ley aplicable."] },
      ],
    },
    authorization: {
      title: "Autorización de candidaturas",
      intro: "Qué autorizas cuando decides postularte con Landeo.",
      updated: "Vigente y actualizada por última vez: 7 de septiembre de 2026",
      notice: "Tu acción de postularte es específica para el empleo mostrado. No es una autorización general para postularte a todas las vacantes disponibles.",
      sections: [
        { title: "1. Tu instrucción", paragraphs: ["Cuando decides postularte, encargas a Landeo preparar o enviar una candidatura para esa oportunidad usando la información profesional y consentimientos guardados en tu cuenta."] },
        { title: "2. Información comunicada", paragraphs: ["Landeo puede compartir los datos necesarios de identidad, contacto, CV, perfil y carta con la empresa indicada, su sistema de candidatos o el portal que soporte la candidatura."] },
        { title: "3. Cuándo vuelve el control a ti", paragraphs: ["Si una candidatura necesita una respuesta que Landeo no conoce, autenticación externa, aceptación de condiciones de terceros o un CAPTCHA, Landeo te pedirá completar ese paso. Solo el estado entregado confirma el envío automático."] },
        { title: "4. Tu control", paragraphs: [`Puedes retirar el consentimiento para futuras candidaturas automáticas desde tu perfil, eliminar tu cuenta en la app o escribir a ${contact}. La retirada no deshace candidaturas ya enviadas por petición tuya.`] },
      ],
    },
  },
};

const navigation = {
  en: { back: "Back to home", language: "Document language", help: "Help", privacy: "Privacy", terms: "Terms", authorization: "Application authorization", email: "Email Landeo" },
  es: { back: "Volver al inicio", language: "Idioma del documento", help: "Ayuda", privacy: "Privacidad", terms: "Términos", authorization: "Autorización de candidaturas", email: "Escribir a Landeo" },
};

function languageHref(kind: LegalKind, locale: LandingLocale) {
  const path = kind === "authorization" ? "/application-authorization" : `/${kind}`;
  return `${path}?lang=${locale}`;
}

export default function LegalPage({ kind, locale }: { kind: LegalKind; locale: LandingLocale }) {
  const content = documents[locale][kind];
  const nav = navigation[locale];
  return (
    <main className="legal-page">
      <header>
        <Brand />
        <div className="legal-header-actions">
          <nav className="language-switcher" aria-label={nav.language}>
            <Link href={languageHref(kind, "es")} className={locale === "es" ? "active" : undefined} aria-current={locale === "es" ? "page" : undefined}>ES</Link>
            <i />
            <Link href={languageHref(kind, "en")} className={locale === "en" ? "active" : undefined} aria-current={locale === "en" ? "page" : undefined}>EN</Link>
          </nav>
          <Link href="/">{nav.back}</Link>
        </div>
      </header>
      <article>
        <span className="overline">LANDEO · LEGAL</span>
        <h1>{content.title}</h1>
        <p className="lead">{content.intro}</p>
        <p className="legal-updated">{content.updated}</p>
        <aside>{content.notice}</aside>
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
            {kind === "terms" && section.title.includes("Apple App Store") && <p className="legal-reference"><Link href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Apple Standard EULA ↗</Link></p>}
          </section>
        ))}
        <div className="legal-contact">
          <strong>{locale === "es" ? "¿Necesitas ayuda?" : "Need help?"}</strong>
          <p>{locale === "es" ? "Contacta con Landeo para soporte o para ejercer tus derechos." : "Contact Landeo for support or to exercise your rights."}</p>
          <Link href={`mailto:${contact}`}>{nav.email}: {contact}</Link>
        </div>
      </article>
      <footer>
        <Link href="/support">{nav.help}</Link>
        <Link href={`/privacy?lang=${locale}`}>{nav.privacy}</Link>
        <Link href={`/terms?lang=${locale}`}>{nav.terms}</Link>
        <Link href={`/application-authorization?lang=${locale}`}>{nav.authorization}</Link>
      </footer>
    </main>
  );
}
