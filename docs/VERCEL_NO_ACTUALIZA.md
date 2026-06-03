# Vercel no muestra los cambios (localhost sí)

## Diagnóstico rápido

Abrí `https://programa-berich.vercel.app/login` → F12 → Network → el JS `index-*.js`:

- **Viejo (mal):** contiene `Lecciones en video del modulo` y **no** `Calculadora de Calorías`
- **Nuevo (bien):** contiene `Calculadora de Calorías` y los botones de recursos

Si está viejo, Production no tiene el último deploy exitoso.

## Solución 1 — Redeploy manual (2 minutos)

1. [vercel.com](https://vercel.com) → proyecto **programa-berich**
2. **Deployments**
3. Si el último de `main` está en **Error** → abrí logs, copiá el error
4. Si hay uno **Ready** reciente → **⋯ → Promote to Production**
5. Si no hay ninguno reciente → **Deployments → Create Deployment** → branch `main` → Deploy
6. En el navegador: **Ctrl+Shift+R** en `programa-berich.vercel.app`

## Solución 2 — Reconectar Git

1. **Settings → Git**
2. Confirmá repo: `ignaciochauvie7-ops/programa-berich`
3. Production Branch: **main**
4. Si no está conectado → **Connect Git Repository**

## Solución 3 — Build settings

**Settings → General → Build & Development**

| Campo | Valor |
|--------|--------|
| Build Command | `npm run build` (o vacío si usás `vercel.json`) |
| Output Directory | **`dist`** |
| Node.js Version | **20.x** |

El repo ya trae `vercel.json` con `buildCommand` y `outputDirectory`.

## Solución 4 — Deploy Hook (auto-deploy desde GitHub)

Si Git de Vercel no dispara builds:

1. Vercel → **Settings → Git → Deploy Hooks** → Create → branch `main` → copiá la URL
2. GitHub → repo → **Settings → Secrets → Actions** → New secret `VERCEL_DEPLOY_HOOK` = esa URL
3. Cada push a `main` ejecutará el workflow **Build** y llamará al hook

## Commits que deben estar en Production

- `16282c5` — `tsconfig.json` raíz con tipos Node (lo que Vercel usa en `api/`) + `npm run build` verifica API
- `7df63d3` — arregla build TypeScript (botones + textos)
- `b854392` — config explícita Vercel
