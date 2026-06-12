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

1. Polar cobra → webhook → alumno `activo = false` (pendiente) + mail Resend.
2. Mail → `https://programaberich.fit/activar-cuenta` → contraseña → alumno `activo = true` → `/configurar-perfil` → `/programa`.

## Diagnóstico rápido (producción)

Abrí en el navegador (o `curl -k` si el SSL local falla):

**https://programaberich.fit/api/health**

Debe devolver `"purchase_flow_ready": true`. Si es `false`, faltan variables en Vercel → **Redeploy**.

## Error SSL en Chrome (`NET::ERR_CERT_AUTHORITY_INVALID`)

1. Vercel → **Domains** → `programaberich.fit` → **Refresh**
2. Si sigue rojo/amarillo: quitá el dominio y volvé a agregarlo
3. Namecheap: solo registro **A** `@` → `216.198.79.1` (sin redirect ni parking)
4. Esperá 15–60 min a que termine *Generating SSL Certificate*
5. Mientras tanto, probá en incógnito u otro dispositivo/red

El sitio puede responder en API aunque Chrome marque error (antivirus/proxy local).

## Polar webhook (crítico)

El webhook **tiene que apuntar directo** a:

`https://programaberich.fit/api/polar/webhook`

**No uses** `programa-berich.vercel.app` si ese dominio redirige 307 a `.fit` — Polar puede fallar al seguir el redirect y **no se envía el mail**.

Eventos: `order.paid`, `checkout.updated`

## Pruebas locales

```bash
npm run test:resend -- tu@mail.com
npm run test:provision -- tu@mail.com
```

## Pruebas rápidas (producción)

- Quiz → checkout → pago → mail desde `hola@programaberich.fit`
- Link mail → `/activar-cuenta` en **programaberich.fit**
- Polar → Webhooks → delivery **200**
- `/api/health` → `purchase_flow_ready: true`
