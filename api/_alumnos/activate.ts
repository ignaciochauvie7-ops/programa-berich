import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { activateAlumnoRecord } from '../_lib/provisionAlumno.js'
import { getRequestUser } from '../_lib/auth.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user?.email || !user.id) return json({ error: 'unauthorized' }, 401)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const result = await activateAlumnoRecord(admin, user.id, user.email)

  if (result.ok === false) {
    return json({ error: result.error }, 500)
  }

  return json({ alumno: result.alumno })
}

export default webHandler(handler)
