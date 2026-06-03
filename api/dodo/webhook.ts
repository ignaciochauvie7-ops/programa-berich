import { webHandler } from '../_lib/webHandler.js'
import { verifyStandardWebhook } from '../_lib/crypto.js'
import { readPaymentCustomerName } from '../_lib/dodoCustomer.js'
import { dodoWebhookSecret } from '../_lib/dodoConfig.js'
import { parseQuizSnapshotFromMetadata } from '../_lib/coach/quizProfile.js'
import { grantProgramAccess } from '../_lib/grantProgramAccess.js'
import { json } from '../_lib/json.js'
import { sendMetaPurchaseEvent } from '../_lib/metaCapi.js'

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

function readPaymentMetadata(data: Record<string, unknown>): unknown {
  if (data.metadata) return data.metadata

  const checkout = data.checkout
  if (checkout && typeof checkout === 'object' && checkout !== null) {
    return (checkout as { metadata?: unknown }).metadata
  }

  const session = data.checkout_session
  if (session && typeof session === 'object' && session !== null) {
    return (session as { metadata?: unknown }).metadata
  }

  return null
}

function readQuizVariant(data: Record<string, unknown>): string | null {
  return readMetadataVariant(readPaymentMetadata(data))
}

function readMetadataVariant(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || metadata === null) return null
  const variant = (metadata as { quiz_variant?: unknown }).quiz_variant
  return typeof variant === 'string' && variant ? variant : null
}

function readPaymentId(data: Record<string, unknown>): string | null {
  const id = data.payment_id ?? data.id
  if (typeof id === 'string' && id.trim()) return id.trim()

  const payment = data.payment
  if (payment && typeof payment === 'object' && payment !== null) {
    const paymentId = (payment as { id?: unknown; payment_id?: unknown }).id ?? (payment as { payment_id?: unknown }).payment_id
    if (typeof paymentId === 'string' && paymentId.trim()) return paymentId.trim()
  }

  return null
}

function readCurrency(data: Record<string, unknown>): string {
  const direct = data.currency
  if (typeof direct === 'string' && direct.trim()) return direct.trim().toUpperCase()

  const payment = data.payment
  if (payment && typeof payment === 'object' && payment !== null) {
    const fromPayment = (payment as { currency?: unknown }).currency
    if (typeof fromPayment === 'string' && fromPayment.trim()) return fromPayment.trim().toUpperCase()
  }

  return 'USD'
}

function readAmountValue(data: Record<string, unknown>): number {
  const amountKeys = ['amount', 'amount_total', 'total_amount', 'captured_amount', 'paid_amount'] as const

  for (const key of amountKeys) {
    const value = data[key]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }

  const payment = data.payment
  if (payment && typeof payment === 'object' && payment !== null) {
    return readAmountValue(payment as Record<string, unknown>)
  }

  return 49
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
  const quizSnapshot = parseQuizSnapshotFromMetadata(readPaymentMetadata(data))
  if (!quizVariant && !quizSnapshot) {
    console.warn('[dodo webhook] payment.succeeded sin quiz_variant ni quiz_json en metadata')
  }

  const customerName = readPaymentCustomerName(data)

  const result = await grantProgramAccess({
    email: emailRaw,
    source: 'dodo',
    quizVariant: quizSnapshot?.variant ?? quizVariant,
    quizSnapshot,
    nombre: customerName,
  })

  if (result.ok === false) {
    console.error('[dodo webhook] grantProgramAccess', result.error)
    return json({ error: result.error }, result.status)
  }

  const paymentId = readPaymentId(data) ?? `payment-${Date.now()}`
  const amountValue = readAmountValue(data)
  const amount = amountValue > 999 ? amountValue / 100 : amountValue
  const currency = readCurrency(data)
  const metaResult = await sendMetaPurchaseEvent({
    email: emailRaw,
    eventId: `dodo_${paymentId}`,
    value: amount,
    currency,
    eventSourceUrl: process.env.APP_PUBLIC_URL?.trim(),
  })
  if (metaResult.ok === false) {
    console.error('[dodo webhook] meta purchase event', metaResult.error)
  }

  return json({ ok: true, quiz_variant: quizVariant ?? null })
}

export default webHandler(handler)
