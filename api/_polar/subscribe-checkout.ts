/**
 * POST /api/polar/subscribe-checkout
 *
 * Creates a Polar checkout for the monthly subscription product.
 * Only available to active alumnos who purchased the $49 program
 * AND whose 30-day trial has ended (or is ending in <= 3 days).
 *
 * Returns { checkout_url }
 */
import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getRequestUser } from '../_lib/auth.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findAlumnoForUser } from '../_lib/coach/alumnoCoach.js'
import { getQuizProfile } from '../_lib/coach/quizProfile.js'
import { appPublicOrigin } from '../_lib/appOrigin.js'
import { readClientIp } from '../_lib/clientIp.js'
import { polarAccessToken, polarApiBaseUrl, polarSubscriptionProductId } from '../_lib/polarConfig.js'

const TRIAL_DAYS = 30

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user?.email || !user.id) return json({ error: 'unauthorized' }, 401)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const alumno = await findAlumnoForUser(admin, user.id, user.email)
  if (!alumno?.activo) {
    return json({ error: 'Tu cuenta no está activa.' }, 403)
  }

  const accessToken = polarAccessToken()
  const subProductId = polarSubscriptionProductId()
  if (!accessToken || !subProductId) {
    return json({ error: 'Suscripción no disponible todavía.' }, 503)
  }

  // Check the quiz profile for purchased_at (when they bought the $49 program)
  const quiz = await getQuizProfile(admin, alumno.id)
  if (!quiz?.purchased_at) {
    return json({ error: 'No encontramos tu fecha de compra.' }, 404)
  }

  const purchasedAt = new Date(quiz.purchased_at)
  const trialEndsAt = new Date(purchasedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const now = new Date()
  const daysUntilEnd = (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  // Block if trial hasn't ended or isn't within the last 3 days
  if (daysUntilEnd > 3) {
    const daysLeft = Math.ceil(daysUntilEnd)
    return json(
      { error: `Tu período de acompañamiento gratuito está activo. Quedan ${daysLeft} días.`, days_left: daysLeft },
      403,
    )
  }

  // Check if they already have an active subscription
  const { data: coachProfile } = await admin
    .from('alumno_coach_profile')
    .select('coach_subscription_status')
    .eq('alumno_id', alumno.id)
    .maybeSingle()

  if (coachProfile?.coach_subscription_status === 'active') {
    return json({ error: 'Ya tenés una suscripción activa.' }, 409)
  }

  const origin = appPublicOrigin()
  const successUrl = origin ? `${origin}/programa/mi-perfil?subscribed=1` : undefined

  const payload: Record<string, unknown> = {
    products: [subProductId],
    customer_email: user.email,
    metadata: { source: 'subscription_upgrade', alumno_id: alumno.id },
  }

  if (successUrl) payload.success_url = successUrl

  const clientIp = readClientIp(request)
  if (clientIp) payload.customer_ip_address = clientIp

  const res = await fetch(`${polarApiBaseUrl()}/checkouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await res.json() as Record<string, unknown>

  if (!res.ok) {
    console.error('[subscribe-checkout] Polar error', res.status, body)
    return json({ error: 'No se pudo crear el checkout.' }, 502)
  }

  const checkoutUrl = (body.url ?? body.checkout_url) as string | undefined
  if (!checkoutUrl) {
    return json({ error: 'Polar no devolvió la URL de pago.' }, 502)
  }

  return json({ checkout_url: checkoutUrl })
}

export default webHandler(handler)
