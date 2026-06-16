import { webHandler } from '../_lib/webHandler.js'
import { verifyStandardWebhook } from '../_lib/crypto.js'
import { fulfillPolarPurchase } from '../_lib/fulfillPolarPurchase.js'
import { json } from '../_lib/json.js'
import { polarWebhookSecret } from '../_lib/polarConfig.js'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin.js'
import { readPaymentCustomerEmail } from '../_lib/paymentCustomer.js'

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

function isActiveSubscription(data: Record<string, unknown>): boolean {
  const status = data.status
  if (typeof status !== 'string') return false
  return ['active', 'trialing'].includes(status.toLowerCase())
}

async function handlePurchase(data: Record<string, unknown>, eventType: string): Promise<Response> {
  const result = await fulfillPolarPurchase(data, `webhook:${eventType}`)
  if (result.ok === false) {
    return json({ error: result.error }, result.status)
  }

  return json({ ok: true, email: result.email, mail_sent: result.mailSent })
}

/**
 * Handles subscription.created / subscription.updated / subscription.canceled
 * Updates coach_subscription_status and coach_active accordingly.
 */
async function handleSubscriptionEvent(
  data: Record<string, unknown>,
  eventType: string,
): Promise<Response> {
  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const emailRaw = readPaymentCustomerEmail(data)
  if (!emailRaw) {
    console.warn('[polar webhook] subscription event sin email', eventType)
    return json({ ok: true, ignored: 'no email' })
  }

  const email = normalizeEmail(emailRaw)

  const { data: alumno } = await admin
    .from('alumnos')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (!alumno?.id) {
    console.warn('[polar webhook] subscription event: alumno no encontrado', email)
    return json({ ok: true, ignored: 'alumno not found' })
  }

  const isActive = isActiveSubscription(data)
  const isCanceled =
    eventType === 'subscription.canceled' ||
    (typeof data.status === 'string' && ['canceled', 'cancelled', 'revoked', 'inactive'].includes(data.status.toLowerCase()))

  const subscriptionStatus: 'active' | 'canceled' = isCanceled && !isActive ? 'canceled' : 'active'
  const coachActive = subscriptionStatus === 'active'

  const { error } = await admin
    .from('alumno_coach_profile')
    .update({
      coach_subscription_status: subscriptionStatus,
      coach_active: coachActive,
      updated_at: new Date().toISOString(),
    })
    .eq('alumno_id', alumno.id)

  if (error) {
    console.error('[polar webhook] subscription update error', error, email)
    return json({ error: 'db update failed' }, 500)
  }

  console.info('[polar webhook] subscription updated', email, subscriptionStatus)
  return json({ ok: true, email, status: subscriptionStatus })
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

  if (['subscription.created', 'subscription.updated', 'subscription.canceled'].includes(eventType)) {
    return handleSubscriptionEvent(data, eventType)
  }

  return json({ ok: true, ignored: eventType || 'unknown' })
}

export default webHandler(handler)
