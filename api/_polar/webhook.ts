import { webHandler } from '../_lib/webHandler.js'
import { verifyStandardWebhook } from '../_lib/crypto.js'
import { parseQuizSnapshotFromMetadata } from '../_lib/coach/quizProfile.js'
import { grantProgramAccess } from '../_lib/grantProgramAccess.js'
import { json } from '../_lib/json.js'
import { sendMetaPurchaseEvent } from '../_lib/metaCapi.js'
import {
  readAmountValue,
  readCurrency,
  readMetadataVariant,
  readPaymentCustomerEmail,
  readPaymentCustomerName,
  readPaymentId,
  readPaymentMetadata,
} from '../_lib/paymentCustomer.js'
import { polarWebhookSecret } from '../_lib/polarConfig.js'

type PolarWebhookEvent = {
  type?: string
  data?: Record<string, unknown>
}

function isPaidOrder(data: Record<string, unknown>): boolean {
  const status = data.status
  if (typeof status === 'string') {
    const normalized = status.toLowerCase()
    if (['paid', 'succeeded', 'completed', 'confirmed'].includes(normalized)) return true
  }
  return false
}

function isPaidWebhookEvent(eventType: string, data: Record<string, unknown>): boolean {
  if (eventType === 'order.paid') return true
  if (eventType === 'order.updated') return isPaidOrder(data)
  if (eventType === 'checkout.updated') return isPaidOrder(data)
  return false
}

async function handlePurchase(data: Record<string, unknown>, eventType: string): Promise<Response> {
  const emailRaw = readPaymentCustomerEmail(data)
  if (!emailRaw) {
    console.error('[polar webhook] sin email en', eventType, data.id)
    return json({ error: 'order without email' }, 400)
  }

  const metadata = readPaymentMetadata(data)
  const quizVariant = readMetadataVariant(metadata)
  const quizSnapshot = parseQuizSnapshotFromMetadata(metadata)
  if (!quizVariant && !quizSnapshot) {
    console.warn('[polar webhook]', eventType, 'sin quiz_variant ni quiz_json en metadata')
  }

  const customerName = readPaymentCustomerName(data)

  const result = await grantProgramAccess({
    email: emailRaw,
    source: 'polar',
    quizVariant: quizSnapshot?.variant ?? quizVariant,
    quizSnapshot,
    nombre: customerName,
  })

  if (result.ok === false) {
    console.error('[polar webhook] grantProgramAccess', result.error, emailRaw)
    return json({ error: result.error }, result.status)
  }

  console.info('[polar webhook] alumno provisionado', emailRaw, eventType)

  const paymentId = readPaymentId(data) ?? `order-${Date.now()}`
  const amountValue = readAmountValue(data)
  const amount = amountValue > 999 ? amountValue / 100 : amountValue
  const currency = readCurrency(data)
  const metaResult = await sendMetaPurchaseEvent({
    email: emailRaw,
    eventId: `polar_${paymentId}`,
    value: amount,
    currency,
    eventSourceUrl: process.env.APP_PUBLIC_URL?.trim(),
  })
  if (metaResult.ok === false) {
    console.error('[polar webhook] meta purchase event', metaResult.error)
  }

  return json({ ok: true, quiz_variant: quizVariant ?? null })
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = polarWebhookSecret()
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

  let event: PolarWebhookEvent
  try {
    event = JSON.parse(rawBody) as PolarWebhookEvent
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const eventType = event.type ?? ''
  const data = event.data
  if (!data || typeof data !== 'object') {
    return json({ error: 'missing event data' }, 400)
  }

  if (isPaidWebhookEvent(eventType, data)) {
    return handlePurchase(data, eventType)
  }

  return json({ ok: true, ignored: eventType || 'unknown' })
}

export default webHandler(handler)
