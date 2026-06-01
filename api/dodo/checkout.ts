import { json } from '../_lib/json'
import { appPublicOrigin } from '../_lib/appOrigin'
import { dodoApiBaseUrl, dodoApiKey, dodoProductId } from '../_lib/dodoConfig'

type Body = { variant?: string }

type DodoCheckoutResponse = {
  checkout_url?: string | null
  session_id?: string
  error?: string
  message?: string
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = dodoApiKey()
  const productId = dodoProductId()
  if (!apiKey || !productId) {
    return json({ error: 'Dodo Payments no configurado en el servidor' }, 500)
  }

  let body: Body = {}
  try {
    const text = await request.text()
    if (text.trim()) body = JSON.parse(text) as Body
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const variant = typeof body.variant === 'string' ? body.variant.trim().slice(0, 32) : ''
  const origin = appPublicOrigin()
  const returnUrl = origin ? `${origin}/login?checkout=success` : undefined

  const payload: Record<string, unknown> = {
    product_cart: [{ product_id: productId, quantity: 1 }],
  }

  if (returnUrl) payload.return_url = returnUrl
  if (variant) {
    payload.metadata = { quiz_variant: variant, source: 'quiz' }
  }

  const res = await fetch(`${dodoApiBaseUrl()}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data: DodoCheckoutResponse
  try {
    data = (await res.json()) as DodoCheckoutResponse
  } catch {
    return json({ error: 'respuesta inválida de Dodo Payments' }, 502)
  }

  if (!res.ok) {
    console.error('[dodo checkout]', res.status, data)
    return json({ error: data.message ?? data.error ?? 'No se pudo crear el checkout' }, res.status >= 500 ? 502 : 400)
  }

  const checkoutUrl = data.checkout_url
  if (!checkoutUrl) {
    return json({ error: 'Dodo no devolvió checkout_url' }, 502)
  }

  return json({ checkout_url: checkoutUrl, session_id: data.session_id ?? null })
}
