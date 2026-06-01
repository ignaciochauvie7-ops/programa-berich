/** Vercel pasa `request.url` como path relativo (/api/...); esto lo normaliza. */
export function getRequestUrl(request: Request): URL {
  try {
    return new URL(request.url)
  } catch {
    const base =
      process.env.APP_PUBLIC_URL?.trim().replace(/\/$/, '') ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/\/$/, '')}` : 'http://localhost:3000')
    return new URL(request.url, `${base}/`)
  }
}
