import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getRequestUser } from '../_lib/auth.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findAlumnoForUser, getCoachProfile } from '../_lib/coach/alumnoCoach.js'
import { sendWelcomePush } from '../_lib/coach/welcomeMessage.js'
import type { PushSubscriptionPayload } from '../_lib/push/types.js'

type Body = {
  subscription?: PushSubscriptionPayload
}

function isValidSubscription(value: unknown): value is PushSubscriptionPayload {
  if (!value || typeof value !== 'object') return false
  const sub = value as PushSubscriptionPayload
  return Boolean(sub.endpoint && sub.keys?.p256dh && sub.keys?.auth)
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user?.email || !user.id) return json({ error: 'unauthorized' }, 401)

  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  if (!isValidSubscription(body.subscription)) {
    return json({ error: 'Suscripción de notificaciones inválida.' }, 400)
  }

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const alumno = await findAlumnoForUser(admin, user.id, user.email)
  if (!alumno?.activo) {
    return json({ error: 'Tu cuenta no está activa todavía.' }, 403)
  }

  const profile = await getCoachProfile(admin, alumno.id)
  if (!profile?.setup_completed_at) {
    return json({ error: 'Completá tu perfil de acompañamiento primero.' }, 400)
  }

  const now = new Date().toISOString()
  const { error: updateError } = await admin
    .from('alumno_coach_profile')
    .update({
      push_subscription: body.subscription,
      coach_active: true,
      opt_in_at: profile.opt_in_at ?? now,
      updated_at: now,
    })
    .eq('alumno_id', alumno.id)

  if (updateError) {
    console.error('[coach subscribe]', updateError)
    return json({ error: 'No se pudo guardar la suscripción.' }, 500)
  }

  const updatedProfile = { ...profile, push_subscription: body.subscription }
  const welcomed = await sendWelcomePush(admin, updatedProfile, alumno.nombre, alumno.email)

  return json({ ok: true, welcome_sent: welcomed })
}

export default webHandler(handler)
