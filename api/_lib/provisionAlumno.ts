import type { SupabaseClient } from '@supabase/supabase-js'
import { getActivationOrigin } from './auth.js'
import { normalizeEmail } from './supabaseAdmin.js'

type ProvisionResult =
  | { ok: true; alumno: { id: string; email: string; activo: boolean } }
  | { ok: false; error: string }

/**
 * Alta de alumno + mail de invitación Supabase (/activar-cuenta).
 * Usado por panel admin, webhooks de pago, etc.
 */
export async function provisionAlumnoInvite(
  admin: SupabaseClient,
  rawEmail: string,
  options?: { nombre?: string; source?: string; productSlug?: string },
): Promise<ProvisionResult> {
  const email = normalizeEmail(rawEmail)
  if (!email.includes('@')) return { ok: false, error: 'email inválido' }

  const nombre = options?.nombre?.trim() || null
  const productSlug = (options?.productSlug ?? process.env.PRODUCT_SLUG ?? 'berich-completo').trim()
  const redirectTo = `${getActivationOrigin()}/activar-cuenta`

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: nombre ? { nombre } : undefined,
  })

  if (inviteError) {
    console.error('[provisionAlumnoInvite]', inviteError)
    return { ok: false, error: inviteError.message ?? 'no se pudo enviar la invitación' }
  }

  const { data: alumno, error: upsertError } = await admin
    .from('alumnos')
    .upsert(
      {
        user_id: inviteData.user?.id ?? null,
        email,
        nombre,
        activo: false,
      },
      { onConflict: 'email' },
    )
    .select('id, email, activo')
    .single()

  if (upsertError || !alumno) {
    console.error('[provisionAlumnoInvite] alumnos', upsertError)
    return { ok: false, error: 'invitación enviada, pero no se pudo guardar el alumno' }
  }

  if (productSlug) {
    await admin.from('entitlements').upsert(
      { email, product_slug: productSlug, source: options?.source ?? 'invite' },
      { onConflict: 'email,product_slug' },
    )
  }

  return { ok: true, alumno }
}

/** Marca alumno activo y enlaza user_id tras crear contraseña. */
export async function activateAlumnoRecord(
  admin: SupabaseClient,
  userId: string,
  rawEmail: string,
): Promise<ProvisionResult> {
  const email = normalizeEmail(rawEmail)

  const { data: alumno, error } = await admin
    .from('alumnos')
    .upsert(
      { email, user_id: userId, activo: true },
      { onConflict: 'email' },
    )
    .select('id, email, activo')
    .single()

  if (error || !alumno) {
    console.error('[activateAlumnoRecord]', error)
    return { ok: false, error: 'no se pudo activar el alumno' }
  }

  return { ok: true, alumno }
}
