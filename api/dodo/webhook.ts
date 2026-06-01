import { webHandler } from '../_lib/webHandler.js'
import { verifyStandardWebhook } from '../_lib/crypto.js'
import { dodoWebhookSecret } from '../_lib/dodoConfig.js'
import { grantProgramAccess } from '../_lib/grantProgramAccess.js'
import { json } from '../_lib/json.js'

type DodoWebhookEvent = {
  type?: string
  data?: Record<string, unknown>
}

function readPaymentEmail(data: Record<string, unknown>): string | null {
  const customer = data.customer
  if (customer && typeof customer === 'object' && customer !== null && 'email' in customer) {
    const email = (customer as { email?: unknown }).email
    if (typeof email === 'string' && email.includes('@')) return email
  }

  const billing = data.billing
  if (billing && typeof billing === 'object' && billing !== null && 'email' in billing) {
    const email = (billing as { email?: unknown }).email
    if (typeof email === 'string' && email.includes('@')) return email
  }

  const direct = data.email
  if (typeof direct === 'string' && direct.includes('@')) return direct

  return null
}

function readQuizVariant(data: Record<string, unknown>): string | null {
  const metadata = data.metadata
  if (!metadata || typeof metadata !== 'object' || metadata === null) return null
  const variant = (metadata as { quiz_variant?: unknown }).quiz_variant
  return typeof variant === 'string' && variant ? variant : null
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = dodoWebhookSecret()
  if (!secret) {
    return json({ error: 'webhook not configured' }, 500)
  }

  const rawBody = await request.text()
  const webhookId = request.headers.get('webhook-id') ?? ''
  const webhookTimestamp = request.headers.get('webhook-timestamp') ?? ''
  const webhookSignature = request.headers.get('webhook-signature') ?? ''

  if (!verifyStandardWebhook(rawBody, { id: webhookId, timestamp: webhookTimestamp, signature: webhookSignature }, secret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let event: DodoWebhookEvent
  try {
    event = JSON.parse(rawBody) as DodoWebhookEvent
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  if (event.type !== 'payment.succeeded') {
    return json({ ok: true, ignored: event.type ?? 'unknown' })
  }

  const data = event.data
  if (!data || typeof data !== 'object') {
    return json({ error: 'missing event data' }, 400)
  }

  const emailRaw = readPaymentEmail(data)
  if (!emailRaw) {
    return json({ error: 'payment without email' }, 400)
  }

  const result = await grantProgramAccess({
    email: emailRaw,
    source: 'dodo',
    quizVariant: readQuizVariant(data),
  })

  if (!result.ok) {
    return json({ error: result.error }, result.status)
  }

  return json({ ok: true })
}

export default webHandler(handler)
