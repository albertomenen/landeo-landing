# Acceso con código por email

El registro y el inicio de sesión usan el código de ocho dígitos de Supabase. La verificación usa `verifyOtp({email, token, type: "email"})`; no necesita el verificador PKCE del navegador que solicitó el correo.

Se han actualizado en Supabase las plantillas **Confirm signup** y **Magic Link** y sus asuntos. Ambas incluyen `{{ .Token }}` y mantienen `{{ .ConfirmationURL }}` como alternativa para navegadores donde el enlace siga siendo útil. Caducidad: una hora; reenvío: 60 segundos. No es necesario copiar manualmente las plantillas. La fuente está en `supabase/templates/email-code.html`.

## Prueba manual después de publicar

1. Abre `https://getlandeo.com/login` en una ventana privada para no reutilizar una sesión existente.
2. Usa un email que ya tenga cuenta y pulsa **Recibir código por email**.
3. Abre el correo desde el móvil u otra aplicación, sin pulsar su enlace.
4. Introduce sus ocho dígitos en Landeo y pulsa **Verificar y continuar**.
5. Debe abrir tu dashboard, o el onboarding si el perfil está incompleto.
6. Recarga el dashboard y confirma que la sesión continúa.
7. Para probar el registro, repite en `/signup` con un email nuevo: debe abrir el onboarding.
8. Usa siempre el último código; un código utilizado se rechaza. El botón de reenvío espera 60 segundos.

La prueba automatizada `node --env-file=.env.local scripts/test-auth-otp.mjs` genera códigos con la API administrativa, verifica registro, acceso, rechazo de reutilización y renovación de sesión, y elimina su cuenta temporal. No envía correos. La entrega real y la interacción en un móvil físico requieren la prueba manual anterior.

## Apple pendiente

La configuración actual tiene un Client ID, pero no un secreto OAuth. El botón web permanece oculto hasta completar la configuración y verificar un acceso real.

1. En Apple Developer, entra en **Certificates, Identifiers & Profiles**. Revisa el **Services ID** web con **Sign in with Apple** habilitado y asociado a tu App ID.
2. Configura el dominio `eldzbshnxvvaitgvgzbu.supabase.co` y la Return URL `https://eldzbshnxvvaitgvgzbu.supabase.co/auth/v1/callback`.
3. En **Keys**, crea o utiliza una clave **Sign in with Apple**. Guarda su `.p8`, Key ID y Team ID de forma segura.
4. Genera el secreto OAuth (JWT firmado) para ese Services ID siguiendo la guía oficial. El `.p8` no se pega directamente como secreto.
5. En Supabase → **Authentication → Sign In / Providers → Apple**, revisa el Client ID, pega el secreto generado y guarda.
6. Después de comprobar que `/auth/v1/authorize?provider=apple` redirige correctamente y completar una prueba real, activar `NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true` y volver a publicar la web.
7. Renueva el secreto antes de seis meses. No es necesario crear más claves de OpenAI, Resend o Stripe para este cambio.

Guía oficial: https://supabase.com/docs/guides/auth/social-login/auth-apple

## Medición

Con consentimiento analítico: `auth_code_sent` → `auth_code_submitted` → `auth_code_verified`. Los fallos generan `auth_code_failed` con una categoría, sin email ni código. La zona que muestra el email y el código está enmascarada en Clarity.
