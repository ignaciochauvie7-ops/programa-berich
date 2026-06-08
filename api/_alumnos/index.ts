import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getRequestUser, isAdminUser } from '../_lib/auth.js'
import { provisionAlumnoInvite } from '../_lib/provisionAlumno.js'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin.js'

type InviteBody = {
  email?: string
  nombre?: string
}

async function handler(request: Request): Promise<Response> {
  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user) return json({ error: 'unauthorized' }, 401)
  if (!isAdminUser(user)) return json({ error: 'forbidden' }, 403)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  if (request.method === 'GET') {
    const { data, error } = await admin
      .from('alumnos')
      .select('id, user_id, email, nombre, created_at, activo')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[alumnos list]', error)
      return json({ error: 'no se pudo listar alumnos' }, 500)
    }

    return json({ alumnos: data ?? [] })
  }

  if (request.method === 'DELETE') {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.trim()
    if (!id) return json({ error: 'missing alumno id' }, 400)

    const { data: alumno, error: fetchError } = await admin
      .from('alumnos')
      .select('id, user_id, email')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('[alumnos delete fetch]', fetchError)
      return json({ error: 'no se pudo buscar el alumno' }, 500)
    }

    if (!alumno) return json({ error: 'alumno no encontrado' }, 404)

    const { error: deleteError } = await admin.from('alumnos').delete().eq('id', id)
    if (deleteError) {
      console.error('[alumnos delete]', deleteError)
      return json({ error: 'no se pudo eliminar el alumno' }, 500)
    }

    await admin.from('entitlements').delete().eq('email', alumno.email)

    if (alumno.user_id) {
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(alumno.user_id)
      if (authDeleteError) {
        console.error('[alumnos delete auth user]', authDeleteError)
      }
    }

    return json({ ok: true, id })
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: InviteBody
  try {
    body = (await request.json()) as InviteBody
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const email = normalizeEmail(String(body.email ?? ''))
  const nombre = String(body.nombre ?? '').trim()

  const result = await provisionAlumnoInvite(admin, email, {
    nombre: nombre || undefined,
    source: 'admin',
    activo: false,
  })

  if (result.ok === false) return json({ error: result.error }, 500)

  if (!result.mailSent) {
    return json({
      alumno: result.alumno,
      warning: 'Alumno creado como Pendiente, pero no se pudo enviar el mail de invitación.',
    })
  }

  return json({ alumno: result.alumno })
}

export default webHandler(handler)
