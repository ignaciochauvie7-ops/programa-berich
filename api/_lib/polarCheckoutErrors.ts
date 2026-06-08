/** Mensajes claros para el quiz cuando falla POST /api/polar/checkout. */
export function polarCheckoutUserMessage(status: number, apiError?: string): string {
  if (status === 401 || status === 403) {
    return 'Error de autenticación con Polar. Revisá POLAR_ACCESS_TOKEN y POLAR_ENVIRONMENT (sandbox vs production).'
  }
  if (status === 404) {
    return 'El producto de pago no está disponible. Revisá POLAR_PRODUCT_ID.'
  }
  if (status === 422) {
    return apiError ?? 'Datos inválidos para crear el checkout en Polar.'
  }
  if (status >= 500) {
    return 'Polar no está disponible en este momento. Intentá de nuevo en unos minutos.'
  }
  return apiError ?? 'No se pudo iniciar el pago. Intentá de nuevo.'
}
