# Landeo Web — arquitectura y plan de integración

## Arquitectura de carpetas

```text
app/                         Rutas App Router y metadata
  app/                       Área autenticada
  login, signup, onboarding  Acceso y activación
  pricing                    Monetización web
  privacy, terms, application-authorization
components/                  Superficies y flujos reutilizables
lib/                         Contratos, fixtures y adaptadores de datos
docs/                        Decisiones y plan de entrega
public/                      Activos públicos, nunca CVs
```

La versión actual usa el backend real de Landeo en Supabase. El catálogo, la autenticación, los perfiles, el bucket privado de CV, los swipes, las candidaturas y sus eventos respetan las RLS y Edge Functions compartidas con la app móvil.

## Mapa de rutas

- `/`: landing pública y SEO.
- `/login`, `/signup`: magic link/email y OAuth.
- `/onboarding`: recorrido inicial; persistirá `onboarding_answers` y `onboarding_completed_at`.
- `/app/jobs`, `/app/jobs/[id]`: feed, filtros, gestos y detalle compartible.
- `/app/applications`: estados y cronología de `application_events`.
- `/app/saved`, `/app/notifications`: guardados y eventos internos.
- `/app/profile`, `/app/profile/universal`: cuenta, consentimientos y los 12 bloques de completitud.
- `/pricing`: acceso Pro.
- `/privacy`, `/terms`, `/application-authorization`: borradores legales claramente marcados.

## Componentes y estados principales

- `ProductApp`: shell responsive, idioma y navegación.
- Feed: `idle`, `filtered-empty`, `saved`, `passed`, `paywall-open`.
- Candidatura: `queued`, `processing`, `sent`, `action_required`, `failed`; `viewed`, `interview` y `rejected` son estados posteriores del proceso.
- Perfil universal: porcentaje por 12 bloques, campos faltantes y consentimientos independientes.
- Auth: anónimo, magic-link enviado, sesión, onboarding pendiente y sesión completa.

## Reutilización de Supabase

1. Copiar solo tipos generados y contratos comprobados del repositorio fuente; no duplicar el backend.
2. Configurar Supabase SSR con cookies HttpOnly y callbacks separados para email, Google y Apple web.
3. Leer `jobs` activos sin seleccionar destinos privados. `job_application_targets` y `service_role` permanecen exclusivamente en Edge Functions.
4. Registrar `swipes` con el UUID autenticado y constraint idempotente existente.
5. Tras un swipe derecho, invocar `submit-application` con `{ jobId, answers, platform: "web" }`.
6. Consultar `applications` y `application_events` con polling inicial; migrar a Realtime después.
7. Subir CV al bucket privado `cvs` bajo el prefijo del UUID. Nunca generar URL pública permanente.
8. Mantener intactas las RLS; corregir el frontend si una consulta no está permitida.

## Pago web

La web usa **Stripe Checkout + Customer Portal**. La app móvil conserva RevenueCat y ambos canales comparten el UUID de Supabase como identidad. La autoridad web se mantiene en una tabla de suscripciones escrita únicamente por el webhook verificado de Stripe:

- Checkout de suscripción creado exclusivamente por Edge Function.
- Webhook Stripe idempotente y con firma HMAC verificada.
- Validación server-side de una suscripción `active` o `trialing` vigente.
- Adaptar `submit-application` para validar `platform: web` sin exponer secretos.
- Portal de cliente para gestionar/cancelar suscripción.

No se aceptará un booleano de Pro enviado por el navegador como autoridad.

## Variables

Públicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Solo servidor: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `SITE_URL`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `INFOJOBS_CLIENT_ID`, `INFOJOBS_CLIENT_SECRET`, `IMPORT_JOBS_SECRET`, `BROWSERLESS_TOKEN`.

## Pruebas y aceptación

- Auth email/Google, callback Apple y protección de rutas.
- Onboarding persistente y no repetido.
- RLS por usuario y ausencia de destinos/secretos en el bundle.
- CV privado: alta, reemplazo, tamaño y tipos permitidos.
- Feed: limpieza HTML, fallback de logo, filtros, gesto, botones y teclado.
- Paywall: solo al postularse; servidor vuelve a validar Pro.
- Idempotencia de swipe y submit.
- Cada estado y transición de candidatura, incluido handoff por CAPTCHA.
- Confirmación manual externa atribuida al usuario.
- Idioma, accesibilidad, reducción de movimiento y responsive 360px–desktop.
- Gestión de suscripción, logout, exportación y eliminación de cuenta.

## Fases ejecutables

1. Base pública y producto responsive.
2. Supabase real, RLS, perfil universal, CV privado y feed activo.
3. Stripe web y `submit-application` con autorización por plataforma.
4. E2E con credenciales Stripe, revisión legal, observabilidad y despliegue gradual.
