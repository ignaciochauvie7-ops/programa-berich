/** IP del cliente para checkout (Polar detecta moneda/país desde la IP). */
export function readClientIp(request: Request): string | undefined {
  const cf = request.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf

  const vercel = request.headers.get('x-vercel-forwarded-for')?.trim()
  if (vercel) return vercel.split(',')[0]?.trim()

  const forwarded = request.headers.get('x-forwarded-for')?.trim()
  if (forwarded) return forwarded.split(',')[0]?.trim()

  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real

  return undefined
}
