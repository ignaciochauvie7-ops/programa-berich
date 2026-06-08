# Deploy del embudo (Funnel)

## Build local

```bash
npm install
npm run build
npm run preview
```

El sitio genera archivos estáticos en `dist/`, incluyendo `funnels/*.json` copiados desde `public/funnels/`.

## URL para anuncios (Meta)

- En desarrollo: `http://localhost:5173/f/entrenamiento` (el slug coincide con `public/funnels/entrenamiento.json`).
- En producción: `https://TU_DOMINIO/f/entrenamiento` (mismo patrón).
- Para reiniciar el recorrido en el mismo navegador: agregar `?restart=1` (limpia `sessionStorage` del embudo).

## Primer pantalla (video + formulario)

En `public/funnels/entrenamiento.json`, el paso `video_youtube` usa dos URLs distintas:

- `youtubeUrl`: link del video (watch, `youtu.be`, etc.).
- `formCta`: botón **Ir al formulario** con `href` al Typeform / Google Forms / etc. y opcional `sameTab` (`true` = misma pestaña).

Podés sumar `headline`, `body` y más pasos cuando definamos el resto del embudo.

## Vercel

1. Conectá el repo o subí `dist/` con CLI.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Incluí `vercel.json` del repo: reescribe rutas del SPA a `index.html`. Los archivos bajo `funnels/` en el build se sirven como estáticos antes de la reescritura.

Dominio sugerido tipo `go.tumarca.com` apuntando al proyecto.

## Netlify

- Build: `npm run build`, publish: `dist`.
- Regla SPA típica: en `public/_redirects` (copiado a `dist`) podés usar `/* /index.html 200`. Netlify suele servir archivos estáticos existentes (como `/funnels/*.json`) antes de aplicar el fallback; si fallara el fetch al JSON, afiná el orden o las excepciones en la doc del proveedor.

## Cloudflare Pages

Misma idea: build `dist`, regla SPA fallback a `index.html`, asegurate de que `/funnels/*.json` no quede absorbido por el fallback (suelen respetarse archivos existentes).

## Extensión futura (CMS / Supabase)

- Hoy los embudos viven en JSON estático (`public/funnels/<slug>.json`).
- Para editar sin deploy: mover `loadFunnelBySlug` a un fetch contra API/CMS o tabla Supabase, manteniendo el mismo esquema validado por `parseFunnelDefinition`.
- Pagos: Polar (`/api/polar/checkout` + webhook `order.paid` en `/api/polar/webhook`). Ver `docs/POLAR_SETUP.md`.
- En local, las APIs requieren `npx vercel dev` (o proxy en `vite.config.ts` hacia ese servidor).
