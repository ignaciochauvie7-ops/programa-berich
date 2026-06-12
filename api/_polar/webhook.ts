import { webHandler } from '../_lib/webHandler.js'
import { verifyStandardWebhook } from '../_lib/crypto.js'
import { fulfillPolarPurchase } from '../_lib/fulfillPolarPurchase.js'
import { json } from '../_lib/json.js'
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
  const result = await fulfillPolarPurchase(data, `webhook:${eventType}`)
  if (result.ok === false) {
    return json({ error: result.error }, result.status)
  }

  return json({ ok: true, email: result.email, mail_sent: result.mailSent })
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
