/** Mensajes claros para el quiz cuando falla POST /api/polar/checkout. */
export function polarCheckoutUserMessage(status: number, apiError?: string): string {
  const detail = (apiError ?? '').toLowerCase()
  if (status === 401 || status === 403) {
    if (detail.includes('invalid_token') || detail.includes('expired') || detail.includes('revoked')) {
      const mode = polarEnvHint()
      if (mode.includes('sandbox')) {
        return 'Token inválido para Sandbox: el token y el producto tienen que crearse en sandbox.polar.sh (no en el dashboard de producción). Si ya tenés token de producción, poné POLAR_ENVIRONMENT=production en .env.local y Vercel.'
      }
      return 'El token de Polar no es válido o venció. Creá uno nuevo en Polar → Settings → Developers y actualizá POLAR_ACCESS_TOKEN en Vercel y .env.local.'
    }
    return `Error de autenticación con Polar (${polarEnvHint()}). Revisá POLAR_ACCESS_TOKEN y POLAR_ENVIRONMENT.`
  }
  if (status === 404) {
    return 'El producto de pago no está disponible. Revisá POLAR_PRODUCT_ID (mismo modo Sandbox/Production que el token).'
  }
  if (status === 422) {
    return apiError ?? 'Datos inválidos para crear el checkout en Polar.'
  }
  if (status >= 500) {
    return 'Polar no está disponible en este momento. Intentá de nuevo en unos minutos.'
  }
  return apiError ?? 'No se pudo iniciar el pago. Intentá de nuevo.'
}

function polarEnvHint(): string {
  const raw = (process.env.POLAR_ENVIRONMENT ?? 'production').trim().toLowerCase()
  const mode = raw === 'sandbox' || raw === 'test' ? 'sandbox' : 'production'
  return `ahora usa ${mode}`
}
