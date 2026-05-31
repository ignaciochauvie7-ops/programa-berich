import { json } from '../_lib/json'
import { getRequestUser, isAdminUser } from '../_lib/auth'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin'

type InviteBody = {
  email?: string
  nombre?: string
}

export default async function handler(request: Request): Promise<Response> {
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

  if (!email || !email.includes('@')) {
    return json({ error: 'email inválido' }, 400)
  }

  const redirectTo = 'https://programa-berich.vercel.app/activar-cuenta'
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { nombre },
  })

  if (inviteError) {
    console.error('[alumnos invite]', inviteError)
    return json({ error: inviteError.message ?? 'no se pudo enviar la invitación' }, 500)
  }

  const { data: alumno, error: upsertError } = await admin
    .from('alumnos')
    .upsert(
      {
        user_id: inviteData.user?.id ?? null,
        email,
        nombre: nombre || null,
        activo: false,
      },
      { onConflict: 'email' },
    )
    .select('id, user_id, email, nombre, created_at, activo')
    .single()

  if (upsertError) {
    console.error('[alumnos upsert]', upsertError)
    return json({ error: 'invitación enviada, pero no se pudo guardar el alumno' }, 500)
  }

  return json({ alumno })
}
