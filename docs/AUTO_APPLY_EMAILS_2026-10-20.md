# Destinatarios de Auto Apply — 20 de octubre de 2026

Se añadieron 11 ofertas remotas con correos publicados expresamente para recibir candidaturas en las páginas oficiales. Se comprobaron la presencia de cada puesto, las instrucciones de envío y los registros MX del dominio. Esto acredita un canal publicado y un dominio con correo; la entrega a un buzón concreto solo puede confirmarse después de un envío real.

| Empresa | Ofertas | Destinatario | Fuente |
| --- | ---: | --- | --- |
| Lium | 1 | colin@datura.ai | https://lium.io/jobs |
| CityScout | 1 | careers@trycityscout.com | https://trycityscout.com/careers/software-engineer/ |
| Aadimum | 3 | hello@aadimum.com | https://www.aadimum.com/careers/ |
| Datawiza | 1 | careers@datawiza.com | https://www.datawiza.com/careers/software-engineering-intern |
| Swayam Sruja | 4 | hello@swayamsruja.com | https://www.swayamsruja.com/careers |
| Ichi | 1 | connect@ichiplan.com | https://www.ichiplan.com/careers/staff-software-engineer |

Las ofertas tienen `application_capability=automatic`, `application_provider=email` y un destino con `email_authorized=true`, fecha de verificación y URL oficial. Los asuntos respetan las instrucciones publicadas.

El envío utiliza el flujo existente: usuario con Auto Apply activado, suscripción válida, CV, consentimiento, coincidencia con sus preferencias y límites diarios. El correo permite responder al candidato. La carta personalizada depende de que el usuario haya completado y activado su perfil de carta con IA. La entrega se confirma por los eventos del proveedor de correo, no al guardar el destinatario.

Datawiza e Ichi exigen residencia en Estados Unidos. Para Swayam Sruja, anunciado como Hyderabad/Remote sin confirmar contratación internacional, el envío automático se limita a India. El runner ahora comprueba `auto_apply_allowed_countries` antes de puntuar estas ofertas; si no se conoce el país del candidato, no ejecuta esos envíos restringidos. Las otras cinco ofertas no especifican restricciones geográficas en sus páginas y no se anuncian como contratación mundial garantizada.

El cambio del runner se comprobó con tests de residencia compatible/incompatible, revisión de tipos Deno y despliegue de la función `auto-apply-runner` en Supabase. No se realizó ningún envío de prueba a estas empresas ni se activó Auto Apply para otros usuarios.

Lote: `metadata.import_batch = verified-email-remote-2026-10-20`.

Para revisar o repetir la importación: `node --env-file=.env.local scripts/import-verified-email-remote.mjs`; añadir `--write` para guardar los destinatarios verificados. No ejecutar este importador si la empresa deja de aceptar solicitudes por email.
