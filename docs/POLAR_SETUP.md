# Configuración Polar.sh

## Sandbox vs Production (¿dónde lo veo?)

En [polar.sh/dashboard](https://polar.sh/dashboard), arriba a la derecha hay un **selector de entorno**:

- **Sandbox** → pruebas, pagos falsos, API `https://sandbox-api.polar.sh/v1`
- **Production** → cobros reales, API `https://api.polar.sh/v1`

Cada entorno tiene **tokens y productos distintos**. El token de sandbox **no** sirve con `POLAR_ENVIRONMENT=production`.

## 1. Producto

1. **Products → New product** → One-time, **49 USD**.
2. **Add payment currency** → agregá monedas (UYU, ARS, MXN, COP, CLP, BRL, PEN, EUR…).
3. Copiá **Product ID** (⋯ → Copy Product ID).

## 2. Access token

**Settings → Developers → Organization Access Tokens** → Create.

Permisos: `checkouts:write` (y lectura de orders si hace falta).

- Token de **Production** → `POLAR_ACCESS_TOKEN` + `POLAR_ENVIRONMENT=production`
- Token de **Sandbox** → mismo nombre de var + `POLAR_ENVIRONMENT=sandbox`

## 3. Webhook

**Settings → Webhooks → Add endpoint**

| Campo | Valor |
|-------|--------|
| URL (prod) | `https://programa-berich.vercel.app/api/polar/webhook` |
| URL (local + ngrok) | `https://xxxx.ngrok-free.app/api/polar/webhook` |
| Eventos | `order.paid`, `checkout.updated` |

Copiá el **secret** → `POLAR_WEBHOOK_SECRET`.

## 4. Variables (.env.local y Vercel)

```env
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_PRODUCT_ID=uuid-del-producto
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_ENVIRONMENT=production
```

## 5. Flujo

1. Quiz → `POST /api/polar/checkout` → redirect a Polar.
2. Cliente paga (moneda según IP si cargaste precios en el producto).
3. Polar → `POST /api/polar/webhook` (`order.paid`) → activa alumno + mail.

## 6. Probar local

```bash
npm run dev
```

Checkout usa Polar según `POLAR_ENVIRONMENT`. Webhook local: ngrok a `localhost:3001`.
