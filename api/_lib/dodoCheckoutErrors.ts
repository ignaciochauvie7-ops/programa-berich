/** Mensajes claros para el quiz cuando falla POST /api/dodo/checkout. */
export function dodoCheckoutUserMessage(status: number, apiError?: string): string {
  const err = (apiError ?? '').toLowerCase()

  if (status === 500 && err.includes('no configurado')) {
    return 'El pago no está configurado en el servidor. Contactá al administrador.'
  }
  if (status === 401 || err.includes('unauthorized') || err.includes('api key')) {
    return 'Error de configuración del proveedor de pago (API key).'
  }
  if (status === 404 || err.includes('product')) {
    return 'El producto de pago no está disponible. Revisá DODO_PRODUCT_ID.'
  }
  if (status >= 502) {
    return 'El proveedor de pago no respondió. Intentá de nuevo en unos minutos.'
  }
  if (apiError && apiError.length < 120) return apiError
  return 'No se pudo iniciar el pago. Intentá de nuevo.'
}
