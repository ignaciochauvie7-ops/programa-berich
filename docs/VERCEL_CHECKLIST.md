# Checklist Vercel + Dodo (post-deploy)

## Si localhost se ve bien pero Vercel no

1. **Deployments** → el último commit debe estar **Ready** (no Error). Si falló, abrí **Build Logs**.
2. **Settings → General** → Output Directory = `dist`, Build Command = `npm run build`.
3. **Settings → Git** → Production Branch = `main`, repo correcto.
4. Tras deploy OK: recarga forzada **Ctrl+Shift+R** o incógnito.

Build del repo: `tsc -b && vite build`. Node 20 en `.nvmrc`.

## Variables en Vercel (Production)

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | Frontend |
| `VITE_SUPABASE_ANON_KEY` | Frontend |
| `VITE_ADMIN_EMAILS` | Panel /control |
| `SUPABASE_SERVICE_ROLE_KEY` | API webhooks, activate, invite |
| `ADMIN_EMAILS` | Mismo mail que VITE_ADMIN_EMAILS |
| `APP_PUBLIC_URL` | `https://programa-berich.vercel.app` |
| `ACTIVATION_PUBLIC_URL` | `https://programa-berich.vercel.app` |
| `DODO_PAYMENTS_API_KEY` | Checkout + API |
| `DODO_PRODUCT_ID` | Producto a **49 USD** en dashboard |
| `DODO_WEBHOOK_SECRET` | Webhook en Dodo |
| `DODO_PAYMENTS_ENVIRONMENT` | `test` o `live` |
| `PRODUCT_SLUG` | `berich-completo` |

### Acompañamiento WhatsApp (opcional hasta configurar Meta)

| Variable | Uso |
|----------|-----|
| `OPENAI_API_KEY` | Respuestas conversacionales |
| `OPENAI_MODEL` | Opcional, default `gpt-4o-mini` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Cloud API |
| `WHATSAPP_ACCESS_TOKEN` | Meta Cloud API |
| `WHATSAPP_VERIFY_TOKEN` | Verificación webhook GET |
| `WHATSAPP_APP_SECRET` | Firma webhook POST |
| `COACH_CRON_SECRET` | Proteger `/api/coach/cron` si usás cron externo (plan Hobby no permite cron cada 15 min en Vercel) |
| `WHATSAPP_TEMPLATE_*` | Opcional: plantillas Meta para proactivos fuera de 24 h |

**Supabase:** ejecutar `supabase/patch-coach-whatsapp.sql` y luego `supabase/patch-coach-personalized.sql` una vez.

**Meta:** webhook `https://programa-berich.vercel.app/api/whatsapp/webhook` (mensajes + suscripciones).

## Supabase — Authentication → URL Configuration

Configurá esto en el panel de Supabase (no en SQL Editor):

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://programa-berich.vercel.app` |
| **Redirect URLs** (añadir todas) | `https://programa-berich.vercel.app/activar-cuenta` |
| | `https://programa-berich.vercel.app/**` |
| | `http://localhost:5173/activar-cuenta` (solo desarrollo local) |

Sin estas URLs, el link del mail puede fallar o abrir una pantalla en negro. El mismo `/activar-cuenta` sirve para **invitación post-compra** y para **recuperar contraseña** (“¿Olvidaste tu contraseña?” en `/login`).

## Dodo dashboard

1. Producto del `DODO_PRODUCT_ID` → precio **49 USD** (alineado con `PROGRAM_USD_PRICE`).
2. Webhook URL: `https://programa-berich.vercel.app/api/dodo/webhook`
3. Evento: `payment.succeeded`
4. Adaptive Currency: según tu preferencia (checkout puede diferir levemente del quiz).

## URLs que funcionan en el sitio

| URL | Para qué |
|-----|----------|
| `/quiz` | Funnel / compra |
| `/login` | Entrar alumnos y admin |
| `/activar-cuenta` | Crear contraseña (link del mail) |
| `/programa` | Videos del programa |
| `/control/funnels` | Panel admin (solo tu mail) |

Cualquier otra ruta muestra “Página no encontrada” (ya no pantalla negra vacía).

## Flujo alumno (post-pago o invitación admin)

1. Dodo cobra → webhook crea alumno con **`activo = true`** + entitlement + mail Supabase (crear contraseña).
2. Admin invita desde `/control/alumnos` → mismo: **activo = true** + mail.
3. Alumno abre mail → `/activar-cuenta` → contraseña → `/programa` (ya tenía acceso; solo falta login).

Si alguien pagó antes de este cambio y figura Pendiente, ejecutá `supabase/patch-alumnos-activo-pago.sql` en SQL Editor.

## Pruebas rápidas

- `GET /api/price?country=UY` → entero en UYU + base 49 USD
- Quiz → checkout → pago test → fila en `alumnos` + mail invite
- Link mail → `/activar-cuenta` en dominio producción (no localhost)
- Login alumno activo → `/programa`
