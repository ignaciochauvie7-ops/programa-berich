# Dominio programaberich.fit

Guía para mails de invitación (Resend), sitio (Vercel) y links de activación (Supabase).

## 1. Resend — verificar dominio (obligatorio para mails a clientes)

1. [resend.com](https://resend.com) → **Domains** → **Add Domain**
2. Dominio: `programaberich.fit`
3. Resend muestra registros DNS (SPF, DKIM, opcional MX). Copialos.
4. En el panel donde compraste el dominio (Namecheap, GoDaddy, Cloudflare, etc.) → **DNS** → agregá cada registro tal cual Resend indica.
5. Volvé a Resend → **Verify**. Puede tardar 5 minutos a 24 h.
6. Cuando figure **Verified**, los mails pueden salir desde `hola@programaberich.fit`.

**Remitente en Vercel:**

```env
RESEND_FROM=Programa Berich <hola@programaberich.fit>
RESEND_API_KEY=re_...
```

## 2. Vercel — conectar el dominio al sitio

1. [vercel.com](https://vercel.com) → proyecto **programa-berich** → **Settings** → **Domains**
2. **Add** → `programaberich.fit` (y opcional `www.programaberich.fit`)
3. Vercel te da registros DNS (A/CNAME). Configuralos en tu registrador.
4. Esperá a que Vercel muestre **Valid**.

**Variables en Vercel (Production)** — actualizá y **Redeploy**:

| Variable | Valor |
|----------|--------|
| `APP_PUBLIC_URL` | `https://programaberich.fit` |
| `ACTIVATION_PUBLIC_URL` | `https://programaberich.fit` |
| `RESEND_FROM` | `Programa Berich <hola@programaberich.fit>` |
| `RESEND_API_KEY` | (sin cambios) |

`ACTIVATION_PUBLIC_URL` es la que va en el link del mail (`/activar-cuenta`).

## 3. Supabase — URLs de auth

**Authentication → URL Configuration**

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://programaberich.fit` |
| **Redirect URLs** | `https://programaberich.fit/activar-cuenta` |
| | `https://programaberich.fit/**` |
| | `https://programa-berich.vercel.app/**` (backup mientras migra) |
| | `http://localhost:5173/activar-cuenta` (dev local) |

## 4. Polar — webhook (opcional pero recomendado)

Cuando el dominio en Vercel esté **Valid**, podés actualizar el webhook:

`https://programaberich.fit/api/polar/webhook`

Si no lo cambiás, sigue funcionando con `https://programa-berich.vercel.app/api/polar/webhook`.

## 5. Probar

1. Dominio Resend = **Verified**
2. Compra de prueba con un mail nuevo
3. Debe llegar mail desde `hola@programaberich.fit`
4. El link debe abrir `https://programaberich.fit/activar-cuenta?...`
5. Crear contraseña → `/programa`

Si el mail no llega: Resend → **Logs** y Vercel → **Functions** → buscar `mail enviado` o `mail no enviado`.
