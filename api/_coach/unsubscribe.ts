import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getRequestUser } from '../_lib/auth.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findAlumnoForUser, getCoachProfile } from '../_lib/coach/alumnoCoach.js'

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

  const profile = await getCoachProfile(admin, alumno.id)
  if (!profile) {
    return json({ error: 'No encontramos tu perfil de acompañamiento.' }, 404)
  }

  const { error: updateError } = await admin
    .from('alumno_coach_profile')
    .update({
      push_subscription: null,
      coach_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('alumno_id', alumno.id)

  if (updateError) {
    console.error('[coach unsubscribe]', updateError)
    return json({ error: 'No se pudieron desactivar las notificaciones.' }, 500)
  }

  return json({ ok: true })
}

export default webHandler(handler)
