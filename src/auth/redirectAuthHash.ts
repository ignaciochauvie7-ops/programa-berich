/**
 * Si el mail de Supabase trae tokens en la URL (#access_token=…),
 * los enviamos a /activar-cuenta antes de que React Router pierda el hash.
 */
export function redirectAuthHashIfNeeded(): void {
  if (typeof window === 'undefined') return

  const path = window.location.pathname.replace(/\/$/, '') || '/'
  if (path === '/activar-cuenta') return

  const hash = window.location.hash
  const search = window.location.search
  const hasAuthHash = hash.includes('access_token') || hash.includes('error=')
  const hasAuthCode = new URLSearchParams(search).has('code')

  if (!hasAuthHash && !hasAuthCode) return

  window.location.replace(`/activar-cuenta${search}${hash}`)
}
