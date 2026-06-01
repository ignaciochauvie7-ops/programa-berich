import { webHandler } from '../_lib/webHandler.js'
import { verifyStandardWebhook } from '../_lib/crypto.js'
import { dodoWebhookSecret } from '../_lib/dodoConfig.js'
import { grantProgramAccess } from '../_lib/grantProgramAccess.js'
import { json } from '../_lib/json.js'

type DodoWebhookEvent = {
  type?: string
  data?: Record<string, unknown>
}

function readEmailValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim()
  return email.includes('@') ? email : null
}

function readPaymentEmail(data: Record<string, unknown>): string | null {
  const direct = readEmailValue(data.email)
  if (direct) return direct

  const customer = data.customer
  if (customer && typeof customer === 'object' && customer !== null) {
    const fromCustomer = readEmailValue((customer as { email?: unknown }).email)
    if (fromCustomer) return fromCustomer
  }

  const billing = data.billing
  if (billing && typeof billing === 'object' && billing !== null) {
    const fromBilling = readEmailValue((billing as { email?: unknown }).email)
    if (fromBilling) return fromBilling
  }

  const buyer = data.buyer
  if (buyer && typeof buyer === 'object' && buyer !== null) {
    const fromBuyer = readEmailValue((buyer as { email?: unknown }).email)
    if (fromBuyer) return fromBuyer
  }

  const payment = data.payment
  if (payment && typeof payment === 'object' && payment !== null) {
    return readPaymentEmail(payment as Record<string, unknown>)
  }

  return null
}

function readQuizVariant(data: Record<string, unknown>): string | null {
  const fromRoot = readMetadataVariant(data.metadata)
  if (fromRoot) return fromRoot

  const checkout = data.checkout
  if (checkout && typeof checkout === 'object' && checkout !== null) {
    return readMetadataVariant((checkout as { metadata?: unknown }).metadata)
  }

  const session = data.checkout_session
  if (session && typeof session === 'object' && session !== null) {
    return readMetadataVariant((session as { metadata?: unknown }).metadata)
  }

  return null
}

function readMetadataVariant(metadata: unknown): string | null {
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

  const quizVariant = readQuizVariant(data)
  if (!quizVariant) {
    console.warn('[dodo webhook] payment.succeeded sin quiz_variant en metadata')
  }

  const result = await grantProgramAccess({
    email: emailRaw,
    source: 'dodo',
    quizVariant,
  })

  if (!result.ok) {
    console.error('[dodo webhook] grantProgramAccess', result.error)
    return json({ error: result.error }, result.status)
  }

  return json({ ok: true, quiz_variant: quizVariant ?? null })
}

export default webHandler(handler)
