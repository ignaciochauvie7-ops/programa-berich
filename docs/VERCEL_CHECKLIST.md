# Checklist Vercel + Polar (post-deploy)

Dominio producción: **https://programaberich.fit**  
Guía completa dominio + mails: `docs/DOMAIN_SETUP.md`

## Si localhost se ve bien pero Vercel no

1. **Deployments** → el último commit debe estar **Ready** (no Error). Si falló, abrí **Build Logs**.
2. **Settings → General** → Output Directory = `dist`, Build Command = `npm run build`.
3. **Settings → Git** → Production Branch = `main`, repo correcto.
4. Tras deploy OK: recarga forzada **Ctrl+Shift+R** o incógnito.

Build del repo: `tsc -b && vite build`. Node 20 en `.nvmrc`.

## Variables en Vercel (Production)

| Variable | Valor |
|----------|--------|
| `VITE_SUPABASE_URL` | Frontend |
| `VITE_SUPABASE_ANON_KEY` | Frontend |
| `VITE_ADMIN_EMAILS` | Panel /control |
| `SUPABASE_SERVICE_ROLE_KEY` | API webhooks, activate, invite |
| `ADMIN_EMAILS` | Mismo mail que VITE_ADMIN_EMAILS |
| `APP_PUBLIC_URL` | `https://programaberich.fit` |
| `ACTIVATION_PUBLIC_URL` | `https://programaberich.fit` |
| `RESEND_API_KEY` | resend.com |
| `RESEND_FROM` | `Programa Berich <hola@programaberich.fit>` |
| `POLAR_ACCESS_TOKEN` | Checkout + API Polar |
| `POLAR_PRODUCT_ID` | Producto one-time **49 USD** |
| `POLAR_WEBHOOK_SECRET` | Webhook Polar |
| `POLAR_ENVIRONMENT` | `production` |
| `PRODUCT_SLUG` | `berich-completo` |

### Acompañamiento WhatsApp (opcional)

| Variable | Uso |
|----------|-----|
| `OPENAI_API_KEY` | Respuestas conversacionales |
| `OPENAI_MODEL` | Opcional, default `gpt-4o-mini` |
| `WHATSAPP_*` | Meta Cloud API |
| `COACH_CRON_SECRET` | Proteger `/api/coach/cron` |

**Meta webhook:** `https://programaberich.fit/api/whatsapp/webhook`

## Supabase — Authentication → URL Configuration

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://programaberich.fit` |
| **Redirect URLs** | `https://programaberich.fit/activar-cuenta` |
| | `https://programaberich.fit/**` |
| | `https://programa-berich.vercel.app/**` (backup) |
| | `http://localhost:5173/activar-cuenta` (dev) |

## Polar dashboard

Ver `docs/POLAR_SETUP.md`

1. Producto **49 USD** (+ monedas locales opcionales).
2. Webhook: `https://programaberich.fit/api/polar/webhook` (o vercel.app mientras migrás).
3. Eventos: `order.paid`, `checkout.updated`
4. `POLAR_ENVIRONMENT=production`

## Resend — dominio

1. Verificar **programaberich.fit** en Resend (DNS SPF + DKIM).
2. Sin dominio verificado, los mails a clientes **no salen**.

Ver paso a paso: `docs/DOMAIN_SETUP.md`

## URLs del sitio

| URL | Para qué |
|-----|----------|
| `/quiz` | Funnel / compra |
| `/login` | Entrar alumnos y admin |
| `/activar-cuenta` | Crear contraseña (link del mail) |
| `/programa` | Videos del programa |
| `/control/funnels` | Panel admin |

## Flujo alumno (post-pago)

1. Polar cobra → webhook → alumno `activo = true` + mail Resend.
2. Mail → `https://programaberich.fit/activar-cuenta` → contraseña → `/programa`.

## Pruebas rápidas

- Quiz → checkout → pago → mail desde `hola@programaberich.fit`
- Link mail → `/activar-cuenta` en **programaberich.fit**
- Polar → Webhooks → delivery **200**
