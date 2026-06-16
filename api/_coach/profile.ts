import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getRequestUser } from '../_lib/auth.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findAlumnoForUser, getCoachProfile } from '../_lib/coach/alumnoCoach.js'

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user?.email || !user.id) return json({ error: 'unauthorized' }, 401)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const alumno = await findAlumnoForUser(admin, user.id, user.email)
  if (!alumno?.activo) {
    return json({ complete: false, reason: 'no_active_alumno' })
  }

  const profile = await getCoachProfile(admin, alumno.id)
  if (!profile) {
    return json({ complete: false })
  }

  return json({
    complete: Boolean(profile.setup_completed_at),
    coach_active: profile.coach_active,
    push_subscribed: Boolean(profile.push_subscription),
    alumno_id: alumno.id,
  })
}

export default webHandler(handler)
