# Ofertas remotas añadidas — 20 de octubre de 2026

Se revisaron 16 portales oficiales de contratación y 616 ofertas remotas recientes. Se omitieron 377 registros existentes y un duplicado. Se insertaron 211 registros nuevos; una convocatoria de interés futuro quedó excluida de las ofertas activas durante la revisión final.

**Resultado: 210 ofertas nuevas activas, de 13 empresas, con 210 destinos de candidatura verificados mediante `available-job-targets`.**

| Empresa | Ofertas nuevas activas |
| --- | ---: |
| Grafana Labs | 79 |
| Supabase | 34 |
| n8n | 29 |
| Ashby | 22 |
| Wikimedia Foundation | 13 |
| Oyster | 11 |
| PostHog | 8 |
| ElevenLabs | 5 |
| TestGorilla | 3 |
| GitLab | 2 |
| Docker | 2 |
| Buffer | 1 |
| Zapier | 1 |

## Alcance geográfico declarado

- 21 anunciadas como globales.
- 66 con alcance regional o varios países.
- 103 asociadas a un país.
- 20 remotas sin alcance geográfico explícito en los campos de ubicación.

Se conservan las ubicaciones originales, los países identificados y las descripciones completas. «Remoto» no significa necesariamente que se pueda trabajar desde cualquier país: cada candidatura debe respetar las condiciones de la empresa.

Hay puestos de ingeniería, datos e IA, producto, marketing, ventas, atención al cliente, finanzas, diseño y operaciones. Se mantuvo la fecha de publicación proporcionada por la fuente; la búsqueda utiliza una ventana de 90 días y portales que actualmente siguen mostrando la vacante.

Las ofertas enlazan al formulario oficial de la empresa. No se han marcado como Auto Apply ni se han inventado direcciones de correo. No se ha enviado ninguna candidatura.

Fuentes de ejemplo:

- Supabase: https://jobs.ashbyhq.com/supabase
- Ashby: https://jobs.ashbyhq.com/ashby
- PostHog: https://jobs.ashbyhq.com/posthog
- Grafana Labs: https://job-boards.greenhouse.io/grafanalabs
- Wikimedia Foundation: https://job-boards.greenhouse.io/wikimedia

Lote verificable en la base de datos: `metadata.import_batch = global-remote-2026-10-20`.

Importador reutilizable: `node --env-file=.env.local scripts/import-global-remote-jobs.mjs` realiza una revisión sin escrituras; `--write` añade exclusivamente ofertas nuevas y sus destinos de candidatura.
