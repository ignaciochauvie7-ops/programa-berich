export function appPublicOrigin(): string {
  const explicit = process.env.APP_PUBLIC_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`
  return ''
}
