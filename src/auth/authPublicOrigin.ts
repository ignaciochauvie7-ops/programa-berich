/** Origen público para redirectTo de Supabase (recuperar contraseña, invitaciones). */
export function authPublicOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  const fromEnv = import.meta.env.VITE_APP_PUBLIC_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return ''
}

export function activarCuentaRedirectUrl(): string {
  const origin = authPublicOrigin()
  return origin ? `${origin}/activar-cuenta` : '/activar-cuenta'
}
