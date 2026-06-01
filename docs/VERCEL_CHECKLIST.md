# Checklist Vercel + Dodo (post-deploy)

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

## Dodo dashboard

1. Producto del `DODO_PRODUCT_ID` → precio **49 USD** (alineado con `PROGRAM_USD_PRICE`).
2. Webhook URL: `https://programa-berich.vercel.app/api/dodo/webhook`
3. Evento: `payment.succeeded`
4. Adaptive Currency: según tu preferencia (checkout puede diferir levemente del quiz).

## Pruebas rápidas

- `GET /api/price?country=UY` → entero en UYU + base 49 USD
- Quiz → checkout → pago test → fila en `alumnos` + mail invite
- Link mail → `/activar-cuenta` en dominio producción (no localhost)
- Login alumno activo → `/programa`
