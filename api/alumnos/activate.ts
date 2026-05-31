import { json } from '../_lib/json'
import { getRequestUser } from '../_lib/auth'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user?.email) return json({ error: 'unauthorized' }, 401)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const email = normalizeEmail(user.email)
  const { data, error } = await admin
    .from('alumnos')
    .update({ user_id: user.id, activo: true })
    .eq('email', email)
    .select('id, email, nombre, activo')
    .maybeSingle()

  if (error) {
    console.error('[alumnos activate]', error)
    return json({ error: 'no se pudo activar la cuenta' }, 500)
  }

  if (!data) {
    return json({ error: 'esta cuenta no tiene invitación de alumno' }, 403)
  }

  return json({ alumno: data })
}
