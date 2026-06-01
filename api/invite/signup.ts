import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { sha256Hex } from '../_lib/crypto.js'
import { activateAlumnoRecord } from '../_lib/provisionAlumno.js'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin.js'

type Body = { token?: string; password?: string }

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const token = typeof body.token === 'string' ? body.token : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!token || password.length < 8) {
    return json({ error: 'token o contraseña inválidos' }, 400)
  }

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const tokenHash = sha256Hex(token)
  const now = new Date().toISOString()

  const { data: invite, error: invFetchErr } = await admin
    .from('invite_tokens')
    .select('id, email, used_at, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (invFetchErr || !invite) {
    return json({ error: 'invitación inválida' }, 404)
  }

  if (invite.used_at) {
    return json({ error: 'invitación ya utilizada' }, 410)
  }

  if (invite.expires_at < now) {
    return json({ error: 'invitación vencida' }, 410)
  }

  const email = normalizeEmail(invite.email)
  const productSlug = (process.env.PRODUCT_SLUG ?? 'berich-completo').trim()

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase() ?? ''
    if (msg.includes('already') || msg.includes('registered')) {
      return json({ error: 'Ya existe una cuenta con este mail. Ingresá desde "Ingresar".' }, 409)
    }
    console.error('[invite signup]', createErr)
    return json({ error: 'no se pudo crear el usuario' }, 500)
  }

  const activated = await activateAlumnoRecord(admin, created.user.id, email)
  if (!activated.ok) {
    console.error('[invite signup] activate alumno', activated.error)
  }

  await admin.from('entitlements').upsert(
    { email, product_slug: productSlug, source: 'purchase' },
    { onConflict: 'email,product_slug' },
  )

  const { error: markErr } = await admin.from('invite_tokens').update({ used_at: now }).eq('id', invite.id)
  if (markErr) {
    console.error('[invite signup] mark used', markErr)
  }

  return json({ email })
}

export default webHandler(handler)
